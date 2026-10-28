"""Insert ONE test book, then read that exact row back by its generated id."""

from decimal import Decimal

from database import get_database


def main():
    database = get_database()
    book = {"title": "Python connection test book", "price": 12.34}
    # No update or delete: existing books are left alone.
    inserted = database.table("books").insert(book).execute().data
    if not inserted or len(inserted) != 1:
        raise SystemExit("Insert returned no single row. Check the books table before retrying.")

    book_id = inserted[0]["id"]
    print(f"Inserted one test book with id {book_id}.")
    print("Reading that row back. If this fails, the inserted row may still exist.")
    rows = (
        database.table("books")
        .select("id, created_at, title, price")
        .eq("id", book_id)
        .execute()
        .data
    )
    if (len(rows) != 1 or rows[0]["title"] != book["title"]
            or Decimal(str(rows[0]["price"])) != Decimal("12.34")):
        raise SystemExit("The read-back did not match the inserted book. Check your table.")
    print(f"Verified: {rows[0]['title']} — {rows[0]['price']}")
    print("Success! Python can insert and read a book in Supabase.")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Avoid printing raw errors that might contain connection details.
        raise SystemExit(
            "Supabase test failed. Check your internet, .env values, and Data API "
            "access for public.books. A test row may already exist; check before retrying."
        ) from None
