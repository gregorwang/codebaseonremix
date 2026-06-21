PRAGMA defer_foreign_keys = TRUE;

-- Step 1: clean up existing duplicates inside each lesson.
--
-- The old exam seed wrote the same (lesson_id, type, prompt) up to 4× into
-- the exam pool. Pick a canonical row per group (smallest created_at then
-- smallest id), rewrite every reference, then drop the losers.
--
-- D1 blocks CREATE TEMP TABLE via its authorizer, so we use a regular
-- table that we drop at the end of the migration.

DROP TABLE IF EXISTS _question_dup_map;
CREATE TABLE _question_dup_map (
  loser_id TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL
);

INSERT INTO _question_dup_map (loser_id, canonical_id)
SELECT id, canonical_id FROM (
  SELECT
    id,
    lesson_id,
    type,
    prompt,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY lesson_id, type, prompt
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY lesson_id, type, prompt
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM questions
)
WHERE rn > 1;

UPDATE answer_attempts
SET question_id = (
  SELECT canonical_id FROM _question_dup_map WHERE loser_id = answer_attempts.question_id
)
WHERE question_id IN (SELECT loser_id FROM _question_dup_map);

UPDATE mistakes
SET question_id = (
  SELECT canonical_id FROM _question_dup_map WHERE loser_id = mistakes.question_id
)
WHERE question_id IN (SELECT loser_id FROM _question_dup_map);

DELETE FROM questions
WHERE id IN (SELECT loser_id FROM _question_dup_map);

DROP TABLE _question_dup_map;

-- Step 2: lock in the invariant. Future seeds / admin inserts cannot write
-- a duplicate (lesson_id, type, prompt) row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_lesson_type_prompt
ON questions(lesson_id, type, prompt);
