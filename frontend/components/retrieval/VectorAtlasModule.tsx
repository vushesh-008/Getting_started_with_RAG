"use client";

import { ChunkMeta } from "@/lib/api";
import { hashStr, seededRng } from "@/lib/hash";

interface Props {
  chunks: ChunkMeta[];
  totalChunks: number; // total in FAISS index (for background nodes)
}

// Generate a stable 2D position for a given faiss_index
function nodePosition(faissIndex: number, w: number, h: number, padding: number) {
  const rng = seededRng(hashStr(`node_${faissIndex}`));
  return {
    x: padding + rng() * (w - padding * 2),
    y: padding + rng() * (h - padding * 2),
  };
}

const W = 280;
const H = 260;
const PAD = 24;

export function VectorAtlasModule({ chunks, totalChunks }: Props) {
  const retrievedIndices = new Set(chunks.map((c) => c.faiss_index));

  // Query node — fixed centre-ish position
  const qx = W / 2 + 10;
  const qy = H / 2 - 10;

  return (
    <div className="glass p-4 flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>02</span>
        <h2 className="text-sm font-semibold tracking-wide">Vector Atlas</h2>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs font-mono">
        {[
          { color: "var(--accent-cyan)", label: "Query" },
          { color: "var(--accent-magenta)", label: "Retrieved" },
          { color: "rgba(255,255,255,0.2)", label: "Other" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            <span style={{ color: "var(--text-muted)" }}>{label}</span>
          </span>
        ))}
      </div>

      {/* SVG scatter plot */}
      <div className="flex-1 flex items-center justify-center">
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          {/* Background nodes — all chunks in index */}
          {Array.from({ length: totalChunks }, (_, i) => {
            if (retrievedIndices.has(i)) return null;
            const { x, y } = nodePosition(i, W, H, PAD);
            return (
              <circle key={`bg-${i}`} cx={x} cy={y} r={3}
                fill="rgba(255,255,255,0.15)" />
            );
          })}

          {/* Lines from query to retrieved nodes */}
          {chunks.map((c) => {
            const { x, y } = nodePosition(c.faiss_index, W, H, PAD);
            return (
              <line key={`line-${c.faiss_index}`}
                x1={qx} y1={qy} x2={x} y2={y}
                stroke="rgba(255,0,255,0.25)" strokeWidth={1} strokeDasharray="3 3" />
            );
          })}

          {/* Retrieved nodes — magenta, sized by score */}
          {chunks.map((c) => {
            const { x, y } = nodePosition(c.faiss_index, W, H, PAD);
            const r = 5 + (c.rerank_score ?? c.score) * 8;
            return (
              <g key={`ret-${c.faiss_index}`}>
                <circle cx={x} cy={y} r={r + 4} fill="rgba(255,0,255,0.08)" />
                <circle cx={x} cy={y} r={r} fill="var(--accent-magenta)" opacity={0.85} />
                <text x={x} y={y - r - 4} textAnchor="middle"
                  fontSize={8} fill="rgba(255,0,255,0.7)" fontFamily="monospace">
                  {c.chunk_index}
                </text>
              </g>
            );
          })}

          {/* Query node — cyan, pulsing via CSS animation */}
          <circle cx={qx} cy={qy} r={14} fill="rgba(0,229,255,0.08)"
            style={{ animation: chunks.length > 0 ? "ping 1.5s ease-out infinite" : "none" }} />
          <circle cx={qx} cy={qy} r={8} fill="var(--accent-cyan)" opacity={0.9} />
          <text x={qx} y={qy + 20} textAnchor="middle"
            fontSize={8} fill="var(--accent-cyan)" fontFamily="monospace">
            QUERY
          </text>
        </svg>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs font-mono"
        style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "8px", color: "var(--text-muted)" }}>
        <span>{chunks.length} nearest neighbours</span>
        <span>{totalChunks} total vectors</span>
      </div>
    </div>
  );
}
