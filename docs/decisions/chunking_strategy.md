# Decision: Text Chunking Strategy

**Status:** Decided
**Phase:** Phase 1 — Core RAG Engine

---

## What is Chunking?

Before text can be embedded and stored in a vector database, it must be split into
smaller pieces called **chunks**. The LLM's context window is finite, so when a user
queries, we retrieve only the most relevant chunks — not the entire document.

Chunking quality directly determines retrieval quality. Poor chunking = poor answers.

---

## Strategies Evaluated

### 1. Fixed-size / Sliding Window
Split every N characters with an overlap of M characters.

```
[----chunk 1----]
         [----chunk 2----]
                  [----chunk 3----]
```

- **Pros:** Simple, predictable, fast, easy to visualize
- **Cons:** Cuts mid-sentence or mid-word; semantic meaning bleeds across boundaries
- **Best for:** Quick prototyping, highly uniform text (e.g., logs)

---

### 2. Recursive Character Text Splitter ✅ CHOSEN
Try splitting on decreasing levels of granularity:
`\n\n` (paragraphs) → `\n` (lines) → `. ` (sentences) → ` ` (words) → char

If a paragraph fits within `chunk_size`, it stays whole. Only falls back to finer
splits when the current piece is still too large.

```
Try \n\n first:
  [    Paragraph 1    ] [    Paragraph 2    ] [  Para 3 is huge... ]
                                               ↓ try \n
                                              [Line A][Line B][Line C...]
```

- **Pros:** Respects natural text boundaries, still size-bounded, widely proven
- **Cons:** Slightly more complex logic than fixed-size
- **Best for:** General-purpose documents (articles, reports, books)

---

### 3. Sentence-based
Split strictly on sentence-ending punctuation (`.`, `?`, `!`) using NLTK or spaCy.

- **Pros:** Very high semantic coherence per chunk
- **Cons:** Chunk sizes vary wildly; a one-line sentence and a 10-line sentence get equal weight
- **Best for:** Dialogue, QA datasets, short-form content

---

### 4. Semantic Chunking
Embed each sentence independently. Compute cosine similarity between adjacent sentences.
Split where similarity drops below a threshold (topic shift).

- **Pros:** Best quality; topic-aware; chunks are genuinely self-contained ideas
- **Cons:** Requires a full embedding pass before chunking; slow; expensive
- **Best for:** High-quality production RAG where latency is acceptable

---

### 5. Paragraph-based
Split on `\n\n` only.

- **Pros:** Preserves document structure perfectly
- **Cons:** Chunk sizes are completely uncontrolled; one paragraph could be 10 words, another 2000
- **Best for:** Structured docs with consistent paragraph lengths

---

### 6. Token-based
Count tokens (via `tiktoken`) instead of characters. Respects LLM context limits exactly.

- **Pros:** Precise; no risk of exceeding model context window
- **Cons:** Adds tokenizer dependency; still ignores semantic boundaries
- **Best for:** When you need guaranteed token-count precision for a specific model

---

## Decision

**Use Recursive Character Text Splitter as the default strategy.**

**Rationale:**
- Best balance of quality and simplicity for general documents
- Respects natural text boundaries without requiring NLP models
- What LangChain popularized — well-understood and battle-tested
- Our default parameters: `chunk_size=512`, `chunk_overlap=64` characters

**Additionally:**
Since this is an **educational visualizer**, the `/api/v1/chunk` endpoint will accept a
`strategy` parameter so users can switch between strategies and visually compare results
in the Chunking Heatmap. This turns chunking from a black box into a teaching tool.

---

## Parameters Explained

| Parameter | Default | Meaning |
|---|---|---|
| `chunk_size` | 512 | Max characters per chunk |
| `chunk_overlap` | 64 | Characters shared between consecutive chunks (prevents context loss at boundaries) |

**Why overlap?** Without it, a sentence split across a chunk boundary loses context on
both sides. Overlap ensures each chunk has a "warm-up" from the previous one.

**Why 512 chars?** Roughly 100–130 tokens for English text — a comfortable fit for
`all-MiniLM-L6-v2` (max 256 tokens) while leaving room for meaningful content.

---

## Future (v2)

- Expose semantic chunking as an option (with a performance warning in the UI)
- Add token-based chunking for precise model compatibility
- Visualize the difference between strategies side-by-side in the Chunking Heatmap
