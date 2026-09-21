from typing import Any, Dict, Tuple

class ContextAwareQueryBuilder:
    """
    Transforms Stage 7 diagnostic outputs (machine state, sensor levels,
    degradation slope, risk priority, and RUL) into contextual search queries and filters.
    """
    @staticmethod
    def build_query(risk_summary: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        machine_type = str(risk_summary.get("machine_type", "TypeA"))
        risk_level = str(risk_summary.get("risk_level", "LOW"))
        priority = str(risk_summary.get("maintenance_priority", "P5"))
        
        hs = risk_summary.get("health_summary", {})
        health_state_label = str(hs.get("health_state_label", "Good"))
        degradation_status = str(hs.get("degradation_status", "STABLE"))
        rul_hours = hs.get("rul_hours", 100.0)
        
        sensors = hs.get("key_sensors", {})
        vib_mag = float(sensors.get("vibration_magnitude", 0.5))
        temp = float(sensors.get("temperature", 50.0))
        
        query_terms = [machine_type]

        # Determine dominant physical symptoms
        if vib_mag >= 1.2 or "DEGRADATION" in degradation_status:
            query_terms.extend(["vibration", "bearing wear", "spalling", "unbalance", "misalignment"])
        if temp >= 75.0:
            query_terms.extend(["temperature", "overheating", "lubrication starvation"])
            
        if risk_level in ["HIGH", "CRITICAL"] or health_state_label in ["Warning", "Critical"]:
            query_terms.extend(["corrective action", "maintenance procedure", "inspection protocol"])
        else:
            query_terms.extend(["operating manual", "nominal tolerances", "lubrication baseline"])

        if rul_hours is not None and rul_hours <= 24.0:
            query_terms.append("emergency shutdown repair SOP")

        query_str = " ".join(query_terms)
        
        metadata_filters = {
            "machine_type": machine_type,
        }
        
        return query_str, metadata_filters