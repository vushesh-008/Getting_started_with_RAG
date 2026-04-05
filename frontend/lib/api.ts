/**
 * Typed fetch wrappers for the FastAPI backend.
 * All requests target http://127.0.0.1:8000 (local dev).
 */

const BASE = "http://127.0.0.1:8000";

// ── Types (mirror backend Pydantic schemas) ────────────────────────────────

export interface ChunkDetail {
  index: number;
  text: string;
  char_start: number;
  char_end: number;
  char_count: number;
}

export interface ChunkStats {
  total_chars: number;
  chunk_count: number;
  avg_chunk_size: number;
  min_chunk_size: number;
  max_chunk_size: number;
}

export interface ChunkResponse {
  chunks: ChunkDetail[];
  stats: ChunkStats;
}

export interface IngestResponse {
  filename: string;
  char_count: number;
  line_count: number;
  preview: string;
}

export interface EmbedResponse {
  filename: string;
  chunks_stored: number;
  faiss_index_start: number;
  faiss_index_end: number;
  total_vectors_in_index: number;
}

// ── Endpoints ─────────────────────────────────────────────────────────────

export async function ingestFile(file: File): Promise<IngestResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/v1/ingest`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function previewChunks(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): Promise<ChunkResponse> {
  const res = await fetch(`${BASE}/api/v1/chunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, chunk_size: chunkSize, chunk_overlap: chunkOverlap }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface ChunkMeta {
  faiss_index: number;
  chunk_index: number;
  source_file: string;
  text: string;
  char_start: number;
  char_end: number;
  score: number;
  rerank_score: number | null;
}

/**
 * Stream a RAG query via SSE from POST /api/v1/query/stream.
 * Returns a cancel function — call it to abort the request.
 *
 * Event sequence from backend:
 *   event: context  data: ChunkMeta[]   ← retrieved chunks (before any tokens)
 *   data: {token}                        ← repeated N times
 *   event: done     data: [DONE]
 */
export function streamQuery(
  query: string,
  topK: number,
  rerank: boolean,
  model: string,
  onContext: (chunks: ChunkMeta[]) => void,
  onToken: (token: string) => void,
  onDone: () => void,
  onError?: (msg: string) => void,
): () => void {
  let cancelled = false;

  (async () => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/v1/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_k: topK, rerank, model }),
      });
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Network error");
      return;
    }

    if (!res.ok || !res.body) {
      onError?.(`Server error ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "message";

    while (!cancelled) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!; // keep incomplete last line

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          // SSE spec: strip exactly one leading space after "data:" — do NOT trim further
          // or token whitespace (spaces between words) gets silently dropped.
          const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
          if (currentEvent === "context") {
            onContext(JSON.parse(data));
          } else if (currentEvent === "done") {
            onDone();
            return;
          } else if (currentEvent === "error") {
            onError?.(data);
            return;
          } else if (data && data !== "[DONE]") {
            onToken(data);
          }
          currentEvent = "message"; // reset after each data line
        }
      }
    }
  })();

  return () => { cancelled = true; };
}

export async function embedDocument(
  filename: string,
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): Promise<EmbedResponse> {
  const res = await fetch(`${BASE}/api/v1/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, text, chunk_size: chunkSize, chunk_overlap: chunkOverlap }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
