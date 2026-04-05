# Decision: Re-ranking Strategy

**Status:** Decided
**Phase:** Phase 1 — Core RAG Engine (added before frontend)

---

## The Problem with Bi-Encoder Retrieval Alone

The initial FAISS search uses a **bi-encoder** (MiniLM) — the query and each chunk are
embedded *independently*, then compared by vector distance. This is fast, but the model
never sees the query and chunk together, so subtle relevance signals are missed.

Example failure case:
```
Query:   "What causes memory leaks in Python?"
Chunk A: "Python memory management uses reference counting..."  ← retrieved (keyword overlap)
Chunk B: "Circular references prevent garbage collection..."   ← not retrieved (different words, same meaning)
```

The bi-encoder may rank Chunk A above Chunk B even though Chunk B is more directly useful.

---

## What a Cross-Encoder Does

A **cross-encoder** takes the full `(query, chunk)` pair as a single input and outputs
a direct relevance score. Because both texts are processed together, the model can
model fine-grained interactions between them.

```
bi-encoder:    embed(query)  •  embed(chunk)  →  cosine score
cross-encoder: encode(query + chunk)          →  relevance score
```

**Trade-off:** Much more accurate, but ~10-50x slower because a separate forward pass
is needed for every `(query, chunk)` pair.

---

## The Two-Stage Pipeline

Re-ranking is always paired with an initial fast retrieval step:

```
Stage 1 — Recall (bi-encoder, fast):
  Retrieve top-N candidates from FAISS  (N = top_k × 3, e.g. 15)

Stage 2 — Precision (cross-encoder, slower):
  Score each (query, candidate) pair
  Sort by cross-encoder score
  Return top-k (e.g. 5)
```

Stage 1 casts a wide net. Stage 2 refines the ranking. You never run the cross-encoder
over the entire corpus — only over the small candidate set from Stage 1.

---

## Model Chosen

**`cross-encoder/ms-marco-MiniLM-L-6-v2`**

- **Size:** ~85 MB
- **Speed:** ~50ms for 15 pairs on M1 CPU
- **Quality:** Strong on passage relevance tasks
- **Source:** Sentence Transformers (Hugging Face)
- **Output:** Raw logit score — higher = more relevant (no fixed range)

---

## Decision

**Implement re-ranking as an optional step, off by default.**

`POST /api/v1/query` accepts `"rerank": true` to enable it.

**Why optional?**
- Small corpora (< 100 chunks): FAISS already finds the right results; re-ranking adds
  latency with no meaningful gain
- Large corpora or mixed documents: re-ranking significantly improves precision
- The frontend will show **both** FAISS scores and re-rank scores side-by-side —
  making the improvement (or lack thereof) visible to the user

**Why build it before the frontend?**
The query API response shape includes `rerank_score` on each chunk. Adding this later
would require changing the API contract, breaking any frontend code already built.

---

## Educational Value for the Visualizer

This is one of the most instructive parts of the pipeline. Users can:
1. Submit a query with `rerank: false` → see the FAISS ranking
2. Submit the same query with `rerank: true` → see how the order changes
3. Understand *why* a chunk moved up or down (the cross-encoder saw context the
   bi-encoder missed)
