"""POST /api/v1/embed — chunk + embed a previously ingested file and persist to FAISS + SQLite.

Accepts the raw text (from the ingest step) plus chunking params.
Chunks the text, generates embeddings, writes to FAISS index and SQLite.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from db.database import get_connection
from services.chunking import chunk_text
from services.embedding import EmbedResult, embed_and_store

router = APIRouter()


class EmbedRequest(BaseModel):
    filename: str = Field(..., description="Original filename — used as the source key in SQLite")
    text: str = Field(..., min_length=1, description="Raw extracted text to embed")
    chunk_size: int = Field(512, gt=0)
    chunk_overlap: int = Field(64, ge=0)


class EmbedResponse(BaseModel):
    filename: str
    chunks_stored: int
    faiss_index_start: int
    faiss_index_end: int
    total_vectors_in_index: int


@router.post("", response_model=EmbedResponse)
def embed_file(req: EmbedRequest) -> EmbedResponse:
    """Chunk the provided text, embed it, and persist to FAISS + SQLite."""
    chunks = chunk_text(req.text, chunk_size=req.chunk_size, chunk_overlap=req.chunk_overlap)

    result: EmbedResult = embed_and_store(chunks, source_file=req.filename)

    # Record document-level summary in SQLite
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO documents (filename, char_count, chunk_count)
            VALUES (?, ?, ?)
            """,
            (req.filename, len(req.text), result.chunks_stored),
        )
        conn.commit()

    # Count total vectors now in the index
    from services.embedding import _load_or_create_index
    total = _load_or_create_index().ntotal

    return EmbedResponse(
        filename=req.filename,
        chunks_stored=result.chunks_stored,
        faiss_index_start=result.faiss_index_start,
        faiss_index_end=result.faiss_index_end,
        total_vectors_in_index=total,
    )
