"""Read-only source/database audit. Writes a backup, mapping and import SQL locally.
Run from the project root: .venv/bin/python 'book finder/scripts/prepare_covers.py'
Never executes SQL or writes to Supabase.
"""
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
import time
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[2]

def main():
    config = dotenv_values(ROOT / 'book finder/.env.local')
    url = config.get('VITE_SUPABASE_URL', '').rstrip('/')
    key = config.get('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    if not url.startswith('https://') or not key.startswith('sb_publishable_'):
        raise ValueError('Valid frontend publishable credentials required.')
    session = requests.Session()

    def read_books():
        rows = []
        while True:
            response = session.get(url + '/rest/v1/books', headers={'apikey': key, 'Prefer': 'count=exact'}, params={'select': '*', 'order': 'id.asc', 'offset': len(rows), 'limit': 200}, timeout=30)
            response.raise_for_status()
            batch = response.json()
            rows.extend(batch)
            total = int(response.headers['Content-Range'].split('/')[-1])
            if len(rows) == total:
                break
            if not batch or len(rows) > total:
                raise ValueError('Incomplete database read.')
        assert len(rows) == len({r['id'] for r in rows}) == 1000
        return rows

    before = read_books()
    folder = ROOT / 'backups'
    folder.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H%M%SZ')
    backup = folder / f'books-before-covers-{stamp}.json'
    backup.write_text(json.dumps(before, ensure_ascii=False, indent=2) + '\n')
    backup.chmod(0o600)
    assert json.loads(backup.read_text()) == before
    print('Verified fresh backup:', backup.name, '— 1000 records', flush=True)
    index = defaultdict(list)
    for page in range(1, 51):
        page_url = f'https://books.toscrape.com/catalogue/page-{page}.html'
        response = session.get(page_url, timeout=30)
        response.raise_for_status()
        response.encoding = 'utf-8'
        cards = BeautifulSoup(response.text, 'html.parser').select('article.product_pod')
        assert len(cards) == 20
        for card in cards:
            link = card.select_one('h3 a')
            image = card.select_one('.image_container img')
            assert link and image and image.get('src')
            price = Decimal(card.select_one('.price_color').get_text(strip=True).removeprefix('£'))
            image_url = urljoin(page_url, image['src'])
            source_url = urljoin(page_url, link['href'])
            assert urlparse(image_url).hostname == urlparse(source_url).hostname == 'books.toscrape.com'
            assert image_url.startswith('https://books.toscrape.com/media/')
            index[(link['title'], price)].append((source_url, image_url))
        if page % 10 == 0:
            print('Source pages checked:', page, flush=True)
        if page < 50:
            time.sleep(1)
    mapping = []
    for book in before:
        matches = index[(book['title'], Decimal(str(book['price'])))]
        assert len(matches) == 1, f"Ambiguous or missing match for book ID {book['id']}"
        source_url, image_url = matches[0]
        mapping.append({'book_id': book['id'], 'source_url': source_url, 'image_url': image_url, 'permission_status': 'pending', 'permission_reference': None})
    assert len(mapping) == 1000 == len(index)
    assert len({r['source_url'] for r in mapping}) == 1000
    assert before == read_books(), 'Books changed while mapping; do not import.'
    path = folder / 'book-cover-mapping.json'
    path.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + '\n')
    path.chmod(0o600)
    # Embed the full original snapshot so SQL checks every existing book before and after.
    snapshot = json.dumps(before, ensure_ascii=False)
    payload = json.dumps(mapping, ensure_ascii=False)
    schema = (ROOT / 'book finder/supabase/book_covers.sql').read_text()
    sql = 'BEGIN;\nLOCK TABLE public.books IN SHARE MODE;\n'
    guard = "IF (SELECT jsonb_agg(to_jsonb(b) ORDER BY id) FROM public.books b) IS DISTINCT FROM $books$" + snapshot + "$books$::jsonb THEN RAISE EXCEPTION 'Books differ from verified backup'; END IF;"
    sql += 'DO $guard$ BEGIN ' + guard + ' END $guard$;\n'
    sql += schema + '\n'
    sql += 'INSERT INTO public.book_covers (book_id,source_url,image_url,permission_status,permission_reference)\nSELECT book_id,source_url,image_url,permission_status,permission_reference FROM jsonb_to_recordset($mapping$' + payload + '$mapping$::jsonb) AS x(book_id bigint,source_url text,image_url text,permission_status text,permission_reference text);\n'
    sql += "DO $guard$ BEGIN " + guard + " IF (SELECT count(*) FROM public.book_covers) <> 1000 OR EXISTS (SELECT 1 FROM public.book_covers WHERE permission_status <> 'pending' OR permission_reference IS NOT NULL) THEN RAISE EXCEPTION 'Invalid cover import'; END IF; END $guard$;\nCOMMIT;\nSELECT (SELECT count(*) FROM public.books) AS books_preserved, (SELECT count(*) FROM public.book_covers) AS cover_records, (SELECT count(*) FROM public.book_covers WHERE permission_status='approved') AS approved_covers;\n"
    (folder / 'import-book-covers.sql').write_text(sql)
    (folder / 'book-cover-import-verification.json').write_text(json.dumps({'backup_file': backup.name, 'backup_sha256': hashlib.sha256(backup.read_bytes()).hexdigest(), 'mapping_sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'rows': 1000, 'image_permission': 'pending; no frontend image display permitted'}, indent=2) + '\n')
    print('Prepared 1000 unique ID-to-cover mappings and guarded SQL import. No database writes.', flush=True)

if __name__ == '__main__':
    try:
        main()
    except requests.RequestException:
        raise SystemExit('Network request failed; connection details omitted. No SQL executed.') from None
