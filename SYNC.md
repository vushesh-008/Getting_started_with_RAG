# SYNC.md — Current Project State

This file tracks what phase we are in, what is done, and what comes next.
Update this after every session.

---

## Current Phase

**Phase 1 — Core RAG Engine (Backend)**

---

## Completed

- [x] `implementation_plan.md` — full system blueprint
- [x] `CLAUDE.md` — standing instructions for Claude Code
- [x] `docs/decisions/chunking_strategy.md` — chunking research + decision

---

## In Progress

- [ ] Backend project structure
- [ ] `services/chunking.py` — Recursive Character Text Splitter
- [ ] `services/ingestion.py` — text extraction (txt first, then pdf)
- [ ] `db/database.py` — SQLite schema + init
- [ ] `api/v1/chunk.py` — `/api/v1/chunk` endpoint (dry-run preview)
- [ ] `api/v1/ingest.py` — `/api/v1/ingest` endpoint
- [ ] `services/embedding.py` — sentence-transformers + FAISS indexing
- [ ] `api/v1/embed.py` — `/api/v1/embed` endpoint
- [ ] `services/retrieval.py` — semantic search + Ollama streaming
- [ ] `api/v1/query.py` — `/api/v1/query` endpoint
- [ ] `main.py` — FastAPI app wiring everything together

---

## Next Up (Phase 2)

- [ ] Frontend: Next.js 15 + Material UI setup
- [ ] Chunking Heatmap visualization
- [ ] Vector Space Canvas (2D, D3.js)
- [ ] Index Registry table
- [ ] LLM X-Ray panel

---

## Key Decisions Made

| Topic | Decision | Doc |
|---|---|---|
| Chunking strategy | Recursive Character Splitter (default), switchable via API | `docs/decisions/chunking_strategy.md` |
| Vector storage | FAISS (vector search) + SQLite (metadata registry) for MVP | `docs/decisions/vector_store.md` |
| Embedding model | all-MiniLM-L6-v2, cosine similarity, 384 dims | `docs/decisions/embedding_model.md` |
| Database | Single global SQLite (no workspaces for MVP) | `CLAUDE.md` |
| First file type | `.txt` first, then `.pdf` | `CLAUDE.md` |
