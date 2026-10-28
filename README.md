# Book scraper

A beginner Python scraper for [Books to Scrape](https://books.toscrape.com/),
which provides 1,000 practice books across 50 pages. Prices are fictional GBP.
It collects full titles and prices, saves new books to Supabase, and reads them
back to verify the saved values.

## Setup on macOS

Open a terminal in this repository:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

The environment keeps this project's packages separate. If you already set it up,
just activate it with `source .venv/bin/activate`.

## Configure Supabase once

Your existing `public.books` table needs these columns:

| Column | Type | Default |
| --- | --- | --- |
| id | int8 primary key | Automatically generated |
| created_at | timestamptz | now() |
| title | text | |
| price | numeric | |

Python sends only title and price. The table structure is not changed.

If you do not already have `.env`, copy the placeholder template:

```sh
cp -n .env.example .env
```

Open `.env` privately in your editor. In your Supabase dashboard:

1. Open **Connect** and copy the **Project URL** into `SUPABASE_URL`.
2. Open **Settings → API Keys** and copy a secret key (`sb_secret_...`) into
   `SUPABASE_SECRET_KEY`. Create one if needed.
3. Save `.env`. Use the API project URL, not a database connection string.

The secret key has elevated access and bypasses Row Level Security. Keep it in
this trusted local script's environment; never share it in chat, screenshots,
browser code, or Git. `.env` is ignored by Git. `.env.example` has placeholders only.
See [Supabase's API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

For an initial connection check, `python check_supabase.py` inserts and reads one
clearly named test book. Each run of that separate test adds a test row.
You do not need to repeat it once the connection works.

## Test two pages first

```sh
python scraper.py --pages 2
```

This processes 40 books, saves new matches, and checks their titles and prices by
reading them back. It reports progress after every completed page.

## Run all 50 pages

```sh
python scraper.py
```

The default is 50 pages, or 1,000 books. It pauses one second between pages, so
allow a few minutes for website and database requests. Progress shows pages,
books processed, new books saved, existing matches skipped, and books verified.
The final line confirms all 1,000 scraped titles and GBP prices were read back.

You can run without activating the environment with `.venv/bin/python scraper.py`.
To display books without accessing Supabase, use:

```sh
python scraper.py --pages 2 --preview
```

Open **Supabase → Table Editor → books** to see the saved records. Your total
row count also includes manually entered books and any connection-test rows.

## How it works

1. `requests` downloads each catalogue page with a 30-second timeout.
2. `BeautifulSoup` finds the 20 book cards on each page.
3. The link's `title` attribute supplies the full title, including text shortened
   on the visible page. The price is checked as GBP and converted from `£51.77`
   to the number `51.77` for the database's numeric column.
4. `database.py` uses the existing `.env` connection and checks title/price pairs
   in small batches. It paginates reads to avoid database response-size limits.
5. Only new pairs are inserted; saved rows are read back and compared using
   `Decimal` so equivalent numeric formats match.

## Duplicate prevention and existing records

A duplicate is an exact full title plus the same numeric price. Books can share
a title, so title alone is not used. A different price creates a separate row;
it never overwrites an existing record. Repeated runs skip matches, including
matches saved on earlier pages or previous interrupted runs.

Run one scraper at a time. This application check prevents duplicates during
sequential runs. Simultaneous writers would require a database unique constraint
for a strict guarantee. No existing records are updated or deleted, and no
schema change is performed. Existing duplicates are left untouched.

## Errors and restarting

Failed website downloads are retried twice with a pause. Missing book fields,
invalid prices, or an unexpected number of cards stop the scraper with a message.
Database errors stop processing without printing credentials. Completed pages
remain saved; fix the connection and run the command again to skip saved matches.
Database inserts are not automatically retried because a response can be lost
after the server has saved the books.

If Supabase access fails, check `.env` locally, your internet connection, and
Data API access to `public.books` with insert/select grants for the service role.
Do not disable RLS or share raw credential logs. Press Ctrl+C to stop the scraper.
To leave the Python environment, run `deactivate`.
