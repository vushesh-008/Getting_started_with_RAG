# Decision: LLM Serving & Prompt Construction

**Status:** Decided
**Phase:** Phase 1 — Core RAG Engine

---

## What Happens at Query Time

Once relevant chunks are retrieved from FAISS, they are assembled into a prompt and
sent to a language model. The model reads the context and generates a grounded answer.

```
User query: "How does RAG prevent hallucinations?"
    ↓
Embed query → search FAISS → top-k chunks retrieved from SQLite
    ↓
Assemble prompt:
  [System]  You are a helpful assistant. Answer using only the context below.
  [Context] Chunk 1 text... Chunk 2 text... Chunk 3 text...
  [User]    How does RAG prevent hallucinations?
    ↓
Stream response from LLM → return to client
```

---

## LLM Serving Options

### Ollama ✅ CHOSEN
Runs quantized open-source models locally via a REST API on `localhost:11434`.

- **Pros:** Dead simple to install, manages model downloads, REST API out of the box,
  supports streaming, no Python dependency conflicts
- **Cons:** Must be running as a separate process before the backend starts

**Models available:**
| Model | Size | Best for |
|---|---|---|
| `phi3:mini` | ~2.3 GB | Speed, debugging, low RAM |
| `llama3.2:3b` | ~2.0 GB | Good quality, fast |
| `llama3:8b` | ~4.7 GB | Higher quality reasoning |

**We default to `phi3:mini`** for development speed. Switch to `llama3:8b` for quality.

### llama.cpp (direct)
Run GGUF models directly in Python via `llama-cpp-python`.

- **Pros:** No separate process, tighter integration
- **Cons:** Complex installation on Apple Silicon, manual model management, no streaming
  without extra work

### Hugging Face Transformers (local)
Load models directly via `transformers` + `torch`.

- **Pros:** Widest model selection
- **Cons:** Very high RAM usage (non-quantized), slow without GPU, complex setup

### Cloud APIs (OpenAI, Anthropic, etc.)
- **Ruled out** — breaks the local-only constraint of this project.

---

## Decision

**Use Ollama with `phi3:mini` as default.**

Ollama exposes a `/api/chat` endpoint that accepts messages in OpenAI chat format
and supports streaming via newline-delimited JSON. We call it with `httpx` using a
streaming request.

---

## Prompt Construction

RAG prompts have three parts:

```
SYSTEM:
  You are a helpful assistant. Answer the user's question using ONLY the information
  provided in the context below. If the answer is not in the context, say so honestly.
  Do not make up information.

CONTEXT (injected retrieved chunks):
  [1] <chunk text>
  [2] <chunk text>
  [3] <chunk text>

USER:
  <original query>
```

**Why "answer only from context"?**
Without this instruction, the LLM will blend retrieved context with its own parametric
memory. For a RAG visualizer, we want answers grounded *only* in what was retrieved —
this makes the X-Ray panel (showing which chunks were used) trustworthy.

**Why numbered chunks?**
Makes it easy to extend to citations: `[1]` in the answer maps directly to chunk index 1.

---

## Streaming

We stream the LLM response token-by-token using Server-Sent Events (SSE). This means:
- The client sees tokens as they arrive rather than waiting for the full response
- The UI can update progressively (typewriter effect)
- FastAPI's `StreamingResponse` handles this natively

Ollama's streaming format:
```json
{"model":"phi3:mini","message":{"role":"assistant","content":"The "},"done":false}
{"model":"phi3:mini","message":{"role":"assistant","content":"answer "},"done":false}
{"model":"phi3:mini","message":{"role":"assistant","content":"is..."},"done":true}
```

We extract `message.content` from each line and yield it as an SSE chunk.

---

## Prerequisite

Ollama must be installed and the model pulled before using the query endpoint:

```bash
# Install Ollama (if not already)
brew install ollama

# Pull the default model
ollama pull phi3:mini

# Start Ollama (runs on localhost:11434)
ollama serve
```
