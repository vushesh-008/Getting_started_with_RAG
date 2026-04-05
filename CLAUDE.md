# CLAUDE.md — RAG Pipeline Visualizer

This file is loaded automatically by Claude Code. It contains standing instructions,
architecture decisions, and workflow rules for this project. Do not put transient
state here — use SYNC.md for that.

---

## What This Project Is

A **local, fully interactive RAG Pipeline Visualizer** — an educational and debugging tool
that acts as an "X-ray" for LLM applications. Users can upload documents and visually
watch every step of the RAG process: extraction → chunking → embedding → retrieval → generation.

---

## Hardware Target

Apple Silicon M1 Pro, 16 GB RAM. All models run locally — no external API calls for
inference. Ollama manages local LLM serving.

---

## Tech Stack (and Why)

| Layer | Choice | Why |
|---|---|---|
| Backend | FastAPI | Async, fast, auto-docs via OpenAPI |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` | Fast, low memory, good quality for English |
| Vector Store | FAISS (flat index → HNSW in v2) | Local, no server, easy to persist as `.index` file |
| Chunk Registry | SQLite3 | Zero-dependency, survives restarts, queryable |
| LLM Inference | Ollama (`phi-3:mini` for speed, `llama3:8b` for quality) | Fully local, easy model switching |
| Frontend | Next.js 15 (App Router) + Material UI v6 | SSR, strong ecosystem, MUI for fast polished UI |
| Visualization | D3.js / Recharts → Three.js (v2) | Progressive complexity |

---

## Architecture Rules

- **Backend-first.** The Python engine must work correctly before any UI is built.
- **No mocks for the vector store or SQLite.** Tests must hit real instances.
- **Atomic commits.** Commit after every functional milestone (e.g., `feat: chunking endpoint`).
- **Incremental complexity.** MVP first, then v2 enhancements.
- **Single global database** for MVP. No workspace isolation until v2.

---

## Project Structure

```
Getting_started_with_RAG/
├── backend/
│   ├── api/v1/          # FastAPI route handlers
│   ├── services/        # Core logic (ingestion, chunking, embedding, retrieval)
│   ├── db/              # SQLite schema + connection helpers
│   ├── data/            # FAISS .index files + chunks.db (gitignored)
│   └── main.py          # FastAPI app entrypoint
├── frontend/            # Next.js 15 app (Phase 2)
├── docs/
│   └── decisions/       # One file per concept: what we learned + what we decided
├── CLAUDE.md            # This file
├── SYNC.md              # Current phase, completed tasks, next goals
└── implementation_plan.md
```

---

## API Endpoints (Phase 1)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/ingest` | Upload file, extract raw text, return metrics |
| `POST` | `/api/v1/chunk` | Preview chunking (dry-run, no DB write) |
| `POST` | `/api/v1/embed` | Commit chunks → FAISS + SQLite |
| `POST` | `/api/v1/query` | Full RAG query: retrieve → re-rank → stream LLM answer |

---

## Coding Style

- Python 3.11+. Always use type hints.
- Prefer `dataclasses` over plain dicts for structured data.
- No unnecessary abstractions — don't build for hypothetical requirements.
- No error handling for impossible cases — trust FastAPI/Pydantic validation.
- Keep route handlers thin; all logic lives in `services/`.

---

## Current Phase

See `SYNC.md`.

---

## Key Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Run tests (when added)
pytest tests/
```

---

## Docs Convention

Every significant technical decision gets a file in `docs/decisions/`.
Format: research summary → options considered → decision + rationale.
This prevents re-litigating decisions and gives Claude context in future sessions.
