# Book scraper

A beginner Python project that collects and saves the first 10 book titles and prices from
[Books to Scrape](https://books.toscrape.com/), a website made for scraping practice.
Its prices are fictional. Books are saved in Supabase using your local `.env` settings.

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

With the environment activated and `.env` configured (see below), run:

```sh
python scraper.py
```

You should see 10 numbered titles and prices, followed by `Collected 10 books.`
The scraper automatically saves new titles and reads all 10 back to verify prices.
Running it again skips titles already in the table. Existing records stay unchanged.
You need an internet connection. Download errors appear as a readable message.

To display books without connecting to Supabase, run `python scraper.py --preview`.

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
6. `database.py` reads the credentials from `.env` and checks which titles exist.
7. New books are inserted with numeric prices (for example, `51.77` without `£`).
8. The scraper reads the books back and verifies their titles and prices.

The scraper only reads the first page; it does not need to visit individual books.
The comments in `scraper.py` explain each step.

`.gitignore` keeps the local environment and generated Python files out of Git.
To leave the environment, run `deactivate`.

## Connect to Supabase: test one book first

The database setup expects `public.books` with auto-generated `id`, default
`created_at`, text `title`, and numeric `price`. Python sends only title and price.
Your existing manually inserted book is not updated or deleted.

1. Activate the environment and install the added packages:

   ```sh
   source .venv/bin/activate
   python -m pip install -r requirements.txt
   ```

2. Copy the credential template once (skip this if you already have `.env`):

   ```sh
   cp -n .env.example .env
   ```

3. Open your Supabase project dashboard. The **Connect** dialog shows your
   **Project URL**. Copy it into `SUPABASE_URL` in your local `.env` file.
   Open **Settings → API Keys**, find or create a **secret key** (`sb_secret_...`),
   and copy it into `SUPABASE_SECRET_KEY` in `.env`.
   Use the API project URL, not a PostgreSQL connection string or database password.

   This is a trusted local script: the secret key has elevated access and bypasses
   Row Level Security. Keep it private; never paste it in chat, commit it, or use it
   in browser code. `.gitignore` excludes `.env`, while `.env.example` contains only
   placeholders. See [Supabase's API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

4. Save `.env`, then run **only the one-book check**:

   ```sh
   python check_supabase.py
   ```

   This inserts a book titled `Python connection test book` priced at `12.34`,
   then reads it back by its generated id and checks the title and price.
   Success ends with `Success! Python can insert and read a book in Supabase.`
   The test row stays in your table. Each run adds one new test row, so check your
   table before retrying if a request fails. Existing rows are left alone.

If the check fails, confirm the URL and secret key locally. Also check that the
Data API is enabled and `public.books` is exposed with insert/select access for
the service role in your project's Data API settings. Do not disable RLS or add
public write policies for this script. Avoid sharing `.env` or raw credential logs.

## Run the complete scraper

After the one-book check succeeds, run:

```sh
python scraper.py
```

This removes the `£` symbol and sends new books to Supabase in one batch.
Supabase generates `id` and `created_at`. Open **Table Editor → books** in the
Supabase dashboard to see the saved records.

Duplicate detection uses the full, exact title. Repeated runs skip existing titles,
including manually entered ones, and never update or delete them. If an existing
title has a different price, verification reports it and leaves it unchanged.
Run one scraper at a time: this simple check prevents duplicates in sequential
runs. Simultaneous processes would need a database unique constraint for a strict
guarantee; this project does not alter your database schema or existing records.

The first run reports how many new books it saved. A second run should report
`Saved 0 new books; skipped 10 existing titles.` Both should end with
`Verified all 10 titles and prices by reading them back from Supabase.`
