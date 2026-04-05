"use client";

import { useRef, useState } from "react";
import { ChunkMeta, streamQuery } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";

const SYSTEM_PROMPT =
  "You are a helpful assistant. Answer the user's question using ONLY the information provided in the context. If the answer cannot be found, say so honestly.";

interface Props {
  onContext: (chunks: ChunkMeta[]) => void;
  onToken: (token: string) => void;
  onDone: () => void;
}

export function QueryAnalysisModule({ onContext, onToken, onDone }: Props) {
  const setCurrentQuery = usePipelineStore((s) => s.setCurrentQuery);
  const resetStreamingAnswer = usePipelineStore((s) => s.resetStreamingAnswer);

  const [input, setInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [rerank, setRerank] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    const q = input.trim();

    cancelRef.current?.();
    setSubmittedQuery(q);
    setCurrentQuery(q);
    resetStreamingAnswer();
    setIsStreaming(true);
    setError(null);

    cancelRef.current = streamQuery(
      q, 5, rerank, "phi3:mini",
      onContext,
      onToken,
      () => { setIsStreaming(false); onDone(); },
      (msg) => { setError(msg); setIsStreaming(false); },
    );
  };

  return (
    <div className="glass p-4 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>01</span>
        <h2 className="text-sm font-semibold tracking-wide">Query Analysis</h2>
      </div>

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        placeholder="Ask a question about your documents..."
        rows={3}
        className="w-full text-xs font-mono rounded-lg p-3 resize-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border-glass)",
          color: "var(--text-primary)",
          outline: "none",
        }}
      />

      {/* Rerank toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={rerank}
          onChange={(e) => setRerank(e.target.checked)}
          className="accent-cyan-400"
        />
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          Cross-encoder re-rank
        </span>
      </label>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || isStreaming}
        className="w-full py-2 rounded-lg text-xs font-mono font-semibold tracking-wide transition-all"
        style={{
          background: input.trim() && !isStreaming ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${input.trim() && !isStreaming ? "var(--accent-cyan)" : "var(--border-glass)"}`,
          color: input.trim() && !isStreaming ? "var(--accent-cyan)" : "var(--text-muted)",
          cursor: input.trim() && !isStreaming ? "pointer" : "not-allowed",
        }}
      >
        {isStreaming ? "⟳  Analysing..." : "⊙  Analyse Query"}
      </button>

      {/* Status panes */}
      {submittedQuery && (
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          {/* Intent */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>INTENT</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ background: "rgba(0,229,255,0.1)", color: "var(--accent-cyan)", border: "1px solid rgba(0,229,255,0.2)" }}>
              Technical Analysis
            </span>
          </div>

          {/* Rewritten query pane */}
          <div className="rounded-lg p-3 text-xs font-mono"
            style={{ background: "#080B10", border: "1px solid var(--border-glass)", color: "#7FC3D8" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "4px" }}>REWRITTEN QUERY</p>
            <p>{submittedQuery}</p>
          </div>

          {/* HyDE status */}
          <div className="rounded-lg p-3 text-xs font-mono flex items-center gap-2"
            style={{ background: "rgba(255,0,255,0.05)", border: "1px solid rgba(255,0,255,0.15)" }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: isStreaming ? "var(--accent-magenta)" : "#555", animation: isStreaming ? "pulse 1s infinite" : "none" }} />
            <span style={{ color: isStreaming ? "var(--accent-magenta)" : "var(--text-muted)" }}>
              {isStreaming ? "Generating HyDE Ghost Response..." : "HyDE complete"}
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs font-mono" style={{ color: "#FF4444" }}>✗ {error}</p>
      )}
    </div>
  );
}
