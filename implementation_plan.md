# Implementation Plan: Local RAG Pipeline Visualizer

This document serves as the master blueprint for building a local, fully interactive platform that visualizes every step of the Retrieval-Augmented Generation (RAG) process. The goal is to create an educational and debugging tool that acts like an "X-ray" for LLM applications.

## 1. System Architecture & Hardware Strategy

> [!IMPORTANT]
> **Hardware Target:** Apple Silicon (M1 Pro, 16GB RAM)
> - **Performance:** The M1 Pro is highly capable of running quantized LLMs and lightweight embedding models smoothly.
> - **Embeddings Engine:** `sentence-transformers/all-MiniLM-L6-v2` or `bge-small-en-v1.5` (Fast, low memory overhead).
> - **Generation Engine:** **Ollama** will serve as the local inference runner.
>   - *Testing/Speed:* `phi-3:mini` (Excellent for rapid debugging).
>   - *High-Quality Reasoning:* `llama3:8b` (Quantized).
> - **Vector Persistence:** We will persist vectors using **FAISS .index files** and metadata/chunks using **SQLite3**. This ensures data survives app restarts.

---

## 2. Execution Strategy: Backend-First

We will adopt a **Backend-First ("Engine First")** approach. Before wiring up a beautiful UI, we must build the core engine capable of parsing, chunking, and embedding documents.

### Phase 1: Core RAG Engine (Python / FastAPI)
The Python backend acts as the orchestrator for all document processing and model inference.

*   **Framework:** FastAPI (for fast, asynchronous endpoints).
*   **Key Responsibilities:**
    *   **Ingestion:** Accept file uploads (PDF, TXT, DOCX) and extract raw text using tools like `PyMuPDF`.
    *   **Chunking Logic:** Splitting text with configurable `chunk_size` and `chunk_overlap`.
    *   **Indexing:** Generating embeddings and maintaining the FAISS index + SQLite chunk registry.
    *   **Querying:** Hybrid search (Semantic + Keyword) and cross-encoder re-ranking.
*   **Endpoints:**
    *   `POST /api/v1/ingest`: Uploads file, returns extraction metrics.
    *   `POST /api/v1/chunk`: Previews how text will be split.
    *   `POST /api/v1/embed`: Commits chunks to FAISS and SQLite.
    *   `POST /api/v1/query`: Runs the full "Read" path, returning context, re-rankings, and stream response.

### Phase 2: Interactive Dashboard (Next.js / React / MUI)
A highly polished, interactive interface that allows users to "see" the data transformations.

*   **Framework:** Next.js 15 (App Router).
*   **Styling & UI:** Material UI (v6) configured with `AppRouterCacheProvider` for SSR compatibility. We will enforce a premium Dark Mode/Glassmorphism theme.
*   **Core Visual Components:**
    1.  **The Extraction View:** Side-by-side view of original document vs. parsed text.
    2.  **The Chunking Heatmap:** Visual representation of text blocks, highlighting where overlapping occurs.
    3.  **The Vector Space Canvas:** A 2D plot (using D3.js or Recharts initially, upgrading to Three.js for 3D later) mapping out all chunks as dots.
    4.  **The Index Registry:** A data table linking `Chunk ID` -> `Vector Index` -> `Preview Text` -> `High-Dimensional Vector Strip`.
    5.  **The LLM X-Ray:** Showing the exact Prompt Injection (System Prompt + Augmented Context + User Query) before generation begins.
*   **Interactivity:** Hovering over a dot in the Vector Canvas highlights the corresponding chunk in the Index Registry and Heatmap simultaneously.

---

## 3. Workflow & AI Collaboration Rules

To ensure a smooth build process involving both human and multiple AI assistants (Claude / Antigravity):

1.  **State Management (`SYNC.md`):** A living markdown file will be maintained at the root of the project. It will track the current phase, completed tasks, and upcoming goals. This ensures context is not lost between sessions.
2.  **Atomic Commits:** Code will be committed to Git after every functional milestone (e.g., "feat: implement fastapi chunking endpoint"). This provides safety nets to rollback broken logic.
3.  **Incremental Complexity:** We start with a Minimum Viable Product (MVP).
    *   *MVP:* Basic text upload, simple FAISS flat index, 2D D3.js visualization, standard prompt chaining.
    *   *v2:* PDF extraction, HNSW indexing, 3D Three.js Vector Space, Cross-Encoder Re-ranking.

---

## 4. Open Questions for User

> [!WARNING]
> Please confirm the following before we begin:
> 1. **Project Management:** For the persistence layer, should we implement "Workspaces" so you can have multiple different document clusters separated, or just one global database for simplicity at the start?
> 2. **Initial Document Type:** For the very first test, do you want to focus exclusively on `.txt` files to validate the pipeline, then move to `.pdf`, or start with `.pdf` right away?

## 5. Verification Plan

*   **Backend Validation:** Run `pytest` scripts to ensure chunking math (overlaps, token counts) is exactly correct before visualization.
*   **Frontend Validation:** Ensure the `VectorSpaceCanvas` correctly plots coordinates generated from `UMAP/t-SNE` dimension reduction algorithms.
*   **E2E Test:** Upload a test document, search for a highly specific term, visually verify it lights up in the Vector Space Canvas, and watch Ollama generate an answer citing that specific chunk.
