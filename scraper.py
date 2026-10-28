"""Scrape up to 50 pages of books and save new books to Supabase."""

import argparse
from decimal import Decimal, InvalidOperation
import time

import requests
from bs4 import BeautifulSoup


def scrape_page(session, page):
    """Download one page and turn its 20 book cards into dictionaries."""
    url = f"https://books.toscrape.com/catalogue/page-{page}.html"
    # Retry failed downloads twice, with a pause. Never retry database inserts blindly.
    for attempt in range(3):
        try:
            response = session.get(url, timeout=30)
            response.raise_for_status()
            break
        except requests.RequestException:
            if attempt == 2:
                raise SystemExit(f"Could not download page {page} after 3 attempts. Run again later.") from None
            print(f"Page {page}: download failed; retrying shortly.", flush=True)
            time.sleep(2 * (attempt + 1))

    response.encoding = "utf-8"
    soup = BeautifulSoup(response.text, "html.parser")
    cards = soup.select("article.product_pod")
    if len(cards) != 20:
        raise SystemExit(f"Page {page}: expected 20 books; found {len(cards)}. The site may have changed.")

    books = []
    for card in cards:
        link = card.select_one("h3 a")
        price_tag = card.select_one("p.price_color")
        if link is None or not link.get("title") or price_tag is None:
            raise SystemExit(f"Page {page}: a title or price is missing.")
        price_text = price_tag.get_text(strip=True)
        try:
            if not price_text.startswith("£"):
                raise ValueError("Expected GBP")
            price = Decimal(price_text[1:])
            if not price.is_finite() or price < 0:
                raise ValueError("Invalid price")
        except (InvalidOperation, ValueError):
            raise SystemExit(f"Page {page}: found an invalid GBP price.") from None
        books.append({"title": link["title"], "price": float(price)})
    return books


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pages", type=int, default=50, help="Pages to process, from 1 to 50 (default: 50)")
    parser.add_argument("--preview", action="store_true", help="Display books without using Supabase")
    args = parser.parse_args()
    if not 1 <= args.pages <= 50:
        parser.error("--pages must be between 1 and 50")

    if not args.preview:
        from database import get_database, save_books, verify_books
        database = get_database()

    processed = saved_total = skipped_total = 0
    with requests.Session() as session:
        for page in range(1, args.pages + 1):
            if page > 1:
                time.sleep(1)  # Be polite: leave a small gap between page requests.
            books = scrape_page(session, page)
            if args.preview:
                for book in books:
                    print(f"{book['title']} — £{book['price']:.2f}")
            else:
                try:
                    saved = save_books(books, database)
                    verify_books(books, database)
                except Exception:
                    raise SystemExit(
                        f"Page {page}: database save or read-back verification failed. "
                        "Previous pages remain saved. Check your connection and Data API access, "
                        "then rerun: matching books will be skipped. Credentials are not shown."
                    ) from None
                saved_total += len(saved)
                skipped_total += len(books) - len(saved)
            processed += len(books)
            print(
                f"Page {page}/{args.pages} complete | Books processed: {processed}"
                + (" (preview)" if args.preview else
                   f" | New: {saved_total} | Already saved: {skipped_total} | Verified: {processed}"),
                flush=True,
            )

    print(f"Finished: {args.pages} pages, {processed} books processed.")
    if not args.preview:
        print(f"Saved {saved_total} new books; skipped {skipped_total} matches.")
        print(f"Verified all {processed} scraped titles and GBP prices by reading them back from Supabase.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        raise SystemExit("Stopped. Completed pages remain saved; rerun to continue safely.") from None
