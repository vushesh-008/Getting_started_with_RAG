"""Text extraction from uploaded files."""
from pathlib import Path


SUPPORTED = {".txt", ".pdf"}


def extract_text(filepath: Path) -> str:
    suffix = filepath.suffix.lower()
    if suffix == ".txt":
        return filepath.read_text(encoding="utf-8", errors="replace")
    if suffix == ".pdf":
        import fitz  # PyMuPDF
        doc = fitz.open(str(filepath))
        return "\n".join(page.get_text() for page in doc)
    raise ValueError(f"Unsupported file type: {suffix!r}. Supported: {SUPPORTED}")
