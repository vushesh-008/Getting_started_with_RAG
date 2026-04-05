"""Test the full RAG query pipeline against the running server.

Requires:
  - uvicorn running on port 8000
  - ollama running with phi3:mini pulled
  - sample.txt already embedded (run test_embed_endpoint.py first)
"""
import httpx

BASE = "http://127.0.0.1:8000"


def main() -> None:
    query = "How does RAG prevent hallucinations?"

    print(f"Query: {query!r}\n")
    print("── Retrieved Chunks ───────────────────")

    resp = httpx.post(
        f"{BASE}/api/v1/query",
        json={"query": query, "top_k": 3, "model": "phi3:mini"},
        timeout=120.0,
    )
    if resp.status_code != 200:
        print(f"ERROR {resp.status_code}:\n{resp.text}")
        return
    data = resp.json()

    for c in data["chunks"]:
        print(f"  [{c['chunk_index']}] score={c['score']:.4f}  {c['text'][:80]!r}")

    print("\n── Answer ─────────────────────────────")
    print(data["answer"])


if __name__ == "__main__":
    main()
