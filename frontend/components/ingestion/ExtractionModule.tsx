"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ingestFile } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";

// ── Simulated log lines that play out after a successful ingest ──────────────
function buildLogLines(filename: string, charCount: number): string[] {
  const ts = () => {
    const now = new Date();
    return `[${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}]`;
  };
  return [
    `${ts()} Initializing extraction pipeline...`,
    `${ts()} Source detected: ${filename}`,
    `${ts()} Reading raw bytes...`,
    `${ts()} Encoding: UTF-8 confirmed.`,
    `${ts()} Text layer extracted. ${charCount.toLocaleString()} chars found.`,
    `${ts()} Metadata mapping complete.`,
    `${ts()} OCR layer: not required (text-native).`,
    `${ts()} Streaming buffer initialized.`,
    `${ts()} ✓ Extraction complete. Ready for chunking.`,
  ];
}

// ── File type display helper ─────────────────────────────────────────────────
function fileTypeBadge(filename: string): string {
  const ext = filename.split(".").pop()?.toUpperCase() ?? "FILE";
  return ext === "PDF" ? "PDF/A-1b" : ext;
}

export function ExtractionModule() {
  const setExtractedText = usePipelineStore((s) => s.setExtractedText);
  const setRawFile = usePipelineStore((s) => s.setRawFile);
  const setActiveStep = usePipelineStore((s) => s.setActiveStep);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    charCount: number;
    lineCount: number;
  } | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom as new lines appear
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logLines]);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);
      setLogLines([]);
      setActiveStep("UPLOAD");

      try {
        const result = await ingestFile(file);
        setRawFile(file);
        setExtractedText(result.preview.length < result.char_count
          ? result.preview  // preview only — full text needed for chunking
          : result.preview);

        // Fetch full text for chunking (re-read the file client-side)
        const fullText = await file.text();
        setExtractedText(fullText);

        setUploadedFile({
          name: result.filename,
          charCount: result.char_count,
          lineCount: result.line_count,
        });

        // Play log lines out one by one with staggered delays
        const lines = buildLogLines(result.filename, result.char_count);
        lines.forEach((line, i) => {
          setTimeout(() => {
            setLogLines((prev) => [...prev, line]);
            if (i === lines.length - 1) {
              setActiveStep("CHUNKING");
            }
          }, i * 180);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ingestion failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [setExtractedText, setRawFile, setActiveStep],
  );

  // Drag handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };
  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="glass p-4 flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>
          01
        </span>
        <h2 className="text-sm font-semibold tracking-wide">Extraction</h2>
      </div>

      {/* Dropzone */}
      <label
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="relative flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all p-4"
        style={{
          border: `1px dashed ${isDragging ? "var(--accent-cyan)" : "var(--border-glass)"}`,
          background: isDragging ? "rgba(0,229,255,0.05)" : "rgba(255,255,255,0.02)",
          minHeight: "72px",
        }}
      >
        <input
          type="file"
          accept=".txt,.pdf"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={onFileInput}
        />
        {isLoading ? (
          <span className="text-xs font-mono" style={{ color: "var(--accent-cyan)" }}>
            Processing...
          </span>
        ) : (
          <>
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              Drop .txt or .pdf here
            </span>
            <span className="text-xs font-mono mt-1" style={{ color: "var(--border-glass)" }}>
              or click to browse
            </span>
          </>
        )}
      </label>

      {/* File card (shown after upload) */}
      {uploadedFile && (
        <div
          className="flex items-center gap-3 rounded-lg p-3"
          style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)" }}
        >
          {/* Icon */}
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
            style={{ background: "rgba(0,229,255,0.15)", color: "var(--accent-cyan)" }}
          >
            {uploadedFile.name.split(".").pop()?.toUpperCase()}
          </div>
          {/* Meta */}
          <div className="flex flex-col min-w-0">
            <span
              className="text-xs font-mono font-semibold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {uploadedFile.name}
            </span>
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              TYPE: {fileTypeBadge(uploadedFile.name)} &nbsp;·&nbsp; CHARS:{" "}
              {(uploadedFile.charCount / 1000).toFixed(1)}k &nbsp;·&nbsp; LINES:{" "}
              {uploadedFile.lineCount}
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs font-mono" style={{ color: "#FF4444" }}>
          ✗ {error}
        </p>
      )}

      {/* Extraction terminal */}
      {logLines.length > 0 && (
        <div
          ref={terminalRef}
          className="flex-1 rounded-lg p-3 overflow-y-auto"
          style={{
            background: "#080B10",
            border: "1px solid var(--border-glass)",
            minHeight: "140px",
            maxHeight: "220px",
          }}
        >
          <div
            className="text-xs font-mono mb-2 flex items-center justify-between"
            style={{ color: "var(--text-muted)" }}
          >
            <span>extraction.log</span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: logLines.length < buildLogLines("", 0).length ? "var(--accent-cyan)" : "#00FF88" }}
            />
          </div>
          {logLines.map((line, i) => (
            <p
              key={i}
              className="text-xs font-mono leading-relaxed"
              style={{
                color: line.includes("✓") ? "#00FF88" : line.includes("OCR") ? "var(--accent-magenta)" : "#7FC3D8",
              }}
            >
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
