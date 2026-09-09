# Project Scope

## In Scope

- Define a data model for machines, sensors, measurements, maintenance events, and analysis results.
- Accept and validate vibration and temperature data.
- Store or otherwise manage historical sensor readings for analysis.
- Provide basic data quality checks, including missing, invalid, or out-of-range values.
- Detect abnormal sensor behavior using suitable analysis or machine learning methods.
- Produce a machine health indicator.
- Estimate RUL when the available data and model support a meaningful estimate.
- Calculate a maintenance risk level from available indicators.
- Generate understandable maintenance recommendations.
- Provide a simple interface for viewing machine status, trends, alerts, and recommendations.
- Provide documented APIs or application interfaces needed by the system.
- Test the main data, analysis, recommendation, and user workflows.

## Out of Scope

- Direct control of machines or automatic shutdown of equipment.
- Replacement of safety systems, alarm systems, or certified monitoring equipment.
- Guaranteed failure prediction or guaranteed RUL accuracy.
- Automatic ordering of spare parts or scheduling of technicians.
- Integration with every possible industrial protocol or enterprise system.
- Real-time edge deployment across a complete factory.
- Microservice deployment or high-availability enterprise infrastructure.
- Mobile applications unless required in a later stage.
- Analysis of sensor types unrelated to the agreed vibration and temperature use case.

## Project Constraints

- The project should remain understandable and achievable for a student-level team.
- Development should use a single coherent application structure unless later evidence requires otherwise.
- Available labeled failure data may be limited or imbalanced.
- Sensor quality, sampling rates, units, and machine operating conditions may vary.
- Results must be presented as decision support and must include appropriate uncertainty or limitations where possible.
- The project must protect machine data and user access credentials.
- The initial system should support a limited, defined number of machines and sensors rather than an entire industrial fleet.

## Assumptions

- Sensor readings include timestamps and can be associated with a machine and sensor.
- Vibration and temperature sensors are installed and calibrated well enough for analysis.
- Historical data may be supplied as files or through a defined application interface.
- Some analysis methods may initially use simulated, public, or manually collected data if production failure data is unavailable.
- Maintenance personnel can provide domain feedback about alerts and recommendations.
- A machine can have multiple sensors and a sensor can produce repeated readings over time.
- RUL estimates will be treated as estimates and evaluated against known historical outcomes when those outcomes exist.

## Expected Scale

The initial project should support a small pilot, such as 5 to 20 machines with one or more vibration and temperature sensors per machine. It should handle regular historical readings and a modest volume of analysis requests suitable for a classroom demonstration or small factory evaluation. Exact capacity targets should be refined after data availability and sampling requirements are confirmed.