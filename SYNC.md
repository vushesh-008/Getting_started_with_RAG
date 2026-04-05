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

## Phase 1 — COMPLETE ✅ (+ re-ranking)

- [x] Backend project structure + uv setup (Python 3.12)
- [x] `services/chunking.py` — Recursive Character Text Splitter
- [x] `services/ingestion.py` — text extraction (.txt + .pdf)
- [x] `db/database.py` — SQLite schema + init
- [x] `api/v1/chunk.py` — `/api/v1/chunk` dry-run preview
- [x] `api/v1/ingest.py` — `/api/v1/ingest` file upload
- [x] `services/embedding.py` — MiniLM + FAISS IndexFlatIP (cosine)
- [x] `api/v1/embed.py` — `/api/v1/embed` chunk + store
- [x] `services/retrieval.py` — FAISS search + Ollama streaming
- [x] `api/v1/query.py` — `/api/v1/query` full RAG pipeline
- [x] `main.py` — FastAPI app, all routers wired
- [x] Tested end-to-end with sample.txt + phi3:mini
- [x] Optional cross-encoder re-ranking (ms-marco-MiniLM-L-6-v2, rerank=True flag)

---

## Known Issues / Tech Debt
- [ ] PDF full-text extraction: frontend currently uses `file.text()` (breaks on binary PDFs). Fix: use `extractedText` from `/api/v1/ingest` response body (backend already handles PDF via PyMuPDF), then fetch full text via a new `/api/v1/ingest/text` endpoint or return full text in the ingest response.

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
