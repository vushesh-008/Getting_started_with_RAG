"""Retrieval service — semantic search + optional re-ranking + Ollama LLM streaming.

Flow:
  1. Embed the query with the same model used at index time.
  2. Search FAISS for the top-k most similar vectors (×3 candidates if re-ranking).
  3. Fetch the corresponding chunk texts from SQLite.
  4. Optionally re-rank with a cross-encoder and trim back to top-k.
  5. Build a RAG prompt (system + context + user question).
  6. Stream the Ollama response token-by-token.

See docs/decisions/llm_serving.md and docs/decisions/reranking.md for rationale.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Generator

import faiss
import httpx

from db.database import get_connection
from services.embedding import INDEX_PATH, embed_query

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
DEFAULT_MODEL = "phi3:mini"
RERANK_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

SYSTEM_PROMPT = (
    "You are a helpful assistant. Answer the user's question using ONLY the information "
    "provided in the context below. If the answer cannot be found in the context, say so "
    "honestly. Do not make up information."
)


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class RetrievedChunk:
    faiss_index: int
    chunk_index: int
    source_file: str
    text: str
    char_start: int
    char_end: int
    score: float                        # cosine similarity from FAISS
    rerank_score: float | None = field(default=None)  # cross-encoder score (if re-ranked)


# ---------------------------------------------------------------------------
# Lazy-loaded cross-encoder
# ---------------------------------------------------------------------------

_reranker = None


def _get_reranker():
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder
        _reranker = CrossEncoder(RERANK_MODEL)
    return _reranker


# ---------------------------------------------------------------------------
# Step 1+2 — embed query and search FAISS
# ---------------------------------------------------------------------------

def retrieve(query: str, top_k: int = 5, rerank: bool = False) -> list[RetrievedChunk]:
    """Return the top-k most relevant chunks for *query*.

    Args:
        query:   User question string.
        top_k:   Number of chunks to return.
        rerank:  If True, retrieve top_k×3 candidates then re-rank with a
                 cross-encoder before trimming to top_k.
    """
    if not INDEX_PATH.exists():
        raise RuntimeError("No FAISS index found. Embed at least one document first.")

    index: faiss.IndexFlatIP = faiss.read_index(str(INDEX_PATH))
    if index.ntotal == 0:
        raise RuntimeError("FAISS index is empty. Embed at least one document first.")

    # Fetch more candidates when re-ranking so the cross-encoder has more to work with
    fetch_k = min(top_k * 3 if rerank else top_k, index.ntotal)

    query_vec = embed_query(query)
    scores, indices = index.search(query_vec, fetch_k)

    faiss_indices = indices[0].tolist()
    similarity_scores = scores[0].tolist()

    # ── fetch metadata from SQLite ───────────────────────────────────────────
    placeholders = ",".join("?" * len(faiss_indices))
    with get_connection() as conn:
        rows = conn.execute(
            f"""
            SELECT faiss_index, chunk_index, source_file, text, char_start, char_end
            FROM chunks
            WHERE faiss_index IN ({placeholders})
            """,
            faiss_indices,
        ).fetchall()

    row_by_faiss = {row["faiss_index"]: row for row in rows}

    chunks: list[RetrievedChunk] = []
    for faiss_idx, score in zip(faiss_indices, similarity_scores):
        if faiss_idx not in row_by_faiss:
            continue
        row = row_by_faiss[faiss_idx]
        chunks.append(RetrievedChunk(
            faiss_index=faiss_idx,
            chunk_index=row["chunk_index"],
            source_file=row["source_file"],
            text=row["text"],
            char_start=row["char_start"],
            char_end=row["char_end"],
            score=round(score, 4),
        ))

    if not rerank:
        return chunks

    # ── Step 3 (optional): cross-encoder re-ranking ──────────────────────────
    return _rerank(query, chunks, top_k)


def _rerank(query: str, chunks: list[RetrievedChunk], top_k: int) -> list[RetrievedChunk]:
    """Score each (query, chunk) pair with a cross-encoder and return top_k."""
    reranker = _get_reranker()
    pairs = [(query, c.text) for c in chunks]
    raw_scores: list[float] = reranker.predict(pairs).tolist()

    for chunk, rs in zip(chunks, raw_scores):
        chunk.rerank_score = round(rs, 4)

    reranked = sorted(chunks, key=lambda c: c.rerank_score, reverse=True)  # type: ignore[arg-type]
    return reranked[:top_k]


# ---------------------------------------------------------------------------
# Step 4+5 — build prompt and stream Ollama response
# ---------------------------------------------------------------------------

def _build_context(chunks: list[RetrievedChunk]) -> str:
    return "\n\n".join(f"[{i + 1}] {c.text}" for i, c in enumerate(chunks))


def stream_answer(
    query: str,
    chunks: list[RetrievedChunk],
    model: str = DEFAULT_MODEL,
) -> Generator[str, None, None]:
    """Yield response tokens from Ollama one at a time."""
    context = _build_context(chunks)
    user_message = f"Context:\n{context}\n\nQuestion: {query}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        "stream": True,
    }

    with httpx.stream("POST", OLLAMA_URL, json=payload, timeout=120.0) as resp:
        if resp.status_code != 200:
            raise RuntimeError(f"Ollama returned {resp.status_code}: {resp.text}")
        for line in resp.iter_lines():
            if not line:
                continue
            data = json.loads(line)
            token = data.get("message", {}).get("content", "")
            if token:
                yield token
            if data.get("done"):
                break
