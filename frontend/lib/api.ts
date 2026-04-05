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
