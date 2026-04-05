"""SQLite database for chunk registry."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "chunks.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                faiss_index INTEGER NOT NULL UNIQUE,
                source_file TEXT    NOT NULL,
                chunk_index INTEGER NOT NULL,
                text        TEXT    NOT NULL,
                char_start  INTEGER NOT NULL,
                char_end    INTEGER NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                filename    TEXT    NOT NULL,
                char_count  INTEGER NOT NULL,
                chunk_count INTEGER NOT NULL,
                ingested_at TEXT    DEFAULT (datetime('now'))
            )
        """)
        conn.commit()
