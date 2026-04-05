"use client";

import { InteractiveSlicer } from "@/components/ingestion/InteractiveSlicer";
import { usePipelineStore } from "@/store/pipeline";

export default function Home() {
  const setExtractedText = usePipelineStore((s) => s.setExtractedText);

  // Temporary: load sample text so Module 02 can be tested standalone
  const loadSample = () => {
    const sample = `Retrieval-Augmented Generation (RAG) is a technique that enhances large language models by giving them access to external knowledge at inference time.

Instead of relying solely on knowledge baked into model weights during training, RAG retrieves relevant documents from a knowledge base and injects them into the prompt as context.

This approach solves two major problems with standard LLMs: knowledge cutoffs and hallucinations. Because the model is grounded in retrieved facts, it is less likely to fabricate answers.

The RAG pipeline has two main phases. The first is the indexing phase, where documents are split into chunks, embedded into vectors, and stored in a vector database.

The second is the query phase. When a user submits a question, the query is embedded using the same model. The vector database is searched for the most similar chunk vectors.`;
    setExtractedText(sample);
  };

  return (
    <main className="min-h-screen p-8" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-xl mx-auto">
        <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--accent-cyan)" }}>
          Kinetic Pipeline — Module 02 Preview
        </h1>
        <button
          onClick={loadSample}
          className="text-xs px-3 py-1 rounded mb-6 font-mono"
          style={{
            background: "rgba(0,229,255,0.1)",
            border: "1px solid var(--accent-cyan)",
            color: "var(--accent-cyan)",
          }}
        >
          Load sample text
        </button>
        <div style={{ height: "80vh" }}>
          <InteractiveSlicer />
        </div>
      </div>
    </main>
  );
}
