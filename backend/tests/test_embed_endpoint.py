"""Test the full ingest → embed pipeline against the running server."""
from pathlib import Path

import httpx

BASE = "http://127.0.0.1:8000"
SAMPLE = Path(__file__).parent / "sample.txt"


def main() -> None:
    text = SAMPLE.read_text()

    # ── Step 1: ingest ───────────────────────────────────────────────────────
    print("── Ingest ─────────────────────────────")
    with open(SAMPLE, "rb") as f:
        resp = httpx.post(f"{BASE}/api/v1/ingest", files={"file": ("sample.txt", f, "text/plain")})
    resp.raise_for_status()
    ingest = resp.json()
    print(f"  Filename   : {ingest['filename']}")
    print(f"  Chars      : {ingest['char_count']}")
    print(f"  Lines      : {ingest['line_count']}")
    print(f"  Preview    : {ingest['preview'][:80]!r}")

    # ── Step 2: embed ────────────────────────────────────────────────────────
    print("\n── Embed ──────────────────────────────")
    resp = httpx.post(
        f"{BASE}/api/v1/embed",
        json={"filename": "sample.txt", "text": text, "chunk_size": 512, "chunk_overlap": 64},
        timeout=120.0,   # model download can take a while on first run
    )
    resp.raise_for_status()
    embed = resp.json()
    print(f"  Chunks stored        : {embed['chunks_stored']}")
    print(f"  FAISS index range    : {embed['faiss_index_start']} – {embed['faiss_index_end']}")
    print(f"  Total vectors in DB  : {embed['total_vectors_in_index']}")


if __name__ == "__main__":
    main()
