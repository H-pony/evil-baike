-- Daily page views in Hong Kong time. No IP address, cookie, or user agent is stored.
CREATE TABLE IF NOT EXISTS page_view_daily (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (day, path)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS page_view_daily_path_day
  ON page_view_daily (path, day);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  event TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
);

CREATE INDEX IF NOT EXISTS submissions_submitted_at
  ON submissions (submitted_at DESC);
