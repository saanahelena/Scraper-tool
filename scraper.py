"""Collect 10 books and save new titles to Supabase."""

import argparse
from decimal import Decimal

import requests
from bs4 import BeautifulSoup


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", action="store_true", help="Display books without saving")
    args = parser.parse_args()
    # Download the first page. A timeout prevents waiting forever.
    url = "https://books.toscrape.com/"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()  # Report HTTP errors, such as a missing page.
    except requests.RequestException as error:
        raise SystemExit(f"Could not download the books: {error}")

    # UTF-8 makes sure the pound symbol (£) displays correctly.
    response.encoding = "utf-8"
    soup = BeautifulSoup(response.text, "html.parser")

    # Each article with class 'product_pod' contains one book.
    books = soup.select("article.product_pod")[:10]
    if len(books) != 10:
        raise SystemExit("Expected 10 books. The website layout may have changed.")

    results = []
    for book in books:
        title_link = book.select_one("h3 a")
        price_tag = book.select_one("p.price_color")
        if title_link is None or price_tag is None or not title_link.get("title"):
            raise SystemExit("Could not find a title or price. The page may have changed.")

        # The title attribute contains the full title, even when displayed text is shortened.
        title = title_link["title"]
        price = price_tag.get_text(strip=True)
        results.append((title, price))

    for number, (title, price) in enumerate(results, start=1):
        print(f"{number}. {title} — {price}")

    print(f"\nCollected {len(results)} books.")

    if not args.preview:
        from database import get_database, save_books

        # Remove the currency symbol; Supabase's numeric column needs a number.
        rows = [
            {"title": title, "price": float(Decimal(price.removeprefix("£")))}
            for title, price in results
        ]
        try:
            saved = save_books(rows)
            # Read the actual database rows back to verify titles and numeric prices.
            stored = (
                get_database().table("books").select("title, price")
                .in_("title", [row["title"] for row in rows]).execute().data
            )
        except Exception:
            raise SystemExit(
                "Supabase upload failed. Check .env and Data API access. "
                "Check your table before retrying to avoid duplicates."
            ) from None
        print(f"Saved {len(saved)} new books; skipped {len(rows) - len(saved)} existing titles.")
        for book in rows:
            matches = [row for row in stored if row["title"] == book["title"]]
            if not matches:
                raise SystemExit("Verification failed: a scraped title is missing from Supabase.")
            if not any(Decimal(str(row["price"])) == Decimal(str(book["price"])) for row in matches):
                raise SystemExit(
                    f"Existing price differs for: {book['title']}. "
                    "The existing record was left unchanged."
                )
        print("Verified all 10 titles and prices by reading them back from Supabase.")


# Run main() when this file is executed directly.
if __name__ == "__main__":
    main()
