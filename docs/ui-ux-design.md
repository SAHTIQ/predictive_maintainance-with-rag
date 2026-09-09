# UI/UX Design

## Product Direction

The interface is decision support for maintenance work. It should help a user answer: which machines need attention, why, and what should be reviewed next. It should use consistent terminology, units, timestamps, and text labels. Color is supplementary and must not be the only status signal.

## Main Pages

### Login

- Email and password fields.
- Validation for required fields and invalid credentials.
- Clear authentication error without exposing security details.
- Loading state while login is processed.

### Dashboard

The dashboard gives a plant-level overview:

- Machine health overview.
- Health distribution.
- Maintenance risk distribution.
- Recent alerts.
- Maintenance priorities.

Each summary should link to the affected machine or filtered list. A dashboard visualization should communicate what happened, what it means, and what action or review is appropriate.

### Machine List

- Searchable/filterable list of authorized machines.
- Machine code, name, location, current health, risk, and latest update time.
- Clear normal, warning, critical, unavailable, and insufficient-data states.
- Sorting by risk or priority to support work planning.

### Machine Details

For a selected machine, show:

- Current health score and health state.
- Health trend.
- Vibration and temperature readings with units.
- Detected anomalies and severity.
- RUL estimate, unit, estimate time, and uncertainty/limitation.
- Maintenance risk, score, priority, and window.
- Recommendation with supporting evidence.
- Recent maintenance history.

The page should identify the selected time range and data freshness. Every important chart or result includes a short interpretation and suggested next step.

### Analytics

Analytics includes:

- Statistical analysis.
- FFT/frequency analysis.
- Temporal trends.
- Machine comparison.

Charts must show axes, units, time range, and enough context to understand changes. Comparison must make machine differences and data availability visible rather than implying that unlike signals are directly comparable.

### Prediction

- Shows the latest prediction and historical predictions.
- Separates health, anomaly, RUL, risk, and recommendation results.
- Displays model version and generated timestamp where diagnostic detail is useful.
- Clearly labels insufficient data, unavailable RUL, and uncertainty.

### History

- Shows readings, prediction results, alerts, and maintenance events in time order.
- Supports machine and time-period filtering.
- Preserves source and quality indicators where relevant.

### Settings

- User profile and role-appropriate account settings.
- Access to permitted machine/configuration settings.
- Units, display preferences, and supported administrative controls as implementation allows.
- Exact settings scope is **To be decided during implementation**.

## Visualization Interpretation Pattern

Every important visualization or metric should answer three questions:

1. **What happened?** Show the measured change, anomaly, state, or distribution with time and units.
2. **What does it mean?** Give a concise interpretation linked to the model evidence and data quality.
3. **What should the user do?** Show the recommended review or maintenance priority, with a reminder that technicians make the final decision.

## State Handling

- **Loading:** preserve page structure and show which data is being loaded; do not display stale values as current without a timestamp.
- **Empty:** explain that no readings, predictions, alerts, or maintenance events are available and identify the next useful action.
- **Validation:** show field-level or record-level problems for forms and imports, including units, timestamps, ranges, and required fields.
- **Error:** show a concise user-facing message, retry where appropriate, and avoid internal stack traces or sensitive data.
- **Insufficient data:** distinguish this from a healthy result and explain which data is missing or too limited.
- **Partial data:** identify affected sensors or time periods and avoid presenting incomplete analysis as complete.

## Accessibility and Consistency

- Use text labels and icons in addition to color.
- Keep controls keyboard accessible and labels associated with inputs.
- Use readable chart legends, units, timestamps, and status names.
- Use consistent meanings for normal, warning, critical, unavailable, and insufficient-data states.
- Respect role permissions in both navigation and API results.

Responsive behavior, charting library, visual theme, and exact breakpoint rules are **To be decided during implementation** while preserving these information and state requirements.
