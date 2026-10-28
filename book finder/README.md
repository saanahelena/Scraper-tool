# Book Finder

React + Vite homepage displaying 20 books per page from Supabase. Includes case-insensitive title search, GBP price filters, and price/title sorting. Paginates through all matches, sorted by price from low to high by default.

## Supabase setup

1. Open your project in the Supabase Dashboard. Use **Connect** to find your Project URL and publishable key. You can also find publishable keys under **Settings > API Keys**. Use only a key beginning `sb_publishable_`.
2. Create `.env.local` inside `book finder`, beside `package.json`. Copy the variable names from `.env.example`, replacing the example values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Do not copy the Python scraper's `.env` or any secret/service_role key. Vite exposes `VITE_` variables in the browser: these values are public, and database access is protected by grants and Row Level Security (RLS). `.env.local` is ignored by Git.

3. In Supabase, open **Authentication > Policies** and select `public.books` (or use the table's RLS/policies controls). Check existing policies before adding one. Enable RLS and permit only SELECT for `anon`, using `true` as the policy expression. Do not add INSERT, UPDATE, DELETE, or ALL policies for `anon` or PUBLIC.
4. If there is no equivalent public SELECT policy, use the SQL Editor to run:

```sql
alter table public.books enable row level security;
grant usage on schema public to anon;
grant select on table public.books to anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.books from anon;

create policy "Book Finder public read access"
on public.books
for select
to anon
using (true);
```

This allows anyone with the public client to read all books; the app's limit of 20 is a display limit, not a security restriction. The SQL changes permissions, not book records. Do not recreate an equivalent policy if it already exists. Review policies and grants inherited from PUBLIC as well: permissions are additive. If you see existing write policies or PUBLIC write grants, review them before proceeding. A scraper using a server-side secret/service_role key bypasses RLS; other scraper roles may need their own policies.

5. Ensure the Data API is enabled and `public` is exposed under **Integrations > Data API** if requests report the table is unavailable.
6. Restart Vite after entering the credentials:

```sh
cd "book finder"
npm run dev
```

Open the URL printed in the terminal. You should see up to 20 book titles with GBP prices. Keep the terminal running and press Ctrl+C to stop it.

If no books appear even though the table has data, check RLS and SELECT permissions. If an error appears, check the Project URL, publishable key, internet connection, and table name. Never paste secret credentials into chat or browser code.

## Development

Dependencies are already installed. After a fresh checkout, run `npm install` in this folder first.

- `src/App.jsx`: fetches and displays books, loading, and errors.
- `src/supabaseClient.js`: reads frontend environment variables and creates the client.
- `src/App.css`: homepage styling.

```sh
npm run lint
npm run build
```

The Python scraper remains separate.

Official guides: https://supabase.com/docs/guides/getting-started/quickstarts/reactjs and https://supabase.com/docs/guides/getting-started/api-keys

## Title search

Type into the search box to search titles across the entire Supabase books table. The app waits 300 milliseconds after typing pauses, then applies a case-insensitive title filter in the database before returning the current page of up to 20 matches. It does not download a batch of books and search only that batch. Clearing the field restores the initial list. Older requests are cancelled when the text changes, and an empty search result shows a friendly message. No database records are changed.

## Price filters and sorting

Below the search field, enter a minimum price, maximum price, or both in GBP. Blank fields have no price restriction, and the range includes both endpoints. Negative prices and a minimum above the maximum show a helpful error. Filters work with or without a title search.

Choose Price: Low to High, Price: High to Low, Title: A–Z, or Title: Z–A. Supabase applies the title search, price range, and sorting to the entire table before returning the current page of up to 20 books. Equal values use ID as a consistent tie-breaker; missing prices appear last when sorting by price. Title ordering follows the database collation.

Clear filters removes the title search and both price limits, keeping your chosen sort order. Controls update results automatically after a short typing pause. The layout stacks vertically on small screens. All database operations are read-only SELECT queries.

## Pagination

Use Previous and Next below the results to browse 20 books per page. The page indicator shows the current page and total pages, and the match count shows how many books meet your search and price filters across the entire database. The last page may contain fewer than 20 books. With no matches, the app shows zero matching books and no pages to display.

Changing the title search, either price, or the sort order returns to page 1. Clear filters also returns to page 1. Previous is disabled on the first page and Next on the last page; both buttons are disabled during loading or errors. Pagination controls wrap on narrow screens.

The query requests an exact matching count using `select(..., { count: 'exact' })` and retrieves only the page's rows using `range(from, to)`. Page 1 requests rows 0–19; page 2 requests 20–39. Sorting by the chosen field followed by unique ID keeps equal prices/titles in a stable order. Search and filters are applied in Supabase before pagination. Concurrent database changes can still shift offset-based pages.

Pagination uses read-only SELECT requests. It needs no changes to the scraper, credentials, database records, or existing Supabase security configuration.

## Book-cover metadata (prepared; image display pending permission)

The separate `public.book_covers` table contains 1,000 mappings from existing book IDs to Books to Scrape product-page and catalogue-image URLs. Matches were verified by exact full title and numeric GBP price, not title alone. The original `books` table and scraper are unchanged. A foreign key with `ON DELETE RESTRICT` prevents orphaned cover metadata; it does not cascade changes into books.

Image-use review: Books to Scrape and its parent sandbox welcome scraping, but the reviewed pages did not provide an explicit licence for displaying/hotlinking or redistributing cover artwork. Scraping permission is not an image-use licence. Therefore every imported row has `permission_status = 'pending'` and no approval reference. No third-party book covers are displayed, downloaded for hosting, or automatically enabled.

Sources reviewed:
- https://books.toscrape.com/
- https://toscrape.com/

### Safety and permissions

- `supabase/book_covers.sql` documents the new table, constraints, and RLS policy. It is already applied through the guarded import; do not rerun it against the existing table.
- Only approved metadata with a nonempty `permission_reference` is readable by `anon` and `authenticated`. Those roles have SELECT only, with no INSERT/UPDATE/DELETE permission. Existing `books` policies were not changed.
- `permission_reference` is public metadata when approved: store a public permission URL or short nonsensitive reference, never private correspondence, passwords, or credentials.
- The frontend independently requires approval evidence and validates an HTTPS URL on `books.toscrape.com/media/` before creating an image element.
- Cover metadata is fetched only for the current page, separately from the existing book query. Missing metadata, metadata request failures, and pending permissions all keep the original pastel cards. They cannot change search results, counts, sorting, or pagination.
- Approved covers use `object-fit: contain`, fixed display space, lazy loading, descriptive alt text, and no-referrer requests. Failed images are removed so the original card remains. Burgundy typography and gold details remain around covers.

### Files and preparation

- `src/components/BookCover.jsx`: permission gate for covers.
- `src/components/CoverImage.jsx`: image display and error fallback.
- `src/lib/coverPermissions.js`: approval and source URL validation.
- `scripts/prepare_covers.py`: read-only database/source scan that produces a fresh backup, local mapping, checksum manifest, and guarded import SQL under the Git-ignored root `backups/` folder. It never executes SQL. Run from the project root with `.venv/bin/python 'book finder/scripts/prepare_covers.py'` only when a fresh mapping is needed. Its generated import creates a new table and deliberately fails if the table already exists; it is not an update/reimport tool.

The initial import was transactional and compared all existing book fields against a fresh 1,000-book backup both before and after inserting metadata. Independent API verification checked all 1,000 mappings and confirmed pending rows are invisible to the frontend. Backups contain book data only, not credentials.

### Enabling covers later

First confirm permission from an appropriate rights holder, including whether direct image linking is permitted and whether attribution is required. Then review and approve a controlled metadata-only update for the covered rows, recording evidence in `permission_reference` and changing `permission_status` to `approved`. Do not change books or weaken frontend write permissions. The current UI will display approved covers without another code change. If attribution or self-hosting is required, implement those requirements before approval; the current code supports only the original source image host.

### Cover checks

From `book finder`:

```sh
npm run build
npm run lint
node scripts/test-covers.mjs
```

For a local browser test of successful images and broken-image fallback, run:

```sh
node scripts/preview-cover-tests.mjs
```

Open http://127.0.0.1:5175/__cover-tests. This development-only test server uses locally generated SVG artwork, missing local URLs, and pending metadata; it never loads third-party covers. It is not part of the production app. Stop with Ctrl+C.

## Compact cards and book details

Collection titles display at most three lines with a CSS ellipsis; the complete title remains unchanged in React and Supabase. Titles use slightly smaller serif type with comfortable line spacing. Equal grid tracks and a reserved three-line title area keep card heights and price positions consistent.

Click anywhere on a card, or focus its title button and press Enter/Space, to open book details with the full title and GBP price. The native modal dialog supports Escape, a close button, backdrop dismissal, focus containment, and focus return to the originating card. Long popup titles wrap freely, and the dialog scrolls if needed on smaller screens. This feature makes no database writes and does not change search/filter/sort/pagination queries.

## Decorative editions, Reading Room, and My Bookshelf

The active collection now uses original CSS decorative covers rather than remote cover images. Each database ID gets a stable colour/frame/motif variation, with portrait proportions, three-line titles, prices below the cover, and a separate heart button. The same book has the same appearance in every section. Full titles remain available in the keyboard-accessible details dialog. The homepage's celestial illustration is unchanged.

The Reading Room independently selects four real books (IDs 3, 4, 7, and 16) from Supabase. It is a small editorial display, not a genre, rating, popularity ranking, or personalised recommendation. Its selection does not change when collection filters change. On mobile, this compact row scrolls horizontally within its container.

My Bookshelf saves title, ID, and the displayed GBP price in browser `localStorage`, under `between-the-pages.bookshelf.v1`. Hearts toggle saved books in every section. The saved shelf persists on refresh/reopening at the same site address and browser profile. It is local to this browser, with no accounts or database writes; localhost and 127.0.0.1 are different site addresses. Prices on the saved shelf are snapshots of the prices when saved. Clearing browser site data removes the shelf. If browser storage is unavailable, the interface explains that changes may last only for the current visit.

The active UI does not fetch cover metadata or render actual cover images, including in the popup. The previous cover preparation files and Supabase mappings remain intact for later use after permission review. The existing book query's search, price bounds, stable sorting, count, and 20-row pagination are unchanged. No scraper, database records, schema, policies, or credentials were changed for this redesign.

Validation:

```sh
npm run build
npm run lint
node scripts/test-bookshelf.mjs
```

Browser checks cover save/remove persistence, details and keyboard dismissal, independent Reading Room selection, search/filter/sort combinations, empty results, pagination, and narrow-screen layouts.
