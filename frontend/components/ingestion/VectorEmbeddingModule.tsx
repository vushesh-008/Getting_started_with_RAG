"use client";

import { usePipelineStore } from "@/store/pipeline";

// ── Deterministic heatmap generation ─────────────────────────────────────────
// Produces 384 pseudo-random values [0,1] seeded from chunk text.
// Same chunk text always renders the same heatmap.

function seededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
}

function hashStr(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function generateVector(text: string): Float32Array {
  const rng = seededRng(hashStr(text));
  const vec = new Float32Array(384);
  for (let i = 0; i < 384; i++) vec[i] = rng();
  return vec;
}

// Map a [0,1] value to a CSS colour in the cyan→dark range
function dimToColor(v: number): string {
  if (v > 0.82) return "var(--accent-cyan)";          // hot — bright cyan
  if (v > 0.65) return "rgba(0,229,255,0.55)";        // warm
  if (v > 0.45) return "rgba(0,229,255,0.25)";        // mid
  if (v > 0.28) return "rgba(0,229,255,0.10)";        // cool
  return "rgba(255,255,255,0.04)";                     // cold — near zero
}

// ── Simulated latency: proportional to chunk length, with small noise ─────────
function mockLatency(text: string): number {
  const rng = seededRng(hashStr(text) ^ 0xdeadbeef);
  return Math.round(120 + text.length * 0.04 + rng() * 30);
}

// ── VectorHeatmap — 24×16 grid = 384 cells ────────────────────────────────────
function VectorHeatmap({ text, cid }: { text: string; cid: string }) {
  const vec = generateVector(text);
  const latency = mockLatency(text);
  const COLS = 24;
  const ROWS = 16; // 24×16 = 384

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-glass)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-semibold" style={{ color: "var(--accent-cyan)" }}>
          {cid}
        </span>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {latency}ms
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: "1px",
        }}
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => (
          <div
            key={i}
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: "1px",
              background: dimToColor(vec[i]),
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Module container ───────────────────────────────────────────────────────────
export function VectorEmbeddingModule() {
  const previewChunks = usePipelineStore((s) => s.previewChunks);

  return (
    <div className="glass p-4 flex flex-col gap-4 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>
          03
        </span>
        <h2 className="text-sm font-semibold tracking-wide">Vector Embedding</h2>
      </div>

      {/* Model badge */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
        style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)" }}
      >
        <span style={{ color: "var(--text-muted)" }}>MODEL</span>
        <span style={{ color: "var(--accent-cyan)" }}>all-MiniLM-L6-v2</span>
        <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>384 dims</span>
      </div>

      {/* Heatmap list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {previewChunks.length === 0 ? (
          <p className="text-xs font-mono text-center mt-8" style={{ color: "var(--text-muted)" }}>
            Awaiting chunks...
          </p>
        ) : (
          previewChunks.map((chunk, i) => (
            <VectorHeatmap
              key={chunk.index}
              text={chunk.text}
              cid={`CID: ${String(i + 1).padStart(2, "0")}_VEC`}
            />
          ))
        )}
      </div>
    </div>
  );
}
