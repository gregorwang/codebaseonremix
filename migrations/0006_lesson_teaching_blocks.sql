ALTER TABLE lessons ADD COLUMN teaching_blocks_json TEXT;
ALTER TABLE lessons ADD COLUMN lesson_meta_json TEXT;
ALTER TABLE exams ADD COLUMN exam_briefing_json TEXT;
ALTER TABLE questions ADD COLUMN debug_meta_json TEXT;
ALTER TABLE questions ADD COLUMN ai_review_meta_json TEXT;
ALTER TABLE questions ADD COLUMN branch_scenario TEXT;
