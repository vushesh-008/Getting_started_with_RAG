# Decision: Vector Storage Strategy

**Status:** Decided
**Phase:** Phase 1 — Core RAG Engine

---

## The Core Confusion: FAISS ≠ a Database

FAISS (Facebook AI Similarity Search) is a **similarity search library**, not a database.
It answers one question very fast: *"which stored vectors are closest to this query vector?"*

What FAISS does NOT store: filenames, chunk text, timestamps, or any metadata.
When FAISS returns results, it returns raw integer indices — e.g., `[42, 7, 103]`.
Something else must map those integers back to meaningful content.

---

## The Two Concerns in RAG Storage

| Concern | Question it answers |
|---|---|
| **Vector search** | "Which chunks are semantically similar to this query?" |
| **Metadata registry** | "What is chunk #42? What text does it contain? Which file?" |

These are genuinely separate problems that benefit from separate tools.

---

## Options Evaluated

### Option A: FAISS + SQLite (Complementary) ✅ CHOSEN FOR MVP

**FAISS** handles the vector math:
- Stores high-dimensional float arrays in memory
- Performs approximate nearest-neighbor (ANN) search
- Persists to a `.index` file on disk

**SQLite** handles the metadata registry:
- Maps `faiss_index` integer → chunk text, filename, position
- Queryable, filterable, human-readable
- Zero-dependency, single file on disk

**How they work together:**
```
Query: "What is photosynthesis?"
  ↓
Embed query → [0.12, -0.34, 0.87, ...]
  ↓
FAISS returns → [42, 7, 103]   ← nearest vector indices
  ↓
SQLite: SELECT text FROM chunks WHERE faiss_index IN (42, 7, 103)
  ↓
Retrieve chunk text → pass to LLM as context
```

- **Pros:** No external server, pure Python + file on disk, each layer is transparent and debuggable
- **Cons:** Two things to keep in sync; no built-in metadata filtering on retrieval

---

### Option B: Full Vector Database (ChromaDB / Qdrant / Weaviate / Pinecone)

These combine both concerns — vectors AND metadata — into one system.

```
# One call handles everything, including metadata filters
results = collection.query(
    query_embeddings=[query_vector],
    n_results=5,
    where={"source_file": "paper.pdf"}   # metadata filter at query time
)
```

| Tool | Type | Notes |
|---|---|---|
| ChromaDB | Open source, embedded | Simplest to set up, good for local dev |
| Qdrant | Open source, server | High performance, rich filtering |
| Weaviate | Open source, server | GraphQL interface, production-grade |
| Pinecone | Cloud, managed | Fully hosted, not local |
| Milvus | Open source, server | Enterprise-scale |

- **Pros:** Single system, metadata filtering at query time, production-ready
- **Cons:** Runs as a separate server process; abstracts away the internals (bad for learning)

---

### Option C: SQLite Alone (with sqlite-vec extension)

Modern SQLite has vector search extensions (`sqlite-vec`, `sqlite-vss`) that can store
vectors and do similarity search entirely within SQLite.

- **Pros:** Truly single-file, one system for everything
- **Cons:** Much slower than FAISS for large collections; extension setup is fiddly on Apple Silicon
- **Best for:** Very small datasets where simplicity beats performance

---

## Decision

**MVP: FAISS + SQLite (Option A)**

**Rationale:**
- No external server to manage — entire state is two files (`.index` + `.db`)
- Keeping the layers separate makes each step **visible** in the visualizer:
  - You can show what FAISS returns (raw indices) before SQLite enriches them
  - This is the educational value of the project
- Simple to reason about and debug
- Upgrade path is clean: swap FAISS + SQLite for ChromaDB in one service change

---

## Upgrade Path (v2+)

Once the pipeline is understood and working:

1. **Replace FAISS + SQLite → ChromaDB**
   - Single embedded DB, handles both vectors and metadata
   - Minimal code change: update `services/embedding.py` and `services/retrieval.py`

2. **Or replace with Qdrant**
   - If metadata filtering at query time becomes important
   - (e.g., "search only within this document")

3. **Add HNSW index in FAISS**
   - Currently using flat (exact) index — fine for MVP
   - HNSW is approximate but orders of magnitude faster at scale

The goal of the MVP is to **understand the internals** before letting a higher-level
abstraction hide them.

---

## Index Types in FAISS (For Reference)

| Index Type | How it works | Speed | Accuracy |
|---|---|---|---|
| `IndexFlatL2` | Brute-force exact search | Slow at scale | 100% |
| `IndexFlatIP` | Brute-force, inner product (cosine) | Slow at scale | 100% |
| `IndexHNSWFlat` | Hierarchical Navigable Small World graph | Fast | ~99% |
| `IndexIVFFlat` | Inverted file index (clusters) | Fast | ~95% |

**We use `IndexFlatL2` for MVP** — exact search, no approximation error, simple to reason about.
Switch to `IndexHNSWFlat` in v2 when the dataset grows.
