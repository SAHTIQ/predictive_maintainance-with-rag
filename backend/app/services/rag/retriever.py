from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.app.services.rag.query_builder import ContextAwareQueryBuilder
from backend.app.services.rag.vector_store import LocalVectorStore

INDEX_PATH = Path(__file__).resolve().parents[4] / "backend" / "ml" / "models" / "rag_index.joblib"

class ContextAwareRetriever:
    """
    Connects the Maintenance Risk Engine outputs with the Knowledge Base Vector Store,
    producing structured, traceable evidence packages for Stage 9 consumption.
    """
    def __init__(self, vector_store: Optional[LocalVectorStore] = None):
        if vector_store is not None:
            self.store = vector_store
        elif INDEX_PATH.exists():
            self.store = LocalVectorStore.load(INDEX_PATH)
        else:
            self.store = None

    def retrieve_evidence_for_machine(
        self,
        risk_summary: Dict[str, Any],
        top_k: int = 4,
        min_relevance: float = 0.05
    ) -> Dict[str, Any]:
        """
        Executes context-aware retrieval and packages sensor evidence,
        documentary evidence, and source traceability.
        """
        machine_id = str(risk_summary.get("machine_id", "Unknown"))
        machine_type = str(risk_summary.get("machine_type", "TypeA"))
        
        if self.store is None:
            raise RuntimeError(f"RAG vector index is not available at {INDEX_PATH}. Build index first.")

        # 1. Context-Aware Query Formulation
        query_str, filters = ContextAwareQueryBuilder.build_query(risk_summary)
        
        # 2. Vector Retrieval with Metadata Filtering
        search_hits = self.store.search(
            query=query_str,
            top_k=top_k,
            machine_type=filters.get("machine_type"),
            min_similarity=min_relevance
        )

        # 3. Format Structured Documentary Evidence
        retrieved_docs = []
        for hit in search_hits:
            chunk = hit["chunk"]
            retrieved_docs.append({
                "source_document": chunk.source_file,
                "section": chunk.section,
                "title": chunk.title,
                "document_type": chunk.document_type,
                "component": chunk.component,
                "failure_type": chunk.failure_type,
                "relevance_score": hit["relevance_score"],
                "content": chunk.content,
            })

        # 4. Structured Assembly for Stage 9
        hs = risk_summary.get("health_summary", {})
        return {
            "machine_id": machine_id,
            "machine_type": machine_type,
            "timestamp": risk_summary.get("timestamp"),
            "query_constructed": query_str,
            "sensor_ml_evidence": {
                "health_score": hs.get("health_score"),
                "health_state_label": hs.get("health_state_label"),
                "risk_score": risk_summary.get("risk_score"),
                "risk_level": risk_summary.get("risk_level"),
                "maintenance_priority": risk_summary.get("maintenance_priority"),
                "estimated_maintenance_time_window": risk_summary.get("estimated_maintenance_time_window"),
                "rul_hours": hs.get("rul_hours"),
                "rul_uncertainty_std": hs.get("rul_uncertainty_std"),
                "rul_confidence_lower": hs.get("rul_confidence_lower"),
                "rul_confidence_upper": hs.get("rul_confidence_upper"),
                "rul_uncertainty_score": hs.get("rul_uncertainty_score"),
                "anomaly_status": hs.get("anomaly_status"),
                "anomaly_score": hs.get("anomaly_score"),
                "degradation_status": hs.get("degradation_status"),
                "fft_energy_ratio": hs.get("fft_energy_ratio"),
                "dominant_frequency_hz": hs.get("dominant_frequency_hz"),
                "telemetry": hs.get("key_sensors", {}),
            },
            "retrieved_documentary_evidence": retrieved_docs,
            "traceability": {
                "total_chunks_indexed": len(self.store.chunks),
                "matching_chunks_returned": len(retrieved_docs),
                "embedding_model": "TFIDF-CosineSimilarity-v1",
                "index_version": "1.0.0",
            }
        }