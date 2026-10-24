-- Apply once, after 0001. Existing submissions remain in the review queue.
ALTER TABLE submissions ADD COLUMN receipt_hash TEXT;
ALTER TABLE submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'received';
ALTER TABLE submissions ADD COLUMN response TEXT NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN published_path TEXT NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN updated_at TEXT;
ALTER TABLE submissions ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX submissions_receipt_hash ON submissions (receipt_hash);
CREATE INDEX submissions_status_id ON submissions (status, id DESC);
CREATE TABLE submission_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES submissions(id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  response TEXT NOT NULL DEFAULT '',
  published_path TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT 'administrator',
  changed_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
);
CREATE INDEX submission_history_entry ON submission_history (submission_id, id DESC);
