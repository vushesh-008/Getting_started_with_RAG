"use client";

import { useEffect, useRef } from "react";
import { ChunkMeta } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";

const SYSTEM_PROMPT =
  "You are a helpful assistant. Answer the user's question using ONLY the information provided in the context below. If the answer cannot be found in the context, say so honestly. Do not make up information.";

interface Props {
  chunks: ChunkMeta[];
  isStreaming: boolean;
}

function PromptPane({
  label,
  children,
  accentColor = "var(--accent-cyan)",
}: {
  label: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${accentColor}30` }}>
      <div className="px-3 py-1 text-xs font-mono font-semibold"
        style={{ background: `${accentColor}12`, color: accentColor }}>
        {label}
      </div>
      <div className="px-3 py-2 text-xs font-mono leading-relaxed"
        style={{ color: "var(--text-muted)", background: "rgba(0,0,0,0.3)" }}>
        {children}
      </div>
    </div>
  );
}

export function AugmentationXRayModule({ chunks, isStreaming }: Props) {
  const currentQuery = usePipelineStore((s) => s.currentQuery);
  const streamingAnswer = usePipelineStore((s) => s.streamingAnswer);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll synthesis output as tokens arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streamingAnswer]);

  return (
    <div className="glass p-4 flex flex-col gap-3 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>04</span>
        <h2 className="text-sm font-semibold tracking-wide">Augmentation X-Ray</h2>
      </div>

      {/* Prompt panes */}
      <div className="flex flex-col gap-2">
        <PromptPane label="[SYSTEM_PROMPT]">
          {SYSTEM_PROMPT}
        </PromptPane>

        <PromptPane label="[CONTEXT_CHUNKS]" accentColor="var(--accent-magenta)">
          {chunks.length === 0 ? (
            <span style={{ color: "rgba(255,255,255,0.2)" }}>— awaiting retrieval —</span>
          ) : (
            chunks.map((c, i) => (
              <p key={c.faiss_index} className="mb-1">
                <span style={{ color: "var(--accent-magenta)" }}>[{i + 1}]</span>{" "}
                {c.text.slice(0, 60)}...
              </p>
            ))
          )}
        </PromptPane>

        <PromptPane label="[USER_QUERY]">
          {currentQuery || <span style={{ color: "rgba(255,255,255,0.2)" }}>— no query yet —</span>}
        </PromptPane>
      </div>

      {/* Synthesis output */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          SYNTHESIS OUTPUT
        </span>
        <span className="w-2 h-2 rounded-full"
          style={{ background: isStreaming ? "var(--accent-cyan)" : streamingAnswer ? "#00FF88" : "#333",
            animation: isStreaming ? "pulse 0.8s infinite" : "none" }} />
      </div>

      <div
        ref={outputRef}
        className="flex-1 rounded-lg p-3 overflow-y-auto text-xs font-mono leading-relaxed"
        style={{ background: "#080B10", border: "1px solid var(--border-glass)", minHeight: "80px" }}
      >
        {streamingAnswer ? (
          <span style={{ color: "var(--text-primary)" }}>
            {streamingAnswer}
            {isStreaming && (
              <span style={{ color: "var(--accent-cyan)", animation: "pulse 0.6s infinite" }}>▌</span>
            )}
          </span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.2)" }}>
            {isStreaming ? "Generating..." : "— submit a query to see the answer —"}
          </span>
        )}
      </div>
    </div>
  );
}
