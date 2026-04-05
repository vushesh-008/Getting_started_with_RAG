"""POST /api/v1/chunk — dry-run chunking preview.

Accepts raw text and chunking parameters; returns the full list of chunks
with positions. Nothing is written to disk or the DB.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.chunking import Chunk, chunk_text

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChunkRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Raw text to chunk")
    chunk_size: int = Field(512, gt=0, description="Max characters per chunk")
    chunk_overlap: int = Field(64, ge=0, description="Overlap characters between chunks")


class ChunkDetail(BaseModel):
    index: int
    text: str
    char_start: int
    char_end: int
    char_count: int


class ChunkStats(BaseModel):
    total_chars: int
    chunk_count: int
    avg_chunk_size: float
    min_chunk_size: int
    max_chunk_size: int


class ChunkResponse(BaseModel):
    chunks: list[ChunkDetail]
    stats: ChunkStats


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("", response_model=ChunkResponse)
def preview_chunks(req: ChunkRequest) -> ChunkResponse:
    """Return a dry-run chunking preview — no data is persisted."""
    results: list[Chunk] = chunk_text(
        text=req.text,
        chunk_size=req.chunk_size,
        chunk_overlap=req.chunk_overlap,
    )

    details = [
        ChunkDetail(
            index=c.index,
            text=c.text,
            char_start=c.char_start,
            char_end=c.char_end,
            char_count=len(c.text),
        )
        for c in results
    ]

    sizes = [d.char_count for d in details] or [0]
    stats = ChunkStats(
        total_chars=len(req.text),
        chunk_count=len(details),
        avg_chunk_size=round(sum(sizes) / len(sizes), 1),
        min_chunk_size=min(sizes),
        max_chunk_size=max(sizes),
    )

    return ChunkResponse(chunks=details, stats=stats)
