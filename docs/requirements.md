# Requirements

## Functional Requirements

- FR-01: The system shall register machines with a unique identifier and basic metadata.
- FR-02: The system shall register sensors and associate each sensor with a machine and measurement type.
- FR-03: The system shall accept timestamped vibration and temperature measurements.
- FR-04: The system shall validate required fields, units, timestamps, and numeric values before analysis.
- FR-05: The system shall identify and report missing, duplicate, invalid, or out-of-range measurements.
- FR-06: The system shall display historical sensor trends for a selected machine and time period.
- FR-07: The system shall detect abnormal behavior and record the affected machine, time period, evidence, and severity.
- FR-08: The system shall calculate and display a machine health indicator with an understandable interpretation.
- FR-09: The system shall estimate RUL when the selected model has sufficient valid input data.
- FR-10: The system shall calculate a maintenance risk level and show the main factors contributing to it.
- FR-11: The system shall provide a maintenance recommendation for detected high-priority conditions.
- FR-12: The system shall allow users to review current status and historical analysis results.
- FR-13: The system shall retain the source data and model result details needed to explain an analysis result.
- FR-14: The system shall record relevant analysis and user actions in an audit history.

## Non-Functional Requirements

- NFR-01: The system shall use clear, consistent terminology and units throughout the interface and APIs.
- NFR-02: The system shall return a normal dashboard or analysis view within 3 seconds for the expected pilot data volume, excluding long-running model training.
- NFR-03: The system shall provide useful validation messages instead of failing silently.
- NFR-04: The system shall be maintainable through documented modules, interfaces, and configuration.
- NFR-05: The system shall produce repeatable results when the same input data and model configuration are used.
- NFR-06: The system shall handle temporary data or analysis errors without exposing internal details to end users.
- NFR-07: The system shall support backup and restoration of project data through a documented procedure.
- NFR-08: The system shall be usable on a current desktop web browser at the expected pilot scale.

## ML Requirements

- ML-01: The project shall define the target for anomaly detection, health scoring, and RUL estimation before model evaluation.
- ML-02: Training and evaluation data shall be separated to reduce data leakage.
- ML-03: Models shall use only features available before the prediction time.
- ML-04: The project shall document preprocessing, feature construction, model version, and relevant parameters.
- ML-05: Anomaly detection shall report a score or severity and a threshold or rule used to interpret it.
- ML-06: RUL results shall include an uncertainty indication or a clear statement when uncertainty cannot be calculated.
- ML-07: Models shall be evaluated with metrics appropriate to the task and with a simple baseline for comparison.
- ML-08: The system shall indicate when data is insufficient for a reliable model result.
- ML-09: Model results shall be explainable enough for a maintenance user to understand the main supporting signals.

## Data Requirements

- DR-01: Each measurement shall include a machine ID, sensor ID, timestamp, measurement type, value, and unit.
- DR-02: Timestamps shall use a documented time zone or UTC convention.
- DR-03: Vibration and temperature units shall be documented and normalized where necessary.
- DR-04: Data ingestion shall preserve the original value and source information where practical.
- DR-05: The system shall track data quality issues without silently replacing source measurements.
- DR-06: Historical maintenance events shall include an event type, machine, timestamp, and description when available.
- DR-07: Access to stored data shall follow user permissions and data retention rules defined for the project.
- DR-08: Sample or simulated data shall be clearly labeled as non-production data.

## API Requirements

- API-01: The application shall expose documented interfaces for submitting or importing sensor measurements.
- API-02: The application shall provide an interface for retrieving machine status, trends, alerts, risk, and recommendations.
- API-03: API requests and responses shall use a consistent structured format.
- API-04: API errors shall include an appropriate status result and a clear, non-sensitive message.
- API-05: The API shall validate identifiers, timestamps, units, and numeric ranges.
- API-06: The API shall prevent unauthorized users from accessing protected machine data.
- API-07: The API shall document authentication expectations, input fields, output fields, and example requests.
- API-08: Interfaces shall support filtering results by machine and time period.

## UI Requirements

- UI-01: The interface shall show an overview of machine health and maintenance risk.
- UI-02: Users shall be able to select a machine and time period for detailed review.
- UI-03: The interface shall show vibration and temperature trends with readable labels, units, and timestamps.
- UI-04: Alerts shall show severity, affected machine, detection time, and a concise explanation.
- UI-05: RUL estimates shall be displayed with their unit, estimate time, and limitation or uncertainty information.
- UI-06: Recommendations shall state the suggested action and priority without implying certainty beyond the available evidence.
- UI-07: The interface shall distinguish normal, warning, and critical conditions using text as well as visual styling.
- UI-08: The interface shall provide understandable empty, loading, validation, and error states.
- UI-09: The interface shall avoid exposing technical model details unless the user requests diagnostic information.

## Security Requirements

- SEC-01: The system shall require authentication for protected data and administrative actions.
- SEC-02: The system shall apply role-based permissions at a level appropriate for the pilot, such as viewer, maintenance user, and administrator.
- SEC-03: Passwords and secrets shall not be stored in source code or committed configuration files.
- SEC-04: Sensitive data shall be protected during transmission and storage according to the deployment environment.
- SEC-05: The system shall validate and sanitize external input to reduce injection and malformed-data risks.
- SEC-06: Authentication failures and important permission changes shall be logged without recording passwords or secret values.
- SEC-07: Users shall only access machines and actions permitted by their role.

## Testing Requirements

- TR-01: Unit tests shall cover measurement validation, health and risk calculations, threshold handling, and recommendation rules.
- TR-02: Data ingestion tests shall cover valid records, missing fields, invalid values, duplicates, and incorrect units.
- TR-03: ML tests shall verify preprocessing, feature generation, model input/output shape, and baseline metric calculation.
- TR-04: Evaluation shall use a time-aware or otherwise appropriate split when measurements are time series.
- TR-05: API tests shall cover successful requests, validation errors, unauthorized requests, and missing resources.
- TR-06: UI tests shall cover machine selection, trend display, alert display, and key error states.
- TR-07: An end-to-end test shall cover importing data through viewing a resulting status and recommendation.
- TR-08: Security tests shall verify authentication, authorization, input validation, and secret handling.
- TR-09: Tests shall include representative normal, abnormal, incomplete, and insufficient-data cases.
- TR-10: Test results and known limitations shall be documented for each release or project milestone.