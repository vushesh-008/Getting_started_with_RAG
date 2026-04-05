"use client";

import { useState } from "react";
import { embedDocument } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";

type EmbedStatus = "idle" | "running" | "done" | "error";

export function PersistenceModule() {
  const rawFile       = usePipelineStore((s) => s.rawFile);
  const extractedText = usePipelineStore((s) => s.extractedText);
  const chunkConfig   = usePipelineStore((s) => s.chunkConfig);
  const setPipelineHealth = usePipelineStore((s) => s.setPipelineHealth);
  const setActiveStep = usePipelineStore((s) => s.setActiveStep);

  const [status, setStatus]   = useState<EmbedStatus>("idle");
  const [result, setResult]   = useState<{
    chunksStored: number;
    totalVectors: number;
    indexStart: number;
    indexEnd: number;
  } | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const canRun = !!extractedText && status !== "running";

  const handleBatchRun = async () => {
    if (!canRun) return;
    setStatus("running");
    setError(null);
    setResult(null);
    setActiveStep("EMBEDDING");

    try {
      const filename = rawFile?.name ?? "document.txt";
      const res = await embedDocument(
        filename,
        extractedText,
        chunkConfig.chunkSize,
        chunkConfig.chunkOverlap,
      );

      setResult({
        chunksStored: res.chunks_stored,
        totalVectors: res.total_vectors_in_index,
        indexStart:   res.faiss_index_start,
        indexEnd:     res.faiss_index_end,
      });
      setPipelineHealth({ vectorCount: res.total_vectors_in_index });
      setStatus("done");
      setActiveStep("QUERYING");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Embed failed.");
      setStatus("error");
    }
  };

  return (
    <div className="glass p-4 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>
          04
        </span>
        <h2 className="text-sm font-semibold tracking-wide">Persistence</h2>
      </div>

      {/* DB icon */}
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
          style={{
            background: status === "done"
              ? "rgba(0,229,255,0.15)"
              : "rgba(255,255,255,0.06)",
            border: `1px solid ${status === "done" ? "var(--accent-cyan)" : "var(--border-glass)"}`,
            transition: "all 0.4s ease",
          }}
        >
          🗄️
        </div>

        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {status === "idle"    && "FAISS + SQLite"}
          {status === "running" && "Writing vectors..."}
          {status === "done"    && "Index updated"}
          {status === "error"   && "Write failed"}
        </p>

        {/* Stats (shown after success) */}
        {result && (
          <div className="w-full grid grid-cols-2 gap-2">
            {[
              { label: "CHUNKS STORED",  value: result.chunksStored },
              { label: "TOTAL VECTORS",  value: result.totalVectors },
              { label: "INDEX START",    value: result.indexStart },
              { label: "INDEX END",      value: result.indexEnd },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg p-2 text-center"
                style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.12)" }}
              >
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-sm font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Write speed + index health (static display, matches mockup) */}
        {status !== "done" && (
          <div className="w-full grid grid-cols-2 gap-2">
            {[
              { label: "WRITE SPEED", value: "850 v/s" },
              { label: "INDEX HEALTH", value: "99.8%" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg p-2 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-glass)" }}
              >
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs font-mono" style={{ color: "#FF4444" }}>
          ✗ {error}
        </p>
      )}

      {/* CTA button */}
      <button
        onClick={handleBatchRun}
        disabled={!canRun}
        className="w-full py-3 rounded-lg text-sm font-mono font-semibold tracking-wide transition-all"
        style={{
          background: canRun
            ? status === "done"
              ? "rgba(0,229,255,0.15)"
              : "rgba(0,229,255,0.1)"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${canRun ? "var(--accent-cyan)" : "var(--border-glass)"}`,
          color: canRun ? "var(--accent-cyan)" : "var(--text-muted)",
          cursor: canRun ? "pointer" : "not-allowed",
        }}
      >
        {status === "idle"    && "⊙  Initiate Full Batch Run"}
        {status === "running" && "⟳  Embedding..."}
        {status === "done"    && "✓  Batch Complete"}
        {status === "error"   && "⊙  Retry Batch Run"}
      </button>
    </div>
  );
}
