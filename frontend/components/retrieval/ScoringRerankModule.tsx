"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChunkMeta } from "@/lib/api";

interface Props {
  chunks: ChunkMeta[];
}

function RankCard({ chunk, rank }: { chunk: ChunkMeta; rank: number }) {
  const hasRerank = chunk.rerank_score !== null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, type: "spring", stiffness: 200, damping: 20 }}
      className="rounded-lg p-3 flex flex-col gap-2"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-glass)" }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>
          RANK_{String(rank).padStart(2, "0")}
        </span>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {chunk.source_file}
        </span>
      </div>

      {/* Chunk preview */}
      <p className="text-xs font-mono leading-relaxed line-clamp-2"
        style={{ color: "var(--text-primary)" }}>
        {chunk.text.slice(0, 100)}...
      </p>

      {/* Score chips */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs font-mono px-2 py-0.5 rounded"
          style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "var(--accent-cyan)" }}>
          faiss {chunk.score.toFixed(4)}
        </span>
        {hasRerank && (
          <span className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: "rgba(255,0,255,0.08)", border: "1px solid rgba(255,0,255,0.25)", color: "var(--accent-magenta)" }}>
            rerank {chunk.rerank_score!.toFixed(4)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function ScoringRerankModule({ chunks }: Props) {
  // Sort by rerank_score if available, else by faiss score
  const sorted = [...chunks].sort((a, b) => {
    const sa = a.rerank_score ?? a.score;
    const sb = b.rerank_score ?? b.score;
    return sb - sa;
  });

  const isReranked = chunks.some((c) => c.rerank_score !== null);

  return (
    <div className="glass p-4 flex flex-col gap-3 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>03</span>
          <h2 className="text-sm font-semibold tracking-wide">Scoring &amp; Reranking</h2>
        </div>
        {isReranked && (
          <span className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: "rgba(255,0,255,0.1)", border: "1px solid rgba(255,0,255,0.25)", color: "var(--accent-magenta)" }}>
            re-ranked
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {chunks.length === 0 ? (
          <p className="text-xs font-mono text-center mt-8" style={{ color: "var(--text-muted)" }}>
            Awaiting query results...
          </p>
        ) : (
          <AnimatePresence>
            {sorted.map((chunk, i) => (
              <RankCard key={chunk.faiss_index} chunk={chunk} rank={i + 1} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
