"""Create a Supabase client using credentials stored outside the code."""

import os
from decimal import Decimal
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


def book_key(book):
    """Compare the full title and numeric GBP price, ignoring numeric formatting."""
    return book["title"], Decimal(str(book["price"]))


def read_books(books, database):
    """Read matches in small batches, including pagination beyond API row limits."""
    titles = [book["title"] for book in books]
    rows = []
    for start in range(0, len(titles), 20):
        offset = 0
        while True:
            batch = (
                database.table("books").select("id, title, price").order("id")
                .in_("title", titles[start:start + 20])
                .range(offset, offset + 99).execute().data
            )
            rows.extend(batch)
            if not batch:
                break
            offset += len(batch)
    return rows


def save_books(books, database=None):
    """Skip title/price pairs already saved; never update or delete rows."""
    if database is None:
        database = get_database()
    existing = read_books(books, database)
    known_books = {book_key(book) for book in existing if book["price"] is not None}
    new_books = []
    for book in books:
        if book_key(book) not in known_books:
            new_books.append(book)
            known_books.add(book_key(book))
    if not new_books:
        return []
    return database.table("books").insert(new_books).execute().data


def verify_books(books, database):
    """Check that every scraped title and price can be read back from Supabase."""
    stored = read_books(books, database)
    keys = {book_key(book) for book in stored if book["price"] is not None}
    if any(book_key(book) not in keys for book in books):
        raise ValueError("Some books could not be verified in Supabase.")
