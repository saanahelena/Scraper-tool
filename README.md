# Book scraper

A beginner Python project that prints the first 10 book titles and prices from
[Books to Scrape](https://books.toscrape.com/), a website made for scraping practice.
Its prices are fictional.

## Set up on macOS

Open a terminal in this repository's folder and run:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

- The first command creates an isolated Python environment in `.venv`.
- The second activates it for this terminal. Repeat this when opening a new terminal.
- The third installs the packages listed in `requirements.txt` into that environment.

## Run

With the environment activated, run:

```sh
python scraper.py
```

You should see 10 numbered titles and prices, followed by `Collected 10 books.`
You need an internet connection. Download errors appear as a readable message.

You can also run without activating the environment:

```sh
.venv/bin/python scraper.py
```

## How it works

1. `requests` downloads the homepage in one request.
2. `BeautifulSoup` reads the HTML, the code describing the webpage.
3. `select("article.product_pod")[:10]` finds book cards and keeps the first 10.
4. For each card, `h3 a` finds the title link and `p.price_color` finds the price.
5. The loop prints each full title and its price in British pounds.

The scraper only reads the first page; it does not need to visit individual books.
The comments in `scraper.py` explain each step.

`.gitignore` keeps the local environment and generated Python files out of Git.
To leave the environment, run `deactivate`.
