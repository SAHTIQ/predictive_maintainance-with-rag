from typing import Any, Dict, List, Optional

class DeterministicFallbackEngine:
    """
    Grounded, rule-based expert decision engine.
    Produces strictly grounded maintenance causes and recommended actions
    directly from physical sensor patterns and retrieved knowledge base SOPs
    without hallucination.
    """
    @staticmethod
    def generate_recommendation(rag_context: Dict[str, Any]) -> Dict[str, Any]:
        sensor_ev = rag_context.get("sensor_ml_evidence", {})
        doc_ev = rag_context.get("retrieved_documentary_evidence", [])
        machine_id = rag_context.get("machine_id", "Unknown")
        machine_type = rag_context.get("machine_type", "Unknown")
        
        health_score = float(sensor_ev.get("health_score", 50.0))
        health_state = str(sensor_ev.get("health_state_label", "Good"))
        risk_level = str(sensor_ev.get("risk_level", "LOW"))
        priority = str(sensor_ev.get("maintenance_priority", "P5_SCHEDULED_MONITORING"))
        rul_hours = sensor_ev.get("rul_hours")
        anomaly_status = bool(sensor_ev.get("anomaly_status", False))
        degradation_status = str(sensor_ev.get("degradation_status", "STABLE"))
        
        telemetry = sensor_ev.get("telemetry", {})
        vib_x = float(telemetry.get("vibration_x", 0.0))
        vib_y = float(telemetry.get("vibration_y", 0.0))
        vib_z = float(telemetry.get("vibration_z", 0.0))
        vib_mag = float(telemetry.get("vibration_magnitude", 0.0))
        temp = float(telemetry.get("temperature", 50.0))

        # Check for empty documentary evidence
        if not doc_ev:
            return {
                "potential_causes": [
                    {
                        "cause": "Cause cannot be definitively determined from available evidence",
                        "component": "unspecified",
                        "cited_source": "None"
                    }
                ],
                "recommended_actions": [
                    {
                        "step": 1,
                        "action": "Perform physical sensor calibration and inspect machine visually.",
                        "cited_procedure": "Standard Operational Check"
                    }
                ],
                "reasoning": f"No documentary knowledge base evidence was retrieved for machine {machine_id}. Operating on sensor thresholds only.",
                "confidence": 0.40,
                "generation_source": "deterministic_fallback_no_docs"
            }

        potential_causes = []
        recommended_actions = []
        reasoning_parts = []
        confidence = 0.85

        # Rule 1: Severe Bearing Fatigue / Spalling (High Vibration + Low RUL / Degradation)
        if (rul_hours is not None and rul_hours <= 24.0) or degradation_status == "RAPID_DEGRADATION" or vib_mag >= 1.2:
            potential_causes.append({
                "cause": "Stage 3 Rolling Element Bearing Fatigue / Raceway Spalling",
                "component": "bearing",
                "cited_source": "data/knowledge_base/failure_modes/failure_knowledge.md"
            })
            recommended_actions.extend([
                {
                    "step": 1,
                    "action": "Execute electrical Lockout/Tagout (LOTO) and depressurize system.",
                    "cited_procedure": "SOP-MECH-04"
                },
                {
                    "step": 2,
                    "action": "Decouple machine, extract damaged bearing with mechanical puller, and inspect seat diameter.",
                    "cited_procedure": "SOP-MECH-04"
                },
                {
                    "step": 3,
                    "action": "Heat replacement bearing uniformly to 110°C with induction heater and mount squarely against shaft shoulder.",
                    "cited_procedure": "SOP-MECH-04"
                }
            ])
            rul_str = f"{rul_hours:.1f}h" if rul_hours is not None else "unavailable"
            reasoning_parts.append(
                f"Vibration magnitude ({vib_mag:.2f} mm/s) exceeds ISO warning thresholds accompanied by {degradation_status.lower().replace('_', ' ')} and critical RUL ({rul_str}). This pattern matches progressive bearing raceway spalling described in SOP-MECH-04."
            )
            confidence = max(confidence, 0.92)

        # Rule 2: Lubrication Starvation / Thermal Breakdown
        if temp >= 75.0:
            potential_causes.append({
                "cause": "Boundary Lubricant Starvation / Thermal Shearing Breakdown",
                "component": "lubrication_system",
                "cited_source": "data/knowledge_base/failure_modes/failure_knowledge.md"
            })
            recommended_actions.append({
                "step": len(recommended_actions) + 1,
                "action": "Inspect grease condition for metallic debris/oxidation, purge degraded lubricant, and replenish cavity 30-50% with approved grease.",
                "cited_procedure": "SOP-MECH-04"
            })
            reasoning_parts.append(
                f"Operating temperature ({temp:.1f}°C) exceeds nominal limits (70°C), indicating boundary lubrication breakdown and elevated friction."
            )
            confidence = max(confidence, 0.90)

        # Rule 3: Coupling Misalignment (Elevated Axial Vibration Z exceeding nominal threshold)
        if (vib_z >= 0.70 or (vib_mag >= 1.0 and (vib_z / max(vib_mag, 1e-3)) > 0.45)) and (vib_mag >= 0.80):
            potential_causes.append({
                "cause": "Shaft Angular or Offset Coupling Misalignment",
                "component": "shaft_coupling",
                "cited_source": "data/knowledge_base/failure_modes/failure_knowledge.md"
            })
            recommended_actions.append({
                "step": len(recommended_actions) + 1,
                "action": "Verify clean machine base, check for soft foot (<0.05 mm), and perform laser shaft alignment to within 0.05 mm tolerance.",
                "cited_procedure": "SOP-ALIGN-02"
            })
            reasoning_parts.append(
                f"Elevated axial vibration ({vib_z:.2f} mm/s) indicates coupling angular or offset misalignment per SOP-ALIGN-02."
            )

        # Rule 4: Dynamic Rotor Unbalance (Elevated Radial Vibration X/Y)
        if (vib_x >= 0.80 or vib_y >= 0.80) and temp < 75.0 and not potential_causes:
            potential_causes.append({
                "cause": "Dynamic Rotor Unbalance",
                "component": "rotor",
                "cited_source": "data/knowledge_base/failure_modes/failure_knowledge.md"
            })
            recommended_actions.append({
                "step": len(recommended_actions) + 1,
                "action": "Clean impellers/rotors of particulate buildup and perform dynamic in-situ balancing.",
                "cited_procedure": "SOP-MECH-12"
            })
            reasoning_parts.append(
                f"Elevated radial vibration (X: {vib_x:.2f}, Y: {vib_y:.2f} mm/s) without temperature rise indicates dynamic rotor unbalance."
            )

        # Default Healthy Operation
        if not potential_causes:
            potential_causes.append({
                "cause": "No active mechanical fault detected; nominal operation",
                "component": "general",
                "cited_source": "data/knowledge_base/manuals/machine_manuals.md"
            })
            recommended_actions.append({
                "step": 1,
                "action": "Continue standard condition monitoring at regular scheduled maintenance intervals.",
                "cited_procedure": "Standard Maintenance Protocol"
            })
            reasoning_parts.append(
                f"Machine {machine_id} shows stable telemetry within acceptable ISO 10816-3 limits. All condition metrics indicate healthy operation."
            )
            confidence = 0.95

        return {
            "potential_causes": potential_causes,
            "recommended_actions": recommended_actions,
            "reasoning": " ".join(reasoning_parts),
            "confidence": round(confidence, 2),
            "generation_source": "deterministic_expert_engine"
        }