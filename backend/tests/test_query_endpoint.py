"""Test the RAG query pipeline — with and without re-ranking.

Requires:
  - uvicorn running on port 8000
  - ollama running with phi3:mini pulled
  - sample.txt already embedded (run test_embed_endpoint.py first)
"""
import httpx

BASE = "http://127.0.0.1:8000"


def run_query(query: str, rerank: bool) -> dict:
    resp = httpx.post(
        f"{BASE}/api/v1/query",
        json={"query": query, "top_k": 3, "model": "phi3:mini", "rerank": rerank},
        timeout=120.0,
    )
    if resp.status_code != 200:
        print(f"ERROR {resp.status_code}: {resp.text}")
        return {}
    return resp.json()


def print_chunks(chunks: list[dict], reranked: bool) -> None:
    for c in chunks:
        score_str = f"faiss={c['score']:.4f}"
        if reranked and c.get("rerank_score") is not None:
            score_str += f"  rerank={c['rerank_score']:.4f}"
        print(f"  [{c['chunk_index']}] {score_str}  {c['text'][:70]!r}")


def main() -> None:
    query = "How does RAG prevent hallucinations?"
    print(f"Query: {query!r}\n")

    # ── Without re-ranking ───────────────────────────────────────────────────
    print("── Without re-ranking (FAISS only) ────")
    data = run_query(query, rerank=False)
    if data:
        print_chunks(data["chunks"], reranked=False)

    print()

    # ── With re-ranking ──────────────────────────────────────────────────────
    print("── With re-ranking (cross-encoder) ────")
    data = run_query(query, rerank=True)
    if data:
        print_chunks(data["chunks"], reranked=True)
        print(f"\n── Answer ─────────────────────────────")
        print(data["answer"])


if __name__ == "__main__":
    main()
