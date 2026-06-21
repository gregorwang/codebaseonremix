PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE IF NOT EXISTS code_snippets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_file_path TEXT,
  code TEXT NOT NULL,
  project_context TEXT,
  user_confusion TEXT,
  ability_tags_json TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_code_snippets_user
ON code_snippets(user_id);

CREATE INDEX IF NOT EXISTS idx_code_snippets_status
ON code_snippets(status);
