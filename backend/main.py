"""FastAPI application entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import init_db
from api.v1 import chunk as chunk_router
from api.v1 import embed as embed_router
from api.v1 import ingest as ingest_router
from api.v1 import query as query_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Run startup/shutdown tasks."""
    init_db()
    yield


app = FastAPI(
    title="RAG Pipeline Visualizer",
    description="Local RAG engine — ingest, chunk, embed, query.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router.router, prefix="/api/v1/ingest", tags=["ingestion"])
app.include_router(chunk_router.router,  prefix="/api/v1/chunk",  tags=["chunking"])
app.include_router(embed_router.router,  prefix="/api/v1/embed",  tags=["embedding"])
app.include_router(query_router.router,  prefix="/api/v1/query",  tags=["query"])
