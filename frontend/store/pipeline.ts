/**
 * Global pipeline state — drives all four modules on both pages.
 * See docs/frontend_spec.md for the full state slice definitions.
 */
import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────────────────────

export type ActiveStep = "UPLOAD" | "CHUNKING" | "EMBEDDING" | "QUERYING";

export interface PipelineHealth {
  throughput: number;   // GB/hr (display only)
  vectorCount: number;  // total vectors in FAISS index
  activeNodes: number;
}

export interface ChunkConfig {
  strategy: "recursive" | "fixed" | "semantic";
  chunkSize: number;      // characters
  chunkOverlap: number;   // characters
}

export interface ChunkDetail {
  index: number;
  text: string;
  char_start: number;
  char_end: number;
  char_count: number;
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

// ── Store ──────────────────────────────────────────────────────────────────

interface PipelineStore {
  // ── Pipeline status ──────────────────────────────────────────────────────
  isProcessing: boolean;
  activeStep: ActiveStep;
  pipelineHealth: PipelineHealth;

  // ── Ingestion ────────────────────────────────────────────────────────────
  rawFile: File | null;
  extractedText: string;
  chunkConfig: ChunkConfig;
  previewChunks: ChunkDetail[];

  // ── Retrieval ────────────────────────────────────────────────────────────
  currentQuery: string;
  hydeTarget: string;
  vectorMatches: ChunkMeta[];
  rerankedMatches: ChunkMeta[];
  streamingAnswer: string;

  // ── Actions ──────────────────────────────────────────────────────────────
  setIsProcessing: (v: boolean) => void;
  setActiveStep: (step: ActiveStep) => void;
  setPipelineHealth: (h: Partial<PipelineHealth>) => void;

  setRawFile: (file: File | null) => void;
  setExtractedText: (text: string) => void;
  setChunkConfig: (config: Partial<ChunkConfig>) => void;
  setPreviewChunks: (chunks: ChunkDetail[]) => void;

  setCurrentQuery: (q: string) => void;
  setVectorMatches: (chunks: ChunkMeta[]) => void;
  setRerankedMatches: (chunks: ChunkMeta[]) => void;
  appendStreamingAnswer: (token: string) => void;
  resetStreamingAnswer: () => void;
}

export const usePipelineStore = create<PipelineStore>((set) => ({
  // ── Defaults ─────────────────────────────────────────────────────────────
  isProcessing: false,
  activeStep: "UPLOAD",
  pipelineHealth: { throughput: 0, vectorCount: 0, activeNodes: 0 },

  rawFile: null,
  extractedText: "",
  chunkConfig: { strategy: "recursive", chunkSize: 512, chunkOverlap: 64 },
  previewChunks: [],

  currentQuery: "",
  hydeTarget: "",
  vectorMatches: [],
  rerankedMatches: [],
  streamingAnswer: "",

  // ── Setters ───────────────────────────────────────────────────────────────
  setIsProcessing: (v) => set({ isProcessing: v }),
  setActiveStep: (step) => set({ activeStep: step }),
  setPipelineHealth: (h) =>
    set((s) => ({ pipelineHealth: { ...s.pipelineHealth, ...h } })),

  setRawFile: (file) => set({ rawFile: file }),
  setExtractedText: (text) => set({ extractedText: text }),
  setChunkConfig: (config) =>
    set((s) => ({ chunkConfig: { ...s.chunkConfig, ...config } })),
  setPreviewChunks: (chunks) => set({ previewChunks: chunks }),

  setCurrentQuery: (q) => set({ currentQuery: q }),
  setVectorMatches: (chunks) => set({ vectorMatches: chunks }),
  setRerankedMatches: (chunks) => set({ rerankedMatches: chunks }),
  appendStreamingAnswer: (token) =>
    set((s) => ({ streamingAnswer: s.streamingAnswer + token })),
  resetStreamingAnswer: () => set({ streamingAnswer: "" }),
}));
