"use client";

import { useEffect, useRef, useState } from "react";
import Slider from "@mui/material/Slider";
import { previewChunks } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";
import { ChunkBrick } from "./ChunkBrick";

const STRATEGIES = ["Recursive", "Fixed Size"] as const;
type Strategy = (typeof STRATEGIES)[number];

export function InteractiveSlicer() {
  const extractedText = usePipelineStore((s) => s.extractedText);
  const chunkConfig = usePipelineStore((s) => s.chunkConfig);
  const setChunkConfig = usePipelineStore((s) => s.setChunkConfig);
  const previewChunksList = usePipelineStore((s) => s.previewChunks);
  const setPreviewChunks = usePipelineStore((s) => s.setPreviewChunks);

  const [strategy, setStrategy] = useState<Strategy>("Recursive");
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch chunks whenever config changes (debounced 400ms)
  useEffect(() => {
    if (!extractedText) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await previewChunks(
          extractedText,
          chunkConfig.chunkSize,
          chunkConfig.chunkOverlap,
        );
        setPreviewChunks(result.chunks);
      } catch (err) {
        console.error("Chunk preview failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [extractedText, chunkConfig.chunkSize, chunkConfig.chunkOverlap]);

  const overlapPct = Math.round((chunkConfig.chunkOverlap / chunkConfig.chunkSize) * 100);

  return (
    <div className="glass p-4 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-mono font-bold"
          style={{ color: "var(--accent-cyan)" }}
        >
          02
        </span>
        <h2 className="text-sm font-semibold tracking-wide">Interactive Slicer</h2>
      </div>

      {/* Strategy tabs */}
      <div className="flex gap-2">
        {STRATEGIES.map((s) => (
          <button
            key={s}
            onClick={() => setStrategy(s)}
            className="px-3 py-1 text-xs rounded font-mono transition-all"
            style={{
              background:
                strategy === s
                  ? "var(--accent-cyan)"
                  : "rgba(255,255,255,0.06)",
              color: strategy === s ? "#0B0E14" : "var(--text-muted)",
              border: "1px solid var(--border-glass)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-4 px-1">
        {/* Chunk size */}
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span style={{ color: "var(--text-muted)" }}>CHUNK SIZE</span>
            <span style={{ color: "var(--accent-cyan)" }}>
              {chunkConfig.chunkSize} chars
            </span>
          </div>
          <Slider
            min={64}
            max={2048}
            step={64}
            value={chunkConfig.chunkSize}
            onChange={(_, v) => setChunkConfig({ chunkSize: v as number })}
            sx={{
              color: "var(--accent-cyan)",
              "& .MuiSlider-thumb": { width: 14, height: 14 },
            }}
          />
        </div>

        {/* Overlap */}
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span style={{ color: "var(--text-muted)" }}>OVERLAP %</span>
            <span style={{ color: "var(--accent-magenta)" }}>{overlapPct}%</span>
          </div>
          <Slider
            min={0}
            max={Math.floor(chunkConfig.chunkSize * 0.5)}
            step={8}
            value={chunkConfig.chunkOverlap}
            onChange={(_, v) => setChunkConfig({ chunkOverlap: v as number })}
            sx={{
              color: "var(--accent-magenta)",
              "& .MuiSlider-thumb": { width: 14, height: 14 },
            }}
          />
        </div>
      </div>

      {/* Chunk bricks */}
      <div className="flex-1 overflow-y-auto pr-1">
        {!extractedText && (
          <p className="text-xs text-center mt-8" style={{ color: "var(--text-muted)" }}>
            Upload a document to preview chunks.
          </p>
        )}

        {isLoading && (
          <p className="text-xs text-center mt-8" style={{ color: "var(--accent-cyan)" }}>
            Slicing...
          </p>
        )}

        {!isLoading &&
          previewChunksList.map((chunk, i) => (
            <ChunkBrick
              key={chunk.index}
              chunk={chunk}
              chunkOverlap={chunkConfig.chunkOverlap}
              isFirst={i === 0}
              isLast={i === previewChunksList.length - 1}
            />
          ))}
      </div>

      {/* Stats footer */}
      {previewChunksList.length > 0 && (
        <div
          className="flex justify-between text-xs font-mono pt-2"
          style={{ borderTop: "1px solid var(--border-glass)", color: "var(--text-muted)" }}
        >
          <span>{previewChunksList.length} chunks</span>
          <span>
            avg{" "}
            {Math.round(
              previewChunksList.reduce((s, c) => s + c.char_count, 0) /
                previewChunksList.length,
            )}{" "}
            chars
          </span>
        </div>
      )}
    </div>
  );
}
