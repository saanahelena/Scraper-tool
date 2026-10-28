-- Applied inside the guarded import transaction; fails rather than overwriting an existing table.
CREATE TABLE public.book_covers (
  book_id bigint PRIMARY KEY REFERENCES public.books(id) ON DELETE RESTRICT,
  source_url text NOT NULL CHECK (source_url LIKE 'https://books.toscrape.com/catalogue/%'),
  image_url text NOT NULL CHECK (image_url LIKE 'https://books.toscrape.com/media/%'),
  permission_status text NOT NULL DEFAULT 'pending'
    CHECK (permission_status IN ('pending', 'approved', 'denied')),
  permission_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (permission_status <> 'approved' OR length(btrim(permission_reference)) > 0 AND permission_reference IS NOT NULL)
);
ALTER TABLE public.book_covers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.book_covers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.book_covers TO anon, authenticated;
-- Service-role access is used only for controlled imports and later permission reviews.
GRANT ALL ON public.book_covers TO service_role;
CREATE POLICY "Read approved cover metadata" ON public.book_covers
  FOR SELECT TO anon, authenticated
  USING (permission_status = 'approved' AND permission_reference IS NOT NULL AND length(btrim(permission_reference)) > 0);
