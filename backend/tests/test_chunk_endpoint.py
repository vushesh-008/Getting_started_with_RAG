"""Quick manual test — hits the running server with sample.txt."""
from pathlib import Path

import httpx

SAMPLE = Path(__file__).parent / "sample.txt"
URL = "http://127.0.0.1:8000/api/v1/chunk"


def test_chunk(chunk_size: int = 200, chunk_overlap: int = 40) -> None:
    text = SAMPLE.read_text()
    payload = {"text": text, "chunk_size": chunk_size, "chunk_overlap": chunk_overlap}

    resp = httpx.post(URL, json=payload)
    resp.raise_for_status()
    data = resp.json()

    stats = data["stats"]
    print(f"\n── Stats ──────────────────────────────")
    print(f"  Total chars : {stats['total_chars']}")
    print(f"  Chunks      : {stats['chunk_count']}")
    print(f"  Avg size    : {stats['avg_chunk_size']} chars")
    print(f"  Min / Max   : {stats['min_chunk_size']} / {stats['max_chunk_size']}")

    print(f"\n── Chunks ─────────────────────────────")
    for c in data["chunks"]:
        preview = c["text"][:60].replace("\n", "↵")
        print(f"  [{c['index']:02d}] chars {c['char_start']:>4}–{c['char_end']:<4}  {preview!r}")


if __name__ == "__main__":
    test_chunk()
