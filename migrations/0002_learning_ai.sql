PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE IF NOT EXISTS ai_question_drafts (
  id TEXT PRIMARY KEY,
  snippet_id TEXT,
  created_by TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_file_path TEXT,
  source_code TEXT NOT NULL,
  project_context TEXT,
  generation_goal TEXT NOT NULL,
  target_abilities_json TEXT NOT NULL,
  preferred_question_types_json TEXT NOT NULL,
  generated_json TEXT NOT NULL,
  validation_result_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_question_drafts_status
ON ai_question_drafts(status);

CREATE INDEX IF NOT EXISTS idx_ai_question_drafts_creator
ON ai_question_drafts(created_by);

CREATE TABLE IF NOT EXISTS ai_explanation_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT,
  attempt_id TEXT,
  feature TEXT NOT NULL,
  prompt_type TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_text TEXT,
  provider TEXT,
  model TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_explanation_logs_user
ON ai_explanation_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_explanation_logs_question
ON ai_explanation_logs(question_id);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  feature TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost REAL,
  latency_ms INTEGER,
  success INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user
ON ai_usage_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature
ON ai_usage_logs(feature);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  detail_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin
ON admin_audit_logs(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
ON admin_audit_logs(target_type, target_id);
