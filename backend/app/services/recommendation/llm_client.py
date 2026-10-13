import os
import json
import logging
from typing import Any, Dict, Optional, List

from pathlib import Path
from dotenv import load_dotenv

backend_env = Path(__file__).resolve().parents[3] / ".env"
root_env = Path(__file__).resolve().parents[4] / ".env"
if backend_env.exists():
    load_dotenv(backend_env, override=False)
elif root_env.exists():
    load_dotenv(root_env, override=False)

logger = logging.getLogger(__name__)

class GroundedLLMClient:
    """
    Pluggable, resilient Industrial LLM client for predictive maintenance & conversational RAG.
    Supports:
    1. Google Gemini API (gemini-3.8-flash / gemini-3.5-flash) via google-genai
    2. Hugging Face Inference API / InferenceClient
    3. Self-contained deterministic expert reasoning fallback if no external API token is active.
    """
    def __init__(
        self,
        hf_token: Optional[str] = None,
        hf_model: str = "Qwen/Qwen2.5-7B-Instruct",
        gemini_api_key: Optional[str] = None,
        gemini_model: str = "gemini-3.8-flash",
    ):
        self.hf_token = hf_token or os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
        self.hf_model = os.getenv("HF_MODEL_NAME", hf_model)
        self.gemini_api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        self.gemini_model = os.getenv("GEMINI_MODEL", gemini_model)
        
        self.hf_client = None
        if self.hf_token:
            try:
                from huggingface_hub import InferenceClient
                self.hf_client = InferenceClient(model=self.hf_model, token=self.hf_token, timeout=8)
            except Exception as e:
                logger.warning(f"Could not initialize HuggingFace InferenceClient: {e}")

    def generate_chat_response(
        self,
        query: str,
        machine_context: Optional[Dict[str, Any]] = None,
        retrieved_documents: Optional[List[Dict[str, Any]]] = None,
        fleet_overview: Optional[Dict[str, Any]] = None,
        top_critical_machines: Optional[List[Dict[str, Any]]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Generates a natural, expert response grounded in machine telemetry and documents.
        """
        system_prompt = (
            "You are RESONEX AI, a practical and sharp predictive maintenance copilot for factory operators and reliability engineers. "
            "Your job is to directly and accurately answer the operator's exact question using live sensor telemetry, ML health/RUL diagnostics, and factory SOP manuals.\n"
            "\n"
            "STRICT COMMUNICATION RULES:\n"
            "1. ANSWER THE EXACT QUESTION DIRECTLY: Do NOT repeat or echo the user's question back (never say 'Inquiry evaluated: ...'). Address what they asked in the very first sentence.\n"
            "2. GREETINGS & INTRODUCTIONS: If the user says 'hi', 'hello', or asks what you do, welcome them warmly, give a concise 2-line live factory snapshot (how many machines need attention and the top critical machine), and suggest 3 specific questions they can ask.\n"
            "3. CLARITY & BREVITY: Use clean markdown headings and short bullet points. Bold key machine IDs (e.g. **TXM-014**) and numerical values (e.g. **5.82 mm/s**, **86.4 °C**).\n"
            "4. PRACTICAL ACTIONS: When asked how to perform a check or repair (e.g., sensor cabling check, acoustic stethoscope test, bearing replacement, lubrication, alignment), provide the exact step-by-step technician procedure.\n"
            "5. EVIDENCE & GROUNDING: Ground every diagnostic answer in the supplied sensor readings and cite the applicable SOP or standard (e.g., SOP-MECH-04, SOP-LUB-02, SOP-ALIGN-02, SOP-THERM-02, ISO 10816-3)."
        )

        user_content_parts = [f"Operator Question: {query}\n"]
        if machine_context:
            user_content_parts.append(f"--- FOCUSED ASSET TELEMETRY ---\n{json.dumps(machine_context, indent=2)}\n")
        if top_critical_machines:
            user_content_parts.append(f"--- URGENT / CRITICAL MACHINES REQUIRING ATTENTION ---\n{json.dumps(top_critical_machines[:6], indent=2)}\n")
        if fleet_overview:
            user_content_parts.append(f"--- FLEET OVERVIEW ---\n{json.dumps(fleet_overview, indent=2)}\n")
        if retrieved_documents:
            docs_summary = [
                {
                    "title": d.get("title"),
                    "source": d.get("source_document"),
                    "section": d.get("section"),
                    "excerpt": d.get("content", "")[:500]
                }
                for d in retrieved_documents[:4]
            ]
            user_content_parts.append(f"--- RETRIEVED KNOWLEDGE BASE EXCERPTS ---\n{json.dumps(docs_summary, indent=2)}\n")

        prompt = "\n".join(user_content_parts)

        # 1. Try Gemini first if API key configured (fast, reliable)
        if self.gemini_api_key:
            candidate_models = list(dict.fromkeys([self.gemini_model, "gemini-3.8-flash"]))
            for model_name in candidate_models:
                try:
                    from google import genai
                    from google.genai import types
                    client = genai.Client(
                        api_key=self.gemini_api_key,
                        http_options=types.HttpOptions(
                            timeout=10000,
                            retry_options=types.HttpRetryOptions(attempts=1),
                        )
                    )
                    full_content = f"{system_prompt}\n\n{prompt}"
                    res = client.models.generate_content(
                        model=model_name,
                        contents=full_content
                    )
                    if res and res.text:
                        return {
                            "text": res.text,
                            "model_used": f"Google Gemini ({model_name})"
                        }
                except Exception as e:
                    logger.warning(f"Gemini API call ({model_name}) failed: {e}. Trying next...")

        # 2. Try Hugging Face Inference if token is configured
        if self.hf_client and self.hf_model != "Qwen/Qwen2.5-7B-Instruct":
            try:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ]
                response = self.hf_client.chat_completion(
                    messages=messages,
                    max_tokens=600,
                    temperature=0.3,
                )
                generated_text = response.choices[0].message.content
                return {
                    "text": generated_text,
                    "model_used": f"HuggingFace ({self.hf_model})"
                }
            except Exception as e:
                logger.warning(f"Hugging Face inference error: {e}. Falling back...")

        return None

    def generate(self, rag_context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Executes structured JSON recommendation decision generation for Stage 9.
        Returns structured dict if external model succeeds, else None to trigger deterministic fallback.
        """
        if not (self.hf_client or self.gemini_api_key):
            return None

        prompt = f"""You are an industrial reliability engineer. Analyze the following machine evidence and generate a structured maintenance decision.

STRICT GROUNDING INSTRUCTIONS:
1. Use ONLY the supplied Measured Telemetry, Calculated ML Evidence, and Retrieved Documentary Excerpts.
2. DO NOT invent machine tolerances, failure modes, or repair steps.
3. For every cause and recommended action, you MUST cite the retrieved document source or SOP code.
4. Output MUST be valid JSON.

--- MACHINE EVIDENCE ---
Machine ID: {rag_context.get('machine_id')}
Machine Type: {rag_context.get('machine_type')}
Sensor ML Evidence: {json.dumps(rag_context.get('sensor_ml_evidence', {}), indent=2)}

--- RETRIEVED DOCUMENTARY EVIDENCE ---
{json.dumps(rag_context.get('retrieved_documentary_evidence', []), indent=2)}

Respond with JSON:
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
        # 1. Try Gemini
        if self.gemini_api_key:
            candidate_models = list(dict.fromkeys([self.gemini_model, "gemini-3.8-flash"]))
            for model_name in candidate_models:
                try:
                    from google import genai
                    from google.genai import types
                    client = genai.Client(
                        api_key=self.gemini_api_key,
                        http_options=types.HttpOptions(
                            timeout=10000,
                            retry_options=types.HttpRetryOptions(attempts=1),
                        )
                    )
                    res = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    text = res.text.strip()
                    if text.startswith("```json"):
                        text = text[7:-3].strip()
                    elif text.startswith("```"):
                        text = text[3:-3].strip()
                    return json.loads(text)
                except Exception as e:
                    logger.warning(f"Gemini recommendation generation ({model_name}) failed: {e}. Trying next...")

        # 2. Try HF
        if self.hf_client:
            try:
                res = self.hf_client.chat_completion(
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=600,
                    response_format={"type": "json_object"}
                )
                text = res.choices[0].message.content
                return json.loads(text)
            except Exception as e:
                logger.warning(f"Hugging Face recommendation generation failed: {e}. Falling back...")

        return None