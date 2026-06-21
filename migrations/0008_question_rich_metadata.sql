-- Migration 0008: add rich metadata columns to `questions` for the timu.MD refactor.
--
-- All columns are nullable and additive — no data is migrated, no existing column is altered.
-- The schema supports the 6 new question types (true_false, line_pick, code_fix,
-- diff_review, review_comment, free_explain) and the timu.MD v1.0 metadata model
-- (real-world impact, AI-review risk, TypeScript risk, server/client boundary,
-- expected fix scope, touched files, wrong-answer feedback, layer).
--
-- See tests/fixtures/baseline-2026-06-16.report.md and
-- docs/plans/purrfect-bouncing-lighthouse.md for context.

ALTER TABLE questions ADD COLUMN diff_snippet TEXT;
ALTER TABLE questions ADD COLUMN line_pick_lines_json TEXT;
ALTER TABLE questions ADD COLUMN code_fix_baseline TEXT;
ALTER TABLE questions ADD COLUMN expected_fix_scope TEXT;     -- 'one-line' | 'single-function' | 'single-file' | 'cross-file'
ALTER TABLE questions ADD COLUMN server_client_boundary TEXT; -- 'server' | 'client' | 'shared' | 'mixed-risk'
ALTER TABLE questions ADD COLUMN touched_files_json TEXT;
ALTER TABLE questions ADD COLUMN wrong_answer_feedback_json TEXT;
ALTER TABLE questions ADD COLUMN real_world_impact TEXT;
ALTER TABLE questions ADD COLUMN ai_review_risk TEXT;
ALTER TABLE questions ADD COLUMN type_safety_risk TEXT;
ALTER TABLE questions ADD COLUMN layer TEXT;                  -- 'basic' | 'code-reading' | 'state-reasoning' | 'ai-review' | 'typescript-review' | 'production-debugging' | 'free-response'

-- Backfill layer for legacy rows so the column is non-null going forward.
-- Authoring pipeline (Phase 3) writes layer explicitly; this just catches
-- the 1054 already-published questions so future NOT NULL constraints
-- can be added without rewriting history.
UPDATE questions SET layer = 'basic' WHERE layer IS NULL;
