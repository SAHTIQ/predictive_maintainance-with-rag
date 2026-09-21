import json
from typing import Any, Dict, Optional

class GroundedLLMClient:
    """
    Pluggable LLM interface supporting strict grounding instructions.
    Can connect to Google Gemini, local models, or mock clients.
    """
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model_name = model_name

    def build_grounded_prompt(self, rag_context: Dict[str, Any]) -> str:
        """
        Builds a strictly constrained system and user prompt ensuring:
        - No invented specifications
        - Citations of retrieved documents
        - Explicit declaration if evidence is insufficient
        """
        prompt = f"""You are an industrial reliability engineer. Analyze the following machine evidence and generate a structured maintenance decision.

STRICT GROUNDING INSTRUCTIONS:
1. Use ONLY the supplied Measured Telemetry, Calculated ML Evidence, and Retrieved Documentary Excerpts.
2. DO NOT invent machine tolerances, failure modes, or repair steps.
3. DO NOT override measured sensor values.
4. For every cause and recommended action, you MUST cite the retrieved document source or SOP code.
5. If the retrieved evidence is empty or insufficient to diagnose the root cause, you MUST explicitly state that the cause cannot be determined from available documentary evidence.
6. Output MUST be valid JSON conforming strictly to the requested schema.

--- MACHINE EVIDENCE ---
Machine ID: {rag_context.get('machine_id')}
Machine Type: {rag_context.get('machine_type')}
Sensor ML Evidence: {json.dumps(rag_context.get('sensor_ml_evidence', {}), indent=2)}

--- RETRIEVED DOCUMENTARY EVIDENCE ---
{json.dumps(rag_context.get('retrieved_documentary_evidence', []), indent=2)}

Respond with JSON format:
{{
  "potential_causes": [
    {{"cause": "...", "component": "...", "cited_source": "..."}}
  ],
  "recommended_actions": [
    {{"step": 1, "action": "...", "cited_procedure": "..."}}
  ],
  "reasoning": "...",
  "confidence": 0.85
}}
"""
        return prompt

    def generate(self, rag_context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Executes LLM call. If API is not configured, returns None to trigger deterministic fallback.
        """
        # In this self-contained environment, if no external API key is provided, return None
        if not self.api_key:
            return None
            
        # Placeholder for external SDK call when API key is present
        try:
            # External call logic would go here
            return None
        except Exception:
            return None