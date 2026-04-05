"""POST /api/v1/query — full RAG query: retrieve → (optional re-rank) → stream LLM answer."""
import json

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.retrieval import RetrievedChunk, retrieve, stream_answer

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(5, gt=0, le=20)
    model: str = Field("phi3:mini")
    rerank: bool = Field(False, description="Re-rank candidates with a cross-encoder before answering")


class ChunkMeta(BaseModel):
    faiss_index: int
    chunk_index: int
    source_file: str
    text: str
    char_start: int
    char_end: int
    score: float
    rerank_score: float | None = None


class QueryMetaResponse(BaseModel):
    query: str
    reranked: bool
    chunks: list[ChunkMeta]
    answer: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _chunk_meta(c: RetrievedChunk) -> ChunkMeta:
    return ChunkMeta(
        faiss_index=c.faiss_index,
        chunk_index=c.chunk_index,
        source_file=c.source_file,
        text=c.text,
        char_start=c.char_start,
        char_end=c.char_end,
        score=c.score,
        rerank_score=c.rerank_score,
    )


# ---------------------------------------------------------------------------
# Streaming endpoint (for the frontend)
# ---------------------------------------------------------------------------

@router.post("/stream")
def query_stream(req: QueryRequest) -> StreamingResponse:
    """Retrieve chunks and stream the LLM answer as Server-Sent Events."""
    try:
        chunks: list[RetrievedChunk] = retrieve(req.query, top_k=req.top_k, rerank=req.rerank)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    def _event_stream():
        meta = [_chunk_meta(c).model_dump() for c in chunks]
        yield f"event: context\ndata: {json.dumps(meta)}\n\n"

        try:
            for token in stream_answer(req.query, chunks, model=req.model):
                yield f"data: {token}\n\n"
        except RuntimeError as exc:
            yield f"event: error\ndata: {str(exc)}\n\n"

        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(_event_stream(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Sync endpoint (for testing / curl)
# ---------------------------------------------------------------------------

@router.post("", response_model=QueryMetaResponse)
def query_sync(req: QueryRequest) -> QueryMetaResponse:
    """Retrieve chunks and return full answer in one JSON response (no streaming)."""
    try:
        chunks: list[RetrievedChunk] = retrieve(req.query, top_k=req.top_k, rerank=req.rerank)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        answer = "".join(stream_answer(req.query, chunks, model=req.model))
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama is not running. Start it with: ollama serve")

    return QueryMetaResponse(
        query=req.query,
        reranked=req.rerank,
        chunks=[_chunk_meta(c) for c in chunks],
        answer=answer,
    )
