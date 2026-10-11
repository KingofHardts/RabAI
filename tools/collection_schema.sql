-- A website collection's database (one per site: rabai-collection-aish, ...), built by
-- tools/collection_build.py and read by web/lib/library/testing.ts like the testing library.
--
-- It holds the testing library's own tables (tools/library_schema.sql: works, editions, titles,
-- versions, passages, passages_fts, ...), each article a title and each paragraph a passage, plus
-- the two tables below. Keep the builder and the reader in step with both files.

-- One row per article: where it came from and who wrote it. The text itself is in passages.
CREATE TABLE IF NOT EXISTS articles (
  title_id INTEGER PRIMARY KEY,   -- titles.id
  url TEXT NOT NULL UNIQUE,       -- the article's address on the site
  site TEXT NOT NULL,             -- the site's name as shown, e.g. "Aish.com"
  site_id TEXT,                   -- the site's own id for the article (a WordPress post id)
  author TEXT,                    -- as the site credits it
  published TEXT,                 -- ISO date and time, when the site gives one
  modified TEXT,                  -- when the site last changed it
  section TEXT,                   -- the site's own section path, e.g. "Ask The Rabbi > Shabbat"
  fetched_on TEXT NOT NULL,       -- when it was copied
  checksum TEXT NOT NULL          -- of the copied text, to notice when the site changes it
);
CREATE INDEX IF NOT EXISTS articles_site_id ON articles (site_id);

-- Where the copying stands, per canon edition, so a run can pick up where the last one stopped.
CREATE TABLE IF NOT EXISTS crawl_state (key TEXT PRIMARY KEY, value TEXT);
