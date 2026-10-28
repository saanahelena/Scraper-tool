"""Create a Supabase client using credentials stored outside the code."""

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


def get_database():
    # Look beside this file, even if Python is run from another folder.
    load_dotenv(Path(__file__).with_name(".env"))
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SECRET_KEY", "").strip()
    if not url or not key or "your-project" in url or key == "your-secret-key":
        raise SystemExit(
            "Set SUPABASE_URL and SUPABASE_SECRET_KEY in your local .env first. "
            "See README.md. Do not share your key in chat."
        )
    return create_client(url, key)


def save_books(books):
    """Skip titles already saved; never update or delete existing books."""
    database = get_database()
    titles = [book["title"] for book in books]
    if not titles:
        return []
    existing = database.table("books").select("title").in_("title", titles).execute().data
    known_titles = {book["title"] for book in existing}
    new_books = []
    for book in books:
        if book["title"] not in known_titles:
            new_books.append(book)
            known_titles.add(book["title"])
    if not new_books:
        return []
    return database.table("books").insert(new_books).execute().data
