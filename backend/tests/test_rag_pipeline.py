from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.rag.document_loader import DocumentChunk, MarkdownKnowledgeBaseLoader
from backend.app.services.rag.query_builder import ContextAwareQueryBuilder
from backend.app.services.rag.retriever import ContextAwareRetriever
from backend.app.services.rag.vector_store import LocalVectorStore

KB_DIR = Path(__file__).resolve().parents[2] / "data" / "knowledge_base"

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(scope="module")
def kb_loader():
    return MarkdownKnowledgeBaseLoader(KB_DIR)

@pytest.fixture(scope="module")
def loaded_chunks(kb_loader):
    return kb_loader.load_documents()

@pytest.fixture(scope="module")
def vector_store(loaded_chunks):
    store = LocalVectorStore()
    store.build_index(loaded_chunks)
    return store

def test_document_ingestion_and_chunking(loaded_chunks):
    assert len(loaded_chunks) > 0
    # Check that diverse document types exist
    doc_types = {c.document_type for c in loaded_chunks}
    assert {"manual", "specification", "failure_mode", "procedure"}.issubset(doc_types)

def test_chunk_metadata(loaded_chunks):
    for chunk in loaded_chunks:
        assert chunk.chunk_id.startswith("chunk_")
        assert len(chunk.title) > 0
        assert len(chunk.content) > 0
        assert len(chunk.source_file) > 0
        assert chunk.machine_type in ["TypeA", "TypeB", "TypeC", "TypeD", "TypeE", "all"]

def test_vector_store_search(vector_store):
    hits = vector_store.search("vibration bearing wear overheating", top_k=3)
    assert len(hits) > 0
    assert "relevance_score" in hits[0]
    assert hits[0]["relevance_score"] > 0.0
    assert isinstance(hits[0]["chunk"], DocumentChunk)

def test_metadata_filtering(vector_store):
    # Search with TypeC filter
    hits = vector_store.search("gearbox mesh vibration", top_k=4, machine_type="TypeC")
    for hit in hits:
        assert hit["chunk"].machine_type in ["TypeC", "all"]

def test_machine_specific_retrieval(vector_store):
    # Construct a mock high risk summary for TypeA
    risk_summary = {
        "machine_id": "TXM-001",
        "machine_type": "TypeA",
        "timestamp": "2025-01-14T03:30:00",
        "risk_score": 90.0,
        "risk_level": "CRITICAL",
        "maintenance_priority": "P1_IMMEDIATE",
        "health_summary": {
            "health_score": 34.0,
            "health_state_label": "Warning",
            "degradation_status": "RAPID_DEGRADATION",
            "rul_hours": 3.4,
            "key_sensors": {
                "vibration_magnitude": 1.22,
                "temperature": 75.2
            }
        }
    }
    retriever = ContextAwareRetriever(vector_store=vector_store)
    result = retriever.retrieve_evidence_for_machine(risk_summary, top_k=3)
    
    assert result["machine_id"] == "TXM-001"
    assert "query_constructed" in result
    assert "TypeA" in result["query_constructed"]
    assert len(result["retrieved_documentary_evidence"]) > 0
    
    # Check source traceability
    first_hit = result["retrieved_documentary_evidence"][0]
    assert "source_document" in first_hit
    assert "section" in first_hit
    assert "relevance_score" in first_hit
    assert "content" in first_hit

def test_empty_query_retrieval(vector_store):
    hits = vector_store.search("", top_k=5)
    assert hits == []

def test_malformed_empty_chunks():
    store = LocalVectorStore()
    with pytest.raises(ValueError):
        store.build_index([])

def test_source_traceability_distinction(vector_store):
    risk_summary = {
        "machine_id": "TXM-002",
        "machine_type": "TypeB",
        "risk_score": 25.0,
        "risk_level": "LOW",
        "maintenance_priority": "P4_LOW",
        "health_summary": {
            "health_score": 85.0,
            "health_state_label": "Good",
            "degradation_status": "STABLE",
            "rul_hours": 150.0,
            "key_sensors": {"vibration_magnitude": 0.45, "temperature": 55.0}
        }
    }
    retriever = ContextAwareRetriever(vector_store=vector_store)
    result = retriever.retrieve_evidence_for_machine(risk_summary)
    
    # Must clearly separate sensor_ml_evidence from retrieved_documentary_evidence
    assert "sensor_ml_evidence" in result
    assert "retrieved_documentary_evidence" in result
    assert "traceability" in result
    assert result["traceability"]["embedding_model"] == "TFIDF-CosineSimilarity-v1"

def test_api_rag_context_endpoint(client):
    res = client.get("/api/v1/machines/TXM-001/rag-context")
    assert res.status_code == 200
    data = res.json()
    assert data["machine_id"] == "TXM-001"
    assert "sensor_ml_evidence" in data
    assert "retrieved_documentary_evidence" in data
    assert len(data["retrieved_documentary_evidence"]) > 0
    assert "traceability" in data
