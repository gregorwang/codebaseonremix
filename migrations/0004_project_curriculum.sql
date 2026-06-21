PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE IF NOT EXISTS project_sources (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  display_name TEXT NOT NULL,
  framework TEXT NOT NULL DEFAULT 'react-router',
  status TEXT NOT NULL DEFAULT 'pending',
  file_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_sources_status
ON project_sources(status);

CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_kind TEXT NOT NULL DEFAULT 'unknown',
  language TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT,
  summary TEXT,
  importance_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES project_sources(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_files_source_path
ON project_files(source_id, file_path);

CREATE INDEX IF NOT EXISTS idx_project_files_kind
ON project_files(source_id, file_kind);

CREATE TABLE IF NOT EXISTS code_assets (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  file_id TEXT,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  code TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  asset_type TEXT NOT NULL,
  business_context TEXT,
  user_learning_value TEXT,
  detected_concepts_json TEXT,
  ability_tags_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES project_sources(id),
  FOREIGN KEY (file_id) REFERENCES project_files(id)
);

CREATE INDEX IF NOT EXISTS idx_code_assets_source
ON code_assets(source_id);

CREATE INDEX IF NOT EXISTS idx_code_assets_status
ON code_assets(source_id, status);

CREATE TABLE IF NOT EXISTS curriculum_blueprints (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  generated_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES project_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_blueprints_source
ON curriculum_blueprints(source_id);

CREATE TABLE IF NOT EXISTS curriculum_drafts (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  blueprint_id TEXT,
  title TEXT NOT NULL,
  generated_courses_json TEXT NOT NULL,
  generated_exams_json TEXT,
  generated_abilities_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES project_sources(id),
  FOREIGN KEY (blueprint_id) REFERENCES curriculum_blueprints(id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_drafts_source
ON curriculum_drafts(source_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_drafts_status
ON curriculum_drafts(status);

ALTER TABLE courses ADD COLUMN source_id TEXT;
ALTER TABLE courses ADD COLUMN origin TEXT NOT NULL DEFAULT 'sample';
ALTER TABLE courses ADD COLUMN blueprint_id TEXT;

ALTER TABLE lessons ADD COLUMN source_id TEXT;
ALTER TABLE lessons ADD COLUMN source_files_json TEXT;
ALTER TABLE lessons ADD COLUMN related_asset_ids_json TEXT;

ALTER TABLE questions ADD COLUMN source_id TEXT;
ALTER TABLE questions ADD COLUMN asset_id TEXT;

ALTER TABLE exams ADD COLUMN source_id TEXT;
ALTER TABLE exams ADD COLUMN origin TEXT NOT NULL DEFAULT 'sample';
ALTER TABLE exams ADD COLUMN blueprint_id TEXT;

CREATE INDEX IF NOT EXISTS idx_courses_origin
ON courses(origin, is_published);
