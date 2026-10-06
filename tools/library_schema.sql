-- The private testing library's database (built by tools/library_build.py, read by web/lib/library/testing.ts).
-- Keep both in step with this file.

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE works (id TEXT PRIMARY KEY, title TEXT, category TEXT, streams TEXT);
-- word_tool: a dictionary RabAI may use only for what words mean (canon: word_tool_only).
CREATE TABLE editions (id INTEGER PRIMARY KEY, work TEXT, name TEXT, language TEXT, approved INTEGER, word_tool INTEGER DEFAULT 0);
CREATE TABLE titles (id INTEGER PRIMARY KEY, title TEXT UNIQUE, he_title TEXT, work TEXT, categories TEXT, depth INTEGER, section_names TEXT);
CREATE TABLE versions (id INTEGER PRIMARY KEY, name TEXT, license TEXT, source TEXT, UNIQUE (name, license, source));
CREATE TABLE passages (
  id INTEGER PRIMARY KEY,
  ref TEXT NOT NULL,          -- Sefaria-style reference: "Genesis 1:1", "Berakhot 2a:3"
  title_id INTEGER NOT NULL,
  edition_id INTEGER NOT NULL,
  version_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,       -- reading order across the whole library
  text TEXT NOT NULL
);
-- Contentless full-text index over each passage's text, with Hebrew vowels and cantillation removed.
CREATE VIRTUAL TABLE passages_fts USING fts5(plain, content='', tokenize='unicode61 remove_diacritics 2');
-- Sefaria's cross-references, kept where both ends are in the library (each end is its first passage).
-- kind 'dictionary': a dictionary entry (a) and a line it cites (b).
CREATE TABLE links (a TEXT NOT NULL, b TEXT NOT NULL, kind TEXT);
-- Dictionary headwords, without vowels, each pointing at its entry ("Jastrow, אָב II").
CREATE TABLE lexicon (word TEXT NOT NULL, passage_id INTEGER NOT NULL);

-- @indexes
-- (created after loading)
CREATE INDEX passages_ref ON passages (ref);
CREATE INDEX passages_title_seq ON passages (title_id, seq);
CREATE INDEX links_a ON links (a);
CREATE INDEX links_b ON links (b);
CREATE INDEX lexicon_word ON lexicon (word);
