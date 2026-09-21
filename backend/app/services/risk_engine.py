import math
from typing import Any, Dict, List, Optional
import numpy as np

RISK_LEVEL_CONFIG = [
    (80.0, "CRITICAL", "P1_IMMEDIATE", "Within 0 - 12 operating hours"),
    (60.0, "HIGH", "P2_HIGH", "Within 12 - 24 operating hours"),
    (40.0, "MEDIUM", "P3_MEDIUM", "Within 24 - 72 operating hours"),
    (20.0, "LOW", "P4_LOW", "Within 72 - 168 operating hours"),
    (0.0, "VERY_LOW", "P5_SCHEDULED_MONITORING", "Next routine maintenance interval"),
]

class MaintenanceRiskEngine:
    """
    Transparent, explainable Maintenance Risk Engine.
    Converts Stage 6 outputs (Health Score, Health State, Anomaly, Degradation, RUL)
    into an operational Risk Score, Risk Level, Maintenance Priority, and Suggested Time Window.
    """
    def __init__(
        self,
        w_health: float = 0.25,
        w_rul: float = 0.25,
        w_state: float = 0.20,
        w_degradation: float = 0.15,
        w_anomaly: float = 0.15,
    ):
        self.w_health = w_health
        self.w_rul = w_rul
        self.w_state = w_state
        self.w_degradation = w_degradation
        self.w_anomaly = w_anomaly

    def normalize_rul_urgency(self, rul_hours: Optional[float]) -> float:
        """
        Safely converts RUL in hours into a normalized urgency index [0.0, 1.0].
        Handles None, NaN, negative, zero, or extremely large values safely.
        """
        if rul_hours is None or not isinstance(rul_hours, (int, float)) or math.isnan(rul_hours):
            # Treat missing or corrupted RUL as moderate uncertainty
            return 0.50
            
        if rul_hours <= 0.0:
            return 1.0
        elif rul_hours <= 12.0:
            return 1.0
        elif rul_hours <= 24.0:
            # Linear interpolation 1.0 down to 0.85
            return 0.85 + (1.0 - 0.85) * ((24.0 - rul_hours) / 12.0)
        elif rul_hours <= 48.0:
            # Linear interpolation 0.85 down to 0.65
            return 0.65 + (0.85 - 0.65) * ((48.0 - rul_hours) / 24.0)
        elif rul_hours <= 72.0:
            # Linear interpolation 0.65 down to 0.40
            return 0.40 + (0.65 - 0.40) * ((72.0 - rul_hours) / 24.0)
        elif rul_hours <= 120.0:
            # Linear interpolation 0.40 down to 0.20
            return 0.20 + (0.40 - 0.20) * ((120.0 - rul_hours) / 48.0)
        elif rul_hours <= 250.0:
            # Linear interpolation 0.20 down to 0.05
            return 0.05 + (0.20 - 0.05) * ((250.0 - rul_hours) / 130.0)
        else:
            return 0.02

    def calculate_risk(self, health_summary: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes transparent risk metrics for a machine using its Stage 6 health summary.
        """
        # Extract and validate inputs
        machine_id = str(health_summary.get("machine_id", "Unknown"))
        raw_health_score = float(health_summary.get("health_score", 50.0))
        health_score = float(np.clip(raw_health_score, 0.0, 100.0))
        
        health_state = int(health_summary.get("health_state", 0))
        anomaly_status = bool(health_summary.get("anomaly_status", False))
        anomaly_score = float(health_summary.get("anomaly_score", 0.40))
        degradation_status = str(health_summary.get("degradation_status", "STABLE"))
        raw_rul = health_summary.get("rul_hours")

        # 1. Component 1: Health Deficit Index (0.0 to 1.0)
        i_health = (100.0 - health_score) / 100.0

        # 2. Component 2: Health State Severity (0.0 to 1.0)
        if health_state == 2:
            i_state = 1.0
        elif health_state == 1:
            i_state = 0.50
        else:
            i_state = 0.0

        # 3. Component 3: Anomaly Severity (0.0 to 1.0)
        if anomaly_status:
            # If flagged as anomaly, base is 0.4 + score scaled
            i_anomaly = min(1.0, 0.40 + max(0.0, (anomaly_score - 0.45) / 0.25))
        else:
            # Unflagged baseline
            i_anomaly = min(0.30, max(0.0, (anomaly_score - 0.40) / 0.30))

        # 4. Component 4: Degradation Severity (0.0 to 1.0)
        if degradation_status == "RAPID_DEGRADATION":
            i_degradation = 1.0
        elif degradation_status == "MODERATE_DEGRADATION":
            i_degradation = 0.50
        else:
            i_degradation = 0.0

        # 5. Component 5: RUL Urgency (0.0 to 1.0)
        i_rul = self.normalize_rul_urgency(raw_rul)

        # Weighted composite score (0 to 100)
        c_health = self.w_health * i_health * 100.0
        c_state = self.w_state * i_state * 100.0
        c_anomaly = self.w_anomaly * i_anomaly * 100.0
        c_degradation = self.w_degradation * i_degradation * 100.0
        c_rul = self.w_rul * i_rul * 100.0

        base_risk_score = c_health + c_state + c_anomaly + c_degradation + c_rul

        # Safety Overrides & Emergency Triggers
        override_triggered = False
        override_reason = None
        final_risk_score = base_risk_score

        # Rule 1: Critical state or imminent failure (RUL <= 12h) forces minimum 80.0 (CRITICAL tier)
        if health_state == 2 or (raw_rul is not None and 0.0 <= raw_rul <= 12.0):
            if final_risk_score < 80.0:
                final_risk_score = 80.0
                override_triggered = True
                override_reason = "Imminent failure / Critical health state minimum threshold enforced (>= 80.0)"

        # Rule 2: Rapid degradation combined with RUL <= 24h adds urgency bonus (+10.0)
        if degradation_status == "RAPID_DEGRADATION" and (raw_rul is not None and 0.0 <= raw_rul <= 24.0):
            final_risk_score += 10.0
            if not override_reason:
                override_reason = "Rapid degradation under 24h RUL urgency bonus (+10.0)"

        # Clamp bounded to [0.0, 100.0]
        final_risk_score = float(np.clip(round(final_risk_score, 1), 0.0, 100.0))

        # Determine Tier, Priority, and Suggested Time Window
        risk_level = "VERY_LOW"
        maintenance_priority = "P5_SCHEDULED_MONITORING"
        maintenance_window = "Next routine maintenance interval"

        for threshold, r_lvl, priority, window in RISK_LEVEL_CONFIG:
            if final_risk_score >= threshold:
                risk_level = r_lvl
                maintenance_priority = priority
                maintenance_window = window
                break

        # Human-readable explanation for RAG/LLM ingestion
        explanation_parts = []
        if final_risk_score >= 80.0:
            explanation_parts.append(f"Machine {machine_id} is in CRITICAL condition.")
        elif final_risk_score >= 60.0:
            explanation_parts.append(f"Machine {machine_id} is at HIGH risk of failure.")
        elif final_risk_score >= 40.0:
            explanation_parts.append(f"Machine {machine_id} shows MEDIUM operational risk.")
        else:
            explanation_parts.append(f"Machine {machine_id} shows LOW risk under nominal operation.")

        factors = []
        if i_rul >= 0.85:
            factors.append(f"severely depleted remaining useful life ({raw_rul:.1f}h)")
        elif i_rul >= 0.65:
            factors.append(f"low remaining useful life ({raw_rul:.1f}h)")
            
        if degradation_status == "RAPID_DEGRADATION":
            factors.append("rapid vibration/temperature degradation")
        elif degradation_status == "MODERATE_DEGRADATION":
            factors.append("moderate mechanical degradation")
            
        if health_state == 2:
            factors.append("critical health state classification")
        elif health_state == 1:
            factors.append("warning health state classification")
            
        if anomaly_status:
            factors.append(f"statistical sensor anomaly detected (score {anomaly_score:.2f})")

        if factors:
            explanation = explanation_parts[0] + " Key drivers include " + ", ".join(factors) + "."
        else:
            explanation = explanation_parts[0] + " All sensor telemetry and trends are within acceptable baseline bounds."

        return {
            "machine_id": machine_id,
            "machine_type": health_summary.get("machine_type", "Unknown"),
            "timestamp": health_summary.get("timestamp"),
            "risk_score": final_risk_score,
            "risk_level": risk_level,
            "maintenance_priority": maintenance_priority,
            "estimated_maintenance_time_window": maintenance_window,
            "override_triggered": override_triggered,
            "override_reason": override_reason,
            "risk_factors": {
                "health_deficit_contribution": round(c_health, 2),
                "health_state_contribution": round(c_state, 2),
                "rul_urgency_contribution": round(c_rul, 2),
                "degradation_contribution": round(c_degradation, 2),
                "anomaly_contribution": round(c_anomaly, 2),
                "normalized_indices": {
                    "health_deficit_index": round(i_health, 3),
                    "health_state_index": round(i_state, 3),
                    "rul_urgency_index": round(i_rul, 3),
                    "degradation_index": round(i_degradation, 3),
                    "anomaly_index": round(i_anomaly, 3),
                }
            },
            "risk_explanation": explanation,
            "health_summary": health_summary, # Preserve Stage 6 outputs completely
        }

    def evaluate_fleet_risk(self, fleet_health_summaries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Evaluates risk for the entire fleet and sorts by highest risk first (P1 top).
        """
        risk_summaries = [self.calculate_risk(summary) for summary in fleet_health_summaries]
        # Sort descending by risk score
        risk_summaries.sort(key=lambda s: s["risk_score"], reverse=True)
        return risk_summaries
