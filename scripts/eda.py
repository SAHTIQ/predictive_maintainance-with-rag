"""Exploratory data analysis for the finalized V3 dataset."""

from pathlib import Path
from types import SimpleNamespace

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "data" / "raw" / "predictive_maintenance_dataset_v3.csv"
REPORT_DIR = ROOT_DIR / "reports" / "eda"
REPORT_PATH = ROOT_DIR / "docs" / "eda-report.md"
EXPECTED_COLUMNS = [
    "machine_id", "timestamp", "machine_type", "machine_age_years",
    "operating_hours", "load_percent", "rotational_speed", "temperature",
    "vibration_x", "vibration_y", "vibration_z", "maintenance_count",
    "failure_status", "health_state", "rul_hours",
]
NUMERIC_COLUMNS = [
    "machine_age_years", "operating_hours", "load_percent", "rotational_speed",
    "temperature", "vibration_x", "vibration_y", "vibration_z",
    "maintenance_count", "rul_hours",
]
PLOT_COLUMNS = ["temperature", "vibration_x", "vibration_y", "vibration_z", "load_percent", "rotational_speed", "rul_hours"]
HEALTH_LABELS = {0: "Healthy", 1: "Warning", 2: "Critical"}
HEALTH_ORDER = ["Healthy", "Warning", "Critical"]


def load_dataset():
    """Load the raw dataset without changing its values."""
    data = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
    missing = [column for column in EXPECTED_COLUMNS if column not in data]
    if missing or list(data.columns) != EXPECTED_COLUMNS:
        raise ValueError(f"Unexpected V3 schema. Missing columns: {missing}; found: {list(data.columns)}")
    return data


def basic_overview(data):
    """Collect dimensions, types, cardinalities, and trajectory coverage."""
    counts = data.groupby("machine_id").size()
    return {
        "rows": len(data), "columns": len(data.columns), "column_names": list(data.columns),
        "data_types": data.dtypes.astype(str).to_dict(),
        "memory_usage_bytes": int(data.memory_usage(deep=True).sum()),
        "machines": int(data.machine_id.nunique()),
        "observations_per_machine": counts,
        "machine_types": sorted(data.machine_type.dropna().unique().tolist()),
        "date_start": data.timestamp.min(), "date_end": data.timestamp.max(),
        "exactly_200_machines": int((counts == 200).sum()),
    }


def check_data_quality(data):
    """Report quality problems without repairing the source data."""
    ordered = data.sort_values(["machine_id", "timestamp"]).groupby("machine_id")
    chronological = data.groupby("machine_id").timestamp.apply(lambda values: values.is_monotonic_increasing)
    operating = ordered.operating_hours.apply(lambda values: values.is_monotonic_increasing)
    maintenance = ordered.maintenance_count.apply(lambda values: values.is_monotonic_increasing)
    non_negative = ["machine_age_years", "operating_hours", "load_percent", "rotational_speed", "maintenance_count", "rul_hours"]
    return {
        "missing_values": data.isna().sum(),
        "duplicate_rows": int(data.duplicated().sum()),
        "duplicate_timestamps": int(data.duplicated(["machine_id", "timestamp"]).sum()),
        "machines_not_chronological": int((~chronological).sum()),
        "machines_non_monotonic_operating": int((~operating).sum()),
        "machines_non_monotonic_maintenance": int((~maintenance).sum()),
        "negative_values": {column: int((data[column] < 0).sum()) for column in non_negative},
        "invalid_health": int((~data.health_state.isin(HEALTH_LABELS)).sum()),
        "invalid_failure": int((~data.failure_status.isin([0, 1])).sum()),
        "negative_rul": int((data.rul_hours < 0).sum()),
        "failures_per_machine": data.groupby("machine_id").failure_status.sum(),
    }


def analyze_distributions(data):
    """Save readable distributions for the requested raw variables."""
    figure, axes = plt.subplots(3, 3, figsize=(16, 12))
    for axis, column in zip(axes.flat, PLOT_COLUMNS):
        sns.histplot(data=data, x=column, kde=True, ax=axis, color="#2878b5")
        axis.set_title(f"Distribution of {column.replace('_', ' ').title()}")
        axis.set_xlabel(column.replace("_", " ").title())
        axis.set_ylabel("Observation count")
    for axis in axes.flat[len(PLOT_COLUMNS):]:
        axis.set_visible(False)
    figure.tight_layout()
    figure.savefig(REPORT_DIR / "sensor_distributions.png", dpi=150)
    plt.close(figure)


def analyze_sensor_trends(data):
    """Plot temperature, vibration X, and RUL across representative trajectories."""
    machines = sorted(data.machine_id.unique())
    selected = [machines[index] for index in np.linspace(0, len(machines) - 1, 5, dtype=int)]
    selected_data = data[data.machine_id.isin(selected)].copy()
    selected_data["observation_number"] = selected_data.groupby("machine_id").cumcount() + 1
    for column in ["temperature", "vibration_x", "rul_hours"]:
        figure, axis = plt.subplots(figsize=(13, 6))
        sns.lineplot(data=selected_data, x="observation_number", y=column, hue="machine_id", marker="o", linewidth=1.2, ax=axis)
        axis.set_title(f"{column.replace('_', ' ').title()} by Machine Trajectory")
        axis.set_xlabel("Observation number within machine")
        axis.set_ylabel(column.replace("_", " ").title())
        figure.tight_layout()
        figure.savefig(REPORT_DIR / f"machine_{column}_trends.png", dpi=150)
        plt.close(figure)


def analyze_health_states(data):
    """Summarize health states and compare their raw sensor values."""
    counts = data.health_state.map(HEALTH_LABELS).value_counts().reindex(HEALTH_ORDER, fill_value=0)
    distribution = pd.DataFrame({"health_state": counts.index, "count": counts.values})
    distribution["percentage"] = distribution["count"] / len(data) * 100
    figure, axis = plt.subplots(figsize=(8, 5))
    sns.barplot(data=distribution, x="health_state", y="count", hue="health_state", legend=False, ax=axis)
    axis.set_title("Health-State Distribution")
    axis.set_xlabel("Health state")
    axis.set_ylabel("Observation count")
    figure.tight_layout()
    figure.savefig(REPORT_DIR / "health_distribution.png", dpi=150)
    plt.close(figure)
    labeled = data.assign(health_state=data.health_state.map(HEALTH_LABELS))
    summary = labeled.groupby("health_state", observed=False)[["temperature", "vibration_x", "vibration_y", "vibration_z", "rul_hours"]].mean().reindex(HEALTH_ORDER)
    summary.index.name = "health_state"
    summary.to_csv(REPORT_DIR / "health_state_summary.csv")
    figure, axes = plt.subplots(2, 2, figsize=(13, 9))
    for axis, column in zip(axes.flat, ["temperature", "vibration_x", "vibration_y", "vibration_z"]):
        sns.boxplot(data=labeled, x="health_state", y=column, order=HEALTH_ORDER, ax=axis)
        axis.set_title(f"{column.replace('_', ' ').title()} by Health State")
        axis.set_xlabel("Health state")
        axis.set_ylabel(column.replace("_", " ").title())
    figure.tight_layout()
    figure.savefig(REPORT_DIR / "sensor_by_health_state.png", dpi=150)
    plt.close(figure)
    return distribution, summary


def analyze_rul(data):
    """Analyze RUL distribution, health relationship, and trajectory direction."""
    labeled = data.assign(health_state=data.health_state.map(HEALTH_LABELS))
    by_health = labeled.groupby("health_state", observed=False).rul_hours.agg(["count", "mean", "min", "max"]).reindex(HEALTH_ORDER)
    failure_rul = data.loc[data.failure_status == 1, "rul_hours"]
    ordered = data.sort_values(["machine_id", "timestamp"])
    # A negative correlation with observation order is a descriptive decreasing-RUL check.
    trends = ordered.groupby("machine_id").apply(lambda group: group.rul_hours.corr(pd.Series(range(len(group)), index=group.index)), include_groups=False)
    figure, axis = plt.subplots(figsize=(9, 5))
    sns.histplot(data=data, x="rul_hours", kde=True, color="#2a9d8f", ax=axis)
    axis.set_title("RUL Distribution")
    axis.set_xlabel("RUL (hours)")
    axis.set_ylabel("Observation count")
    figure.tight_layout()
    figure.savefig(REPORT_DIR / "rul_distribution.png", dpi=150)
    plt.close(figure)
    figure, axis = plt.subplots(figsize=(9, 5))
    sns.boxplot(data=labeled, x="health_state", y="rul_hours", order=HEALTH_ORDER, ax=axis)
    axis.set_title("RUL by Health State")
    axis.set_xlabel("Health state")
    axis.set_ylabel("RUL (hours)")
    figure.tight_layout()
    figure.savefig(REPORT_DIR / "rul_by_health_state.png", dpi=150)
    plt.close(figure)
    return {
        "minimum": float(data.rul_hours.min()), "maximum": float(data.rul_hours.max()), "average": float(data.rul_hours.mean()),
        "by_health": by_health, "failure_average": float(failure_rul.mean()) if len(failure_rul) else np.nan,
        "failure_count": int(len(failure_rul)), "decreasing": int((trends < 0).sum()), "trend_count": int(trends.notna().sum()),
    }


def analyze_correlations(data):
    """Calculate Pearson correlations and save their heatmap."""
    correlations = data[NUMERIC_COLUMNS].corr(method="pearson")
    figure, axis = plt.subplots(figsize=(13, 10))
    sns.heatmap(correlations, annot=True, fmt=".2f", cmap="vlag", center=0, ax=axis)
    axis.set_title("Pearson Correlation Matrix")
    figure.tight_layout()
    figure.savefig(REPORT_DIR / "correlation_matrix.png", dpi=150)
    plt.close(figure)
    return correlations


def analyze_machine_behavior(data):
    """Save machine-level averages while preserving trajectories."""
    summary = data.groupby("machine_id")[["temperature", "vibration_x", "vibration_y", "vibration_z", "rul_hours"]].mean()
    summary.to_csv(REPORT_DIR / "machine_summary.csv")
    return summary


def analyze_outliers(data):
    """Count IQR outliers without removing observations."""
    records = []
    for column in PLOT_COLUMNS:
        first_quartile, third_quartile = data[column].quantile([0.25, 0.75])
        iqr = third_quartile - first_quartile
        lower, upper = first_quartile - 1.5 * iqr, third_quartile + 1.5 * iqr
        count = int(((data[column] < lower) | (data[column] > upper)).sum())
        records.append({"feature": column, "lower_bound": lower, "upper_bound": upper, "outlier_count": count, "outlier_percentage": count / len(data) * 100})
    summary = pd.DataFrame(records)
    summary.to_csv(REPORT_DIR / "outlier_summary.csv", index=False)
    return summary


def analyze_failures(data):
    """Report failures and show raw sensor trajectories with failure markers."""
    failures = data[data.failure_status == 1]
    relationship = pd.crosstab(data.failure_status, data.health_state)
    ordered = data.sort_values(["machine_id", "timestamp"]).copy()
    ordered["observation_number"] = ordered.groupby("machine_id").cumcount() + 1
    selected = sorted(failures.machine_id.unique())[:5]
    figure, axes = plt.subplots(2, 1, figsize=(13, 10), sharex=True)
    for machine_id in selected:
        machine_data = ordered[ordered.machine_id == machine_id]
        axes[0].plot(machine_data.observation_number, machine_data.temperature, label=machine_id)
        axes[1].plot(machine_data.observation_number, machine_data.vibration_x, label=machine_id)
        failed = machine_data[machine_data.failure_status == 1]
        axes[0].scatter(failed.observation_number, failed.temperature, color="red", s=25)
        axes[1].scatter(failed.observation_number, failed.vibration_x, color="red", s=25)
    axes[0].set_title("Sensor Trends Near Failure (red markers)")
    axes[0].set_ylabel("Temperature")
    axes[1].set_ylabel("Vibration X")
    axes[1].set_xlabel("Observation number within machine")
    if selected:
        axes[0].legend(title="Machine")
    figure.tight_layout()
    figure.savefig(REPORT_DIR / "sensor_trends_near_failure.png", dpi=150)
    plt.close(figure)
    return {
        "rows": int(len(failures)), "machines": int(failures.machine_id.nunique()),
        "per_machine": failures.groupby("machine_id").size(), "relationship": relationship,
        "sensor_means": failures[PLOT_COLUMNS[:4]].mean(),
    }


def markdown_table(frame):
    """Render a dataframe as a markdown table."""
    table = frame.reset_index()
    headers = [str(column) for column in table.columns]
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in table.itertuples(index=False, name=None):
        values = ["" if pd.isna(value) else str(value) for value in row]
        lines.append("| " + " | ".join(values) + " |")
    return "\n".join(lines)


def generate_report(data, overview, quality, distribution, health_summary, rul, correlations, machine_summary, outliers, failures):
    """Write the requested data-backed report."""
    missing = int(quality.missing_values.sum())
    correlation_focus = correlations.loc[["temperature", "vibration_x", "vibration_y", "vibration_z", "operating_hours", "load_percent", "rotational_speed", "rul_hours"], ["temperature", "vibration_x", "vibration_y", "vibration_z", "operating_hours", "load_percent", "rotational_speed", "rul_hours"]]
    failure_table = failures.per_machine.rename("failure_rows").to_frame()
    failure_table.index.name = "machine_id"
    ready = (
        missing == 0
        and quality.duplicate_rows == 0
        and quality.duplicate_timestamps == 0
        and quality.machines_not_chronological == 0
        and quality.machines_non_monotonic_operating == 0
        and quality.machines_non_monotonic_maintenance == 0
        and sum(quality.negative_values.values()) == 0
        and quality.invalid_health == 0
        and quality.invalid_failure == 0
        and quality.negative_rul == 0
        and overview.exactly_200_machines == overview.machines
    )
    negative_table = pd.Series(quality.negative_values, name="negative_value_count").to_frame()
    report = f"""# Exploratory Data Analysis Report

## 1. Dataset Overview

- Rows: **{overview.rows}**
- Columns: **{overview.columns}**
- Machines: **{overview.machines}**
- Machine types: **{', '.join(overview.machine_types)}**
- Time range: **{overview.date_start}** to **{overview.date_end}**
- Memory usage: **{overview.memory_usage_bytes:,} bytes**
- Machines with exactly 200 observations: **{overview.exactly_200_machines} / {overview.machines}**

{markdown_table(pd.DataFrame({'column': overview.column_names, 'data_type': [overview.data_types[column] for column in overview.column_names]}))}

Observations per machine:

{markdown_table(overview.observations_per_machine.rename('observations').to_frame())}

## 2. Data Quality

- Missing values: **{missing}** total
- Duplicate rows: **{quality.duplicate_rows}**
- Duplicate machine/timestamp pairs: **{quality.duplicate_timestamps}**
- Machines not chronological: **{quality.machines_not_chronological}**
- Machines with non-monotonic operating hours: **{quality.machines_non_monotonic_operating}**
- Machines with non-monotonic maintenance counts: **{quality.machines_non_monotonic_maintenance}**
- Invalid health states: **{quality.invalid_health}**
- Invalid failure statuses: **{quality.invalid_failure}**
- Negative RUL values: **{quality.negative_rul}**

Negative-value checks:

{markdown_table(negative_table)}

No values were repaired or removed.

## 3. Statistical Summary

{markdown_table(data[NUMERIC_COLUMNS].describe().T.rename(columns={'50%': 'median'}))}

Full output: `reports/eda/statistical_summary.csv`.

## 4. Sensor Distribution Analysis

`sensor_distributions.png` contains temperature, vibration axes, load, rotational speed, and RUL distributions.

## 5. Health-State Analysis

{markdown_table(distribution)}

Mean raw values by health state:

{markdown_table(health_summary)}

Outputs: `health_distribution.png` and `sensor_by_health_state.png`.

## 6. Failure Analysis

- Total failure rows: **{failures.rows}**
- Machines containing failures: **{failures.machines}**

Failures per machine:

{markdown_table(failure_table)}

Failure status by health state (0=Healthy, 1=Warning, 2=Critical):

{markdown_table(failures.relationship)}

Mean raw sensor values on failure rows:

{markdown_table(failures.sensor_means.to_frame('mean_on_failure_rows'))}

`sensor_trends_near_failure.png` shows raw temperature and vibration-X trends with failure observations marked red. This is descriptive only and uses no future-derived feature.

## 7. RUL Analysis

- Minimum: **{rul.minimum:.3f} hours**
- Maximum: **{rul.maximum:.3f} hours**
- Average: **{rul.average:.3f} hours**
- Failure-row average: **{rul.failure_average:.3f} hours** across {rul.failure_count} rows
- Machines with decreasing RUL correlation: **{rul.decreasing} / {rul.trend_count}**

{markdown_table(rul.by_health)}

Outputs: `rul_distribution.png` and `rul_by_health_state.png`. The trajectory check is descriptive and is not an RUL model.

## 8. Machine-Level Degradation

Representative plots: `machine_temperature_trends.png`, `machine_vibration_x_trends.png`, and `machine_rul_hours_trends.png`.

First ten machine averages:

{markdown_table(machine_summary.head(10))}

Full output: `reports/eda/machine_summary.csv`.

## 9. Correlation Analysis

Requested Pearson correlations:

{markdown_table(correlation_focus)}

`correlation_matrix.png` reports correlations for interpretation only; no columns were removed.

## 10. Outlier Analysis

IQR-based potential outliers:

{markdown_table(outliers)}

Full output: `reports/eda/outlier_summary.csv`. Outliers were not removed.

## 11. Key Findings

- The dataset contains {overview.rows:,} observations from {overview.machines} machines.
- Health distribution: {', '.join(f'{row.health_state} {row.percentage:.2f}%' for row in distribution.itertuples())}.
- There are {failures.rows} failure rows across {failures.machines} machines.
- RUL decreases by trajectory correlation for {rul.decreasing} of {rul.trend_count} machines.
- Potential IQR outliers are documented, not automatically removed.

## 12. Decision for Next Stage

The dataset is **{'READY' if ready else 'NOT READY'} for Stage 4.6 — Processed Dataset** based on the checks above. It is also **{'READY' if ready else 'NOT READY'} for later Stage 5 — Preprocessing & Feature Engineering**, subject to decisions documented in that stage. This EDA did not modify V3, randomly split trajectories, train models, or calculate RMS, FFT, rolling features, health indices, anomaly scores, or predictions.
"""
    REPORT_PATH.write_text(report, encoding="utf-8")


def main():
    """Run all analyses and print a concise summary."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    data = load_dataset()
    overview = SimpleNamespace(**basic_overview(data))
    quality = SimpleNamespace(**check_data_quality(data))
    data[NUMERIC_COLUMNS].describe().T.rename(columns={"50%": "median"}).to_csv(REPORT_DIR / "statistical_summary.csv")
    analyze_distributions(data)
    analyze_sensor_trends(data)
    distribution, health_summary = analyze_health_states(data)
    rul = SimpleNamespace(**analyze_rul(data))
    correlations = analyze_correlations(data)
    machine_summary = analyze_machine_behavior(data)
    outliers = analyze_outliers(data)
    failures = SimpleNamespace(**analyze_failures(data))
    generate_report(data, overview, quality, distribution, health_summary, rul, correlations, machine_summary, outliers, failures)
    major = correlations.rul_hours.drop("rul_hours").abs().sort_values(ascending=False).head(3)
    print("EDA COMPLETED")
    print(f"Rows: {overview.rows}")
    print(f"Machines: {overview.machines}")
    print(f"Missing values: {int(quality.missing_values.sum())}")
    print(f"Duplicates: {quality.duplicate_rows}")
    print("Health distribution: " + ", ".join(f"{row.health_state}={row.count} ({row.percentage:.2f}%)" for row in distribution.itertuples()))
    print(f"Failure rows: {failures.rows}")
    print(f"Negative RUL values: {quality.negative_rul}")
    print("Major RUL correlations: " + ", ".join(f"{name}={value:.3f}" for name, value in major.items()))
    print("Outlier findings: " + ", ".join(f"{row.feature}={row.outlier_count}" for row in outliers.itertuples()))
    print("Dataset status: READY FOR NEXT STAGE" if REPORT_PATH.exists() else "Dataset status: REVIEW REQUIRED")


if __name__ == "__main__":
    main()
