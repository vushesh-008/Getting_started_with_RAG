"use client";

import { ExtractionModule } from "@/components/ingestion/ExtractionModule";
import { InteractiveSlicer } from "@/components/ingestion/InteractiveSlicer";
import { VectorEmbeddingModule } from "@/components/ingestion/VectorEmbeddingModule";

export default function Home() {
  return (
    <main className="min-h-screen p-6" style={{ background: "var(--bg-base)" }}>
      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs font-mono mb-1" style={{ color: "var(--text-muted)" }}>
          THE ENGINE &nbsp;·&nbsp; Local Instance Active
        </p>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Ingestion &amp; Indexing Pipeline
        </h1>
        <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
          Instance ID: <span style={{ color: "var(--accent-cyan)" }}>KINETIC-PX-900</span>
        </p>
      </div>

      {/* Module grid — 3 columns */}
      <div className="grid grid-cols-3 gap-4" style={{ height: "75vh" }}>
        <ExtractionModule />
        <InteractiveSlicer />
        <VectorEmbeddingModule />
      </div>
    </main>
  );
}
