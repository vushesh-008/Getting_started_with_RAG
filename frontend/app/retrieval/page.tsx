"use client";

import { useState } from "react";
import { ChunkMeta } from "@/lib/api";
import { usePipelineStore } from "@/store/pipeline";
import { QueryAnalysisModule } from "@/components/retrieval/QueryAnalysisModule";
import { VectorAtlasModule } from "@/components/retrieval/VectorAtlasModule";
import { ScoringRerankModule } from "@/components/retrieval/ScoringRerankModule";
import { AugmentationXRayModule } from "@/components/retrieval/AugmentationXRayModule";

export default function RetrievalPage() {
  const appendStreamingAnswer = usePipelineStore((s) => s.appendStreamingAnswer);
  const setVectorMatches = usePipelineStore((s) => s.setVectorMatches);
  const pipelineHealth = usePipelineStore((s) => s.pipelineHealth);

  const [chunks, setChunks] = useState<ChunkMeta[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleContext = (incoming: ChunkMeta[]) => {
    setChunks(incoming);
    setVectorMatches(incoming);
    setIsStreaming(true);
  };

  const handleToken = (token: string) => {
    appendStreamingAnswer(token);
  };

  const handleDone = () => {
    setIsStreaming(false);
  };

  return (
    <main className="min-h-screen p-6" style={{ background: "var(--bg-base)" }}>
      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs font-mono mb-1" style={{ color: "var(--text-muted)" }}>
          PHASE 2 &nbsp;·&nbsp; Real-time vector expansion and semantic synthesis
        </p>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Retrieval &amp; Reason Engine
        </h1>
        <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          <span style={{ color: "var(--accent-cyan)" }}>{pipelineHealth.vectorCount}</span> vectors indexed
          &nbsp;·&nbsp; Active Pipeline
        </p>
      </div>

      {/* 4-module grid */}
      <div className="grid grid-cols-4 gap-4" style={{ height: "75vh" }}>
        <QueryAnalysisModule
          onContext={handleContext}
          onToken={handleToken}
          onDone={handleDone}
        />
        <VectorAtlasModule
          chunks={chunks}
          totalChunks={pipelineHealth.vectorCount || chunks.length}
        />
        <ScoringRerankModule chunks={chunks} />
        <AugmentationXRayModule chunks={chunks} isStreaming={isStreaming} />
      </div>
    </main>
  );
}
