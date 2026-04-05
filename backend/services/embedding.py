"""Embedding service — encodes text chunks and manages the FAISS index.

Model:   sentence-transformers/all-MiniLM-L6-v2
         384-dimensional vectors, cosine similarity via normalised IndexFlatIP.

See docs/decisions/embedding_model.md for full rationale.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from db.database import get_connection
from services.chunking import Chunk

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent.parent / "data"
INDEX_PATH = DATA_DIR / "vectors.index"

# ---------------------------------------------------------------------------
# Model (loaded once, reused for every request)
# ---------------------------------------------------------------------------

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _model


# ---------------------------------------------------------------------------
# FAISS index helpers
# ---------------------------------------------------------------------------

DIMS = 384  # all-MiniLM-L6-v2 output dimensions


def _load_or_create_index() -> faiss.IndexFlatIP:
    """Load existing FAISS index from disk, or create a fresh one."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if INDEX_PATH.exists():
        return faiss.read_index(str(INDEX_PATH))
    return faiss.IndexFlatIP(DIMS)  # inner product on L2-normed vectors == cosine


def _save_index(index: faiss.IndexFlatIP) -> None:
    faiss.write_index(index, str(INDEX_PATH))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@dataclass
class EmbedResult:
    source_file: str
    chunks_stored: int
    faiss_index_start: int  # first FAISS index assigned in this batch
    faiss_index_end: int    # last FAISS index assigned in this batch


def embed_and_store(chunks: list[Chunk], source_file: str) -> EmbedResult:
    """Embed *chunks* and persist them to FAISS + SQLite.

    Args:
        chunks:      Output from services.chunking.chunk_text().
        source_file: Original filename — stored in SQLite for retrieval.

    Returns:
        EmbedResult with counts and index range.
    """
    if not chunks:
        raise ValueError("No chunks provided")

    model = _get_model()
    index = _load_or_create_index()

    # ── 1. Generate embeddings ───────────────────────────────────────────────
    texts = [c.text for c in chunks]
    vectors: np.ndarray = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,   # L2-norm → inner product == cosine
        show_progress_bar=False,
    ).astype("float32")

    # ── 2. Write to FAISS ────────────────────────────────────────────────────
    faiss_start = index.ntotal          # next available index before insert
    index.add(vectors)                  # appends; indices are faiss_start … faiss_start+n-1
    _save_index(index)

    # ── 3. Write to SQLite chunk registry ────────────────────────────────────
    rows = [
        (
            faiss_start + i,       # faiss_index
            source_file,
            chunk.index,           # position within this document
            chunk.text,
            chunk.char_start,
            chunk.char_end,
        )
        for i, chunk in enumerate(chunks)
    ]

    with get_connection() as conn:
        conn.executemany(
            """
            INSERT INTO chunks (faiss_index, source_file, chunk_index, text, char_start, char_end)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        conn.commit()

    return EmbedResult(
        source_file=source_file,
        chunks_stored=len(chunks),
        faiss_index_start=faiss_start,
        faiss_index_end=faiss_start + len(chunks) - 1,
    )


def embed_query(query: str) -> np.ndarray:
    """Embed a single query string. Returns a normalised (1, 384) float32 array."""
    model = _get_model()
    vector: np.ndarray = model.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).astype("float32")
    return vector
