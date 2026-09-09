# REST API Specification

## General Conventions

Base path and API versioning are **To be decided during implementation**. The API uses JSON request and response bodies, UTC timestamps in ISO 8601 format, and consistent resource identifiers. Protected endpoints require an authenticated user and apply role permissions.

A typical success response returns the resource or a list object. A typical error response is:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request contains invalid fields",
    "details": {}
  }
}
```

Common status codes are `400` for malformed requests, `401` for missing or invalid authentication, `403` for insufficient permission, `404` for missing resources, `409` for uniqueness conflicts, and `500` for an unexpected server error. Error messages must not expose secrets or internal stack traces.

## Authentication

| Method and path | Purpose | Auth | Request | Response | Common errors |
|---|---|---|---|---|---|
| `POST /auth/register` | Create a user account. | Public, subject to registration policy. | `name`, `email`, `password`, `role` if role assignment is permitted. | Created user identifier, name, email, role, and timestamps; never password data. | Invalid fields, weak password, duplicate email, unsupported role. |
| `POST /auth/login` | Authenticate a user. | Public. | `email`, `password`. | Authentication token/session result and basic user information. | Invalid credentials, inactive account, malformed request. |

The token format, expiry, refresh behavior, and administrator-only role assignment are **To be decided during implementation**.

## Machines

| Method and path | Purpose | Auth | Request | Response | Common errors |
|---|---|---|---|---|---|
| `GET /machines` | List machines visible to the user. | Required. | Optional filters such as `status`, pagination, or search. | Machine summaries with id, code, name, type, location, and status. | Unauthorized, invalid filters, server/database error. |
| `POST /machines` | Register a machine. | Required; maintenance/admin permission. | `machine_code`, `name`, `machine_type`, `location`, `status`. | Created machine resource. | Unauthorized, forbidden, missing fields, duplicate code, invalid status. |
| `GET /machines/{id}` | Retrieve one machine. | Required. | Path machine ID. | Machine resource and metadata. | Invalid ID, unauthorized, forbidden, not found. |
| `PUT /machines/{id}` | Replace/update editable machine metadata. | Required; maintenance/admin permission. | Editable machine fields. | Updated machine resource. | Invalid ID/data, duplicate code, unauthorized, forbidden, not found. |
| `DELETE /machines/{id}` | Remove or deactivate a machine according to retention policy. | Required; admin permission. | Path machine ID. | Confirmation or updated inactive resource. | Unauthorized, forbidden, not found, cannot remove historical data. |

## Sensors

| Method and path | Purpose | Auth | Request | Response | Common errors |
|---|---|---|---|---|---|
| `GET /machines/{id}/sensors` | List sensors for a machine. | Required. | Path machine ID and optional sensor filters. | Sensor definitions with type, unit, and sampling rate. | Invalid ID, unauthorized, forbidden, not found. |
| `POST /machines/{id}/sensors` | Register a sensor on a machine. | Required; maintenance/admin permission. | `sensor_code`, `sensor_type`, `unit`, `sampling_rate`. | Created sensor resource. | Invalid machine, unsupported type/unit, duplicate code, invalid rate, forbidden. |

## Readings

| Method and path | Purpose | Auth | Request | Response | Common errors |
|---|---|---|---|---|---|
| `POST /readings` | Submit one or more timestamped readings. | Required; permitted ingestion role. | Reading records containing `machine_id`, `sensor_id`, `timestamp`, `measurement_type`, `value`, `unit`, and `source`. | Accepted count, rejected count, and per-record quality/error results. | Missing fields, invalid ID, mismatched machine/sensor, invalid unit/value/timestamp, duplicate or out-of-range data. |
| `POST /readings/import` | Import a batch from a supported file or structured payload. | Required; permitted ingestion role. | Import content or records, source label, and validation options. | Import summary with accepted/rejected records and data-quality details. | Unsupported format, oversized/malformed input, invalid records, unauthorized. |
| `GET /machines/{id}/readings` | Retrieve readings for review or analysis. | Required. | Optional `from`, `to`, `measurement_type`, `sensor_id`, pagination. | Readings with values, units, timestamps, source, and quality status. | Invalid range/filter, unauthorized, forbidden, machine not found. |

## Predictions

| Method and path | Purpose | Auth | Request | Response | Common errors |
|---|---|---|---|---|---|
| `POST /predictions` | Run analysis and store a prediction result. | Required; analysis permission. | `machine_id`, analysis time range, optional sensor/filter parameters, and model version if allowed. | Prediction result including health, anomaly, RUL, risk, priority, window, model version, quality/insufficiency status, and timestamp. | Insufficient data, invalid range, model unavailable, invalid input, unauthorized, processing error. |
| `GET /machines/{id}/predictions` | List historical prediction results. | Required. | Optional time range, state, risk, and pagination filters. | Prediction result list with timestamps and model versions. | Invalid filters, unauthorized, forbidden, not found. |
| `GET /machines/{id}/latest-prediction` | Retrieve the latest available result. | Required. | Path machine ID. | Latest prediction or explicit no-result/insufficient-data response. | Unauthorized, forbidden, machine not found, no prediction available. |

## Analytics

| Method and path | Purpose | Auth | Request | Response | Common errors |
|---|---|---|---|---|---|
| `GET /machines/{id}/health` | Return current health score/state and supporting indicators. | Required. | Optional reference timestamp and time range. | Health score, state, trend summary, anomaly evidence, and data-quality status. | Invalid range, unauthorized, insufficient data, not found. |
| `GET /machines/{id}/trends` | Return time-series trend data. | Required. | Time range, measurement type, sensor, and aggregation options. | Timestamped vibration/temperature series with units and aggregation metadata. | Invalid filters, unsupported aggregation, unauthorized, not found. |
| `GET /machines/{id}/anomalies` | Return detected anomalies. | Required. | Time range and severity filters. | Anomaly timestamp, score, severity, affected signal, and explanation. | Invalid filters, unauthorized, not found, insufficient data. |
| `GET /machines/{id}/risk` | Return maintenance risk and factors. | Required. | Optional reference timestamp/time range. | Risk level, score, priority, maintenance window, factors, and limitations. | Unauthorized, not found, insufficient data, invalid filters. |

## Maintenance

| Method and path | Purpose | Auth | Request | Response | Common errors |
|---|---|---|---|---|---|
| `GET /machines/{id}/maintenance` | List maintenance history for a machine. | Required. | Optional time range and event type. | Maintenance events with timestamps, types, and descriptions. | Invalid filters, unauthorized, forbidden, not found. |
| `POST /machines/{id}/maintenance` | Record a maintenance event. | Required; maintenance/admin permission. | `event_type`, `timestamp`, `description`. | Created maintenance event. | Missing/invalid fields, invalid machine, unauthorized, forbidden. |

## Response and Validation Rules

- Request validation occurs before database writes or model execution.
- IDs must refer to resources visible to the authenticated user.
- Time ranges use UTC and require `from <= to`.
- Responses include units and timestamps wherever measurements or estimates are returned.
- Predictions must state when RUL is unavailable or data is insufficient.
- Exact pagination format, maximum batch size, rate limiting, and token mechanism are **To be decided during implementation**.
