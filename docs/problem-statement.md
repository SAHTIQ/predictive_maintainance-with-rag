# Problem Statement

## Problem

Factory machines can fail unexpectedly because changes in vibration, temperature, or operating behavior are not always detected early. Unexpected failures can stop production, increase repair costs, create safety risks, and make maintenance planning difficult.

## Background

Vibration and temperature are useful indicators of machine condition. A gradual increase, unusual pattern, or sudden change in these signals may indicate wear, imbalance, misalignment, overheating, or another developing fault. Maintenance teams need a practical way to review sensor data and identify machines that require attention before a failure occurs.

## Proposed Solution

Develop a Predictive Maintenance Vibration Monitoring System that accepts machine sensor data, analyzes vibration and temperature behavior, detects abnormal conditions, estimates machine health and Remaining Useful Life (RUL), calculates maintenance risk, and provides understandable maintenance recommendations.

The system is intended to support maintenance decisions. It will not replace qualified technicians or serve as the only basis for safety-critical decisions.

## Target Users

- Maintenance technicians who inspect and repair machines.
- Maintenance supervisors who prioritize work and plan resources.
- Plant or operations managers who monitor equipment availability and risk.
- Students or project administrators who configure the system and review results.

## Inputs

- Machine and sensor identifiers.
- Timestamped vibration measurements.
- Timestamped temperature measurements.
- Machine operating context, when available, such as load, speed, or operating state.
- Historical maintenance and failure records, when available.
- Basic machine metadata such as machine type and installation location.

## Outputs

- Current machine health status or health score.
- Detected anomalies and their severity.
- Estimated Remaining Useful Life (RUL), when sufficient data is available.
- Maintenance risk level and supporting indicators.
- Maintenance recommendations and recommended priority.
- Historical trends, alerts, and analysis results for each machine.

## Expected Benefits

- Earlier visibility into abnormal machine behavior.
- Better prioritization of maintenance work.
- Reduced unplanned downtime and avoidable repair costs.
- More consistent use of vibration and temperature data.
- A documented foundation for future predictive maintenance improvements.