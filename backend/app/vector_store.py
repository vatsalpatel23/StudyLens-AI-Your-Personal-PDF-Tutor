import math
import re
from collections import Counter
from typing import Optional
import threading

from backend.app.config import settings


class VectorRecord:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        user_id: str,
        page_number: int,
        content: str,
        vector: dict[str, float],
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.user_id = user_id
        self.page_number = page_number
        self.content = content
        self.vector = vector


class VectorSearchResult:
    def __init__(self, chunk_id: str, document_id: str, page_number: int, content: str, score: float):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.page_number = page_number
        self.content = content
        self.score = score


class InMemoryVectorStore:
    """
    Multi-tenant isolated Vector Database.
    Ensures that vector lookups strictly enforce user_id isolation
    so that User A can never retrieve or leak User B's documents or chunks.
    """
    def __init__(self):
        self._records: dict[str, VectorRecord] = {}  # chunk_id -> VectorRecord
        self._lock = threading.RLock()

    def _tokenize(self, text: str) -> list[str]:
        """Normalize and tokenize text for vectorization."""
        # Convert to lower case, replace non-alphanumeric with spaces
        clean_text = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = [token for token in clean_text.split() if len(token) > 1]
        return tokens

    def _generate_vector(self, text: str) -> dict[str, float]:
        """
        Generates an L2-normalized Term-Frequency vector with sublinear scaling.
        Provides fast, deterministic, zero-external-dependency semantic matching.
        """
        tokens = self._tokenize(text)
        if not tokens:
            return {}

        counts = Counter(tokens)
        raw_vector = {}
        for token, count in counts.items():
            # Sublinear tf scaling: 1 + log(tf)
            raw_vector[token] = 1.0 + math.log(count)

        # L2 normalize vector
        norm = math.sqrt(sum(val * val for val in raw_vector.values()))
        if norm > 0:
            return {token: val / norm for token, val in raw_vector.items()}
        return raw_vector

    def _cosine_similarity(self, vec1: dict[str, float], vec2: dict[str, float]) -> float:
        """Compute cosine similarity between two normalized sparse vectors."""
        # Since both vectors are L2 normalized, dot product is cosine similarity
        if not vec1 or not vec2:
            return 0.0

        # Iterate over smaller vector for performance
        if len(vec1) > len(vec2):
            vec1, vec2 = vec2, vec1

        dot_product = sum(weight * vec2.get(token, 0.0) for token, weight in vec1.items())
        return max(0.0, min(1.0, dot_product))

    def add_chunk(self, chunk_id: str, document_id: str, user_id: str, page_number: int, content: str):
        """Add and index a chunk with mandatory user_id attribution."""
        vector = self._generate_vector(content)
        record = VectorRecord(
            chunk_id=chunk_id,
            document_id=document_id,
            user_id=user_id,
            page_number=page_number,
            content=content,
            vector=vector,
        )
        with self._lock:
            self._records[chunk_id] = record

    def search(
        self,
        query: str,
        user_id: str,
        document_id: Optional[str] = None,
        top_k: int = 5,
        threshold: float = 0.15,
    ) -> list[VectorSearchResult]:
        """
        Searches chunks with mandatory tenant isolation:
        Only chunks strictly belonging to `user_id` are eligible for scoring and retrieval.
        """
        query_vec = self._generate_vector(query)
        if not query_vec:
            return []

        results = []
        with self._lock:
            for record in self._records.values():
                # STRICT TENANT ISOLATION: Reject any record not belonging to the authorized user
                if record.user_id != user_id:
                    continue

                # Document filter if specified
                if document_id and record.document_id != document_id:
                    continue

                sim = self._cosine_similarity(query_vec, record.vector)
                if sim >= threshold:
                    results.append(
                        VectorSearchResult(
                            chunk_id=record.chunk_id,
                            document_id=record.document_id,
                            page_number=record.page_number,
                            content=record.content,
                            score=sim,
                        )
                    )

        # Sort descending by similarity score
        results.sort(key=lambda r: r.score, reverse=True)
        return results[:top_k]

    def delete_document_chunks(self, document_id: str, user_id: str) -> int:
        """
        Deletes all vector chunks associated with a document, strictly matching user_id.
        """
        with self._lock:
            to_delete = [
                chunk_id for chunk_id, record in self._records.items()
                if record.document_id == document_id and record.user_id == user_id
            ]
            for chunk_id in to_delete:
                del self._records[chunk_id]
            return len(to_delete)

    def count_chunks_for_user(self, user_id: str) -> int:
        with self._lock:
            return sum(1 for r in self._records.values() if r.user_id == user_id)


# Global singleton vector store
vector_store = InMemoryVectorStore()
