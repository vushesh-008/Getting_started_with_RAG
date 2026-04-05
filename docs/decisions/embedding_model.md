# Decision: Embedding Model

**Status:** Decided
**Phase:** Phase 1 — Core RAG Engine

---

## What Are Embeddings?

An embedding is a dense vector of floating-point numbers that represents the *meaning*
of a piece of text. Two sentences that mean similar things produce vectors that are
close together in high-dimensional space.

```
"The cat sat on the mat"   →  [0.12, -0.34, 0.87, 0.05, ...]  (384 dimensions)
"A feline rested on a rug" →  [0.11, -0.31, 0.85, 0.06, ...]  (very close!)
"Quantum physics is hard"  →  [-0.72, 0.44, -0.21, 0.93, ...] (far away)
```

This is what makes semantic search possible — instead of matching keywords, we match
*meaning*. A query about "car engine problems" will retrieve chunks about
"automobile motor failures" even if no words overlap.

---

## How Embeddings Are Generated

A transformer model (encoder-only, like BERT) reads the text and outputs a fixed-size
vector regardless of input length. The model has been trained on large corpora with
contrastive learning — similar sentences are pulled closer, dissimilar ones pushed apart.

The same model must be used for both indexing and querying. Mixing models produces
incompatible vector spaces and broken retrieval.

---

## Models Evaluated

### all-MiniLM-L6-v2 ✅ CHOSEN
- **Dimensions:** 384
- **Max tokens:** 256
- **Size:** ~90 MB
- **Speed:** Very fast (~14k sentences/sec on CPU)
- **Quality:** Strong for English general-purpose retrieval
- **Source:** Sentence Transformers (Hugging Face)

### bge-small-en-v1.5
- **Dimensions:** 384
- **Max tokens:** 512
- **Size:** ~130 MB
- **Speed:** Fast
- **Quality:** Slightly better than MiniLM on BEIR benchmarks
- **Note:** Good alternative if MiniLM quality proves insufficient

### all-mpnet-base-v2
- **Dimensions:** 768
- **Max tokens:** 384
- **Size:** ~420 MB
- **Speed:** ~2.8k sentences/sec on CPU — significantly slower
- **Quality:** Higher quality, better for nuanced retrieval
- **Note:** Good v2 upgrade if MiniLM misses subtle matches

### text-embedding-3-small (OpenAI)
- **Dimensions:** 1536
- **Max tokens:** 8191
- **Size:** Cloud API
- **Speed:** Network-bound
- **Quality:** Excellent
- **Note:** Ruled out — requires internet + API key, breaks local-only constraint

### nomic-embed-text (via Ollama)
- **Dimensions:** 768
- **Max tokens:** 8192
- **Size:** ~274 MB via Ollama
- **Quality:** Strong, long context
- **Note:** Good v2 option — keeps everything in Ollama

---

## Decision

**Use `sentence-transformers/all-MiniLM-L6-v2`**

**Rationale:**
- Fits entirely in RAM on M1 Pro (90 MB)
- Fast enough to embed hundreds of chunks in seconds locally
- 384 dimensions keeps FAISS index small
- Well-documented, widely used, reliable baseline
- Swap path to `bge-small` or `mpnet` is a one-line change

**Upgrade path (v2):** Switch to `nomic-embed-text` via Ollama to consolidate all
model serving under one tool, and gain longer context support (8192 tokens vs 256).

---

## Similarity Metric

We use **cosine similarity** (inner product on normalised vectors) rather than
Euclidean distance (L2).

**Why cosine over L2?**
- Cosine measures the *angle* between vectors — it cares about direction, not magnitude
- Two chunks saying the same thing in different lengths produce similar angles but
  different magnitudes — cosine handles this correctly, L2 does not
- `all-MiniLM-L6-v2` is trained with cosine similarity — using L2 gives suboptimal results

In FAISS, cosine similarity is implemented by:
1. L2-normalising all vectors before inserting
2. Using `IndexFlatIP` (inner product) — on normalised vectors, inner product == cosine

---

## Chunking ↔ Embedding Interaction

Our `chunk_size=512` chars ≈ 100–130 tokens for English text.
MiniLM's max is 256 tokens — we are safely within limits.

If chunks exceed 256 tokens, the model silently truncates them.
This is another reason to keep chunk_size bounded.
