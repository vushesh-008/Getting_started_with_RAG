"""POST /api/v1/ingest — upload a file and extract raw text.

Does NOT chunk or embed. Returns the raw text and basic metrics so the
frontend can show the extraction step before anything else happens.
"""
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from services.ingestion import SUPPORTED, extract_text

router = APIRouter()


class IngestResponse(BaseModel):
    filename: str
    char_count: int
    line_count: int
    preview: str   # first 500 chars — for quick display
    text: str      # full extracted text — used by frontend for chunking/embedding


@router.post("", response_model=IngestResponse)
async def ingest_file(file: UploadFile) -> IngestResponse:
    """Upload a file and extract its raw text. Nothing is stored yet."""
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type {suffix!r}. Supported: {sorted(SUPPORTED)}",
        )

    # Write upload to a temp file so PyMuPDF (and plain read) can access it by path
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)

    try:
        text = extract_text(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    return IngestResponse(
        filename=file.filename or "unknown",
        char_count=len(text),
        line_count=text.count("\n"),
        preview=text[:500],
        text=text,
    )
