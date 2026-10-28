"""Download and display the first 10 books from Books to Scrape."""

import requests
from bs4 import BeautifulSoup


def main():
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


# Run main() when this file is executed directly.
if __name__ == "__main__":
    main()
