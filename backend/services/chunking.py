"""Recursive Character Text Splitter.

Splits text by trying progressively finer separators:
  \\n\\n  →  \\n  →  '. '  →  ' '  →  characters (hard split)

After splitting into small leaf pieces, merges them greedily into
chunks up to `chunk_size`, carrying `chunk_overlap` characters of
context into the next chunk.

See docs/decisions/chunking_strategy.md for full rationale.
"""
from dataclasses import dataclass

SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


@dataclass
class Chunk:
    index: int
    text: str
    char_start: int  # position in original text
    char_end: int    # position in original text


# ---------------------------------------------------------------------------
# Step 1 — split into leaf pieces, preserving original offsets
# ---------------------------------------------------------------------------

def _leading_ws(text: str) -> int:
    """Number of leading whitespace characters."""
    return len(text) - len(text.lstrip())


def _split_recursive(
    text: str,
    offset: int,
    separators: list[str],
    chunk_size: int,
) -> list[tuple[str, int, int]]:
    """Return list of (piece_text, global_start, global_end).

    Each piece is guaranteed to be <= chunk_size characters after stripping.
    """
    stripped = text.strip()
    if not stripped:
        return []

    lead = _leading_ws(text)

    if len(stripped) <= chunk_size:
        return [(stripped, offset + lead, offset + lead + len(stripped))]

    # Pick the first separator that exists in this text
    chosen = ""           # fallback: hard char split
    chosen_idx = len(separators) - 1
    for i, sep in enumerate(separators):
        if sep == "" or sep in text:
            chosen = sep
            chosen_idx = i
            break

    remaining = separators[chosen_idx + 1:]

    if chosen == "":
        # Hard split — last resort
        result = []
        for i in range(0, len(text), chunk_size):
            piece = text[i : i + chunk_size].strip()
            if piece:
                pl = _leading_ws(text[i : i + chunk_size])
                result.append((piece, offset + i + pl, offset + i + pl + len(piece)))
        return result

    result = []
    pos = 0
    for part in text.split(chosen):
        part_stripped = part.strip()
        if part_stripped:
            pl = _leading_ws(part)
            if len(part_stripped) <= chunk_size:
                result.append((
                    part_stripped,
                    offset + pos + pl,
                    offset + pos + pl + len(part_stripped),
                ))
            else:
                result.extend(_split_recursive(part, offset + pos, remaining, chunk_size))
        pos += len(part) + len(chosen)

    return result


# ---------------------------------------------------------------------------
# Step 2 — merge leaf pieces into chunks with overlap
# ---------------------------------------------------------------------------

def chunk_text(
    text: str,
    chunk_size: int = 512,
    chunk_overlap: int = 64,
) -> list[Chunk]:
    """Split *text* into overlapping chunks using the Recursive Character strategy.

    Args:
        text:          Raw document text.
        chunk_size:    Maximum characters per chunk.
        chunk_overlap: Characters of context carried into the next chunk.

    Returns:
        Ordered list of Chunk dataclasses.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be > 0")
    if not (0 <= chunk_overlap < chunk_size):
        raise ValueError("chunk_overlap must satisfy 0 <= chunk_overlap < chunk_size")

    pieces = _split_recursive(text, 0, SEPARATORS, chunk_size)

    chunks: list[Chunk] = []
    window: list[tuple[str, int, int]] = []   # (piece_text, start, end)
    window_len = 0

    for piece, p_start, p_end in pieces:
        piece_len = len(piece)

        if window_len + piece_len > chunk_size and window:
            # ── emit current window as a chunk ──────────────────────────────
            chunks.append(Chunk(
                index=len(chunks),
                text=" ".join(w[0] for w in window),
                char_start=window[0][1],
                char_end=window[-1][2],
            ))

            # ── carry last chunk_overlap chars into next chunk ──────────────
            # Slice the tail of the emitted chunk text as a plain string,
            # so overlap always works regardless of individual piece sizes.
            if chunk_overlap > 0:
                prev_text = chunks[-1].text
                overlap_text = prev_text[-chunk_overlap:]
                overlap_start = chunks[-1].char_end - len(overlap_text)
                window = [(overlap_text, overlap_start, chunks[-1].char_end)]
                window_len = len(overlap_text)
            else:
                window = []
                window_len = 0

        window.append((piece, p_start, p_end))
        window_len += piece_len

    # ── emit final window ────────────────────────────────────────────────────
    if window:
        chunks.append(Chunk(
            index=len(chunks),
            text=" ".join(w[0] for w in window),
            char_start=window[0][1],
            char_end=window[-1][2],
        ))

    return chunks
