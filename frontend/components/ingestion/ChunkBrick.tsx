"use client";

import { ChunkDetail } from "@/lib/api";

interface Props {
  chunk: ChunkDetail;
  chunkOverlap: number;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Splits chunk text into three regions:
 *   head  — first chunkOverlap chars  → magenta  (overlap from prev chunk)
 *   body  — middle                    → white
 *   tail  — last chunkOverlap chars   → magenta  (overlap into next chunk)
 *
 * head is empty for chunk[0]; tail is empty for chunk[last].
 */
function splitChunkText(
  text: string,
  overlap: number,
  isFirst: boolean,
  isLast: boolean,
): { head: string; body: string; tail: string } {
  const headLen = isFirst ? 0 : Math.min(overlap, text.length);
  const tailLen = isLast ? 0 : Math.min(overlap, Math.max(0, text.length - headLen));

  return {
    head: text.slice(0, headLen),
    body: text.slice(headLen, text.length - tailLen || undefined),
    tail: tailLen > 0 ? text.slice(text.length - tailLen) : "",
  };
}

export function ChunkBrick({ chunk, chunkOverlap, isFirst, isLast }: Props) {
  const { head, body, tail } = splitChunkText(
    chunk.text,
    chunkOverlap,
    isFirst,
    isLast,
  );

  return (
    <div className="glass p-3 mb-2">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-mono font-semibold tracking-widest"
          style={{ color: "var(--accent-cyan)" }}
        >
          CHUNK_{String(chunk.index + 1).padStart(2, "0")}
        </span>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {chunk.char_count} chars
        </span>
      </div>

      {/* Text with overlap highlights */}
      <p className="text-xs leading-relaxed font-mono break-words">
        {head && (
          <span style={{ color: "var(--accent-magenta)" }} title="overlap from previous chunk">
            {head}
          </span>
        )}
        <span style={{ color: "var(--text-primary)" }}>{body}</span>
        {tail && (
          <span style={{ color: "var(--accent-magenta)" }} title="overlap into next chunk">
            {tail}
          </span>
        )}
      </p>
    </div>
  );
}
