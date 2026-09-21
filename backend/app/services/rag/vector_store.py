from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from backend.app.services.rag.document_loader import DocumentChunk

class LocalVectorStore:
    """
    In-memory / Joblib-persisted vector store utilizing TF-IDF sparse embeddings
    and normalized Cosine Similarity for robust, lightweight, API-free semantic search.
    """
    def __init__(self, index_path: Optional[Path] = None):
        self.index_path = index_path
        self.chunks: List[DocumentChunk] = []
        self.vectorizer: TfidfVectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            max_df=0.95,
            min_df=1
        )
        self.tfidf_matrix = None
        self.is_indexed: bool = False

    def build_index(self, chunks: List[DocumentChunk]) -> None:
        if not chunks:
            raise ValueError("Cannot build index on empty chunk list.")
        self.chunks = chunks
        
        # Build enriched document strings incorporating metadata for hybrid semantic matching
        corpus = [
            f"{c.title} {c.machine_type} {c.component} {c.section} {c.failure_type or ''} {c.content}"
            for c in chunks
        ]
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
        self.is_indexed = True

    def save(self, path: Optional[Path] = None) -> None:
        save_dest = path or self.index_path
        if not save_dest:
            raise ValueError("No destination path specified to save vector index.")
        save_dest.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "chunks": self.chunks,
            "vectorizer": self.vectorizer,
            "tfidf_matrix": self.tfidf_matrix,
            "version": "1.0.0"
        }, save_dest)

    @classmethod
    def load(cls, path: Path) -> "LocalVectorStore":
        if not path.exists():
            raise FileNotFoundError(f"Vector index file not found at {path}")
        data = joblib.load(path)
        store = cls(index_path=path)
        store.chunks = data["chunks"]
        store.vectorizer = data["vectorizer"]
        store.tfidf_matrix = data["tfidf_matrix"]
        store.is_indexed = True
        return store

    def search(
        self,
        query: str,
        top_k: int = 4,
        machine_type: Optional[str] = None,
        component: Optional[str] = None,
        document_type: Optional[str] = None,
        min_similarity: float = 0.05
    ) -> List[Dict[str, Any]]:
        """
        Executes metadata-filtered cosine similarity retrieval.
        """
        if not self.is_indexed or self.tfidf_matrix is None:
            raise RuntimeError("Vector store is not indexed. Build or load an index first.")

        if not query.strip():
            return []

        query_vec = self.vectorizer.transform([query])
        sim_scores = cosine_similarity(query_vec, self.tfidf_matrix)[0]

        results = []
        for idx, score in enumerate(sim_scores):
            chunk = self.chunks[idx]
            
            # Apply Metadata Filters
            if machine_type and chunk.machine_type not in ["all", machine_type]:
                continue
            if component and chunk.component not in ["all", "general", component]:
                continue
            if document_type and chunk.document_type != document_type:
                continue

            if score >= min_similarity:
                results.append({
                    "chunk": chunk,
                    "relevance_score": float(round(score, 4)),
                })

        # Sort descending by similarity score
        results.sort(key=lambda r: r["relevance_score"], reverse=True)
        return results[:top_k]