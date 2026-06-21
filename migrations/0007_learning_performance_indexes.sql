CREATE INDEX IF NOT EXISTS idx_answer_attempts_user_lesson
ON answer_attempts(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_answer_attempts_user_course
ON answer_attempts(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_questions_lesson_published
ON questions(lesson_id, is_published);

CREATE INDEX IF NOT EXISTS idx_lessons_course_published
ON lessons(course_id, is_published);

CREATE INDEX IF NOT EXISTS idx_mistakes_user_resolved
ON mistakes(user_id, is_resolved);

CREATE INDEX IF NOT EXISTS idx_course_progress_user
ON course_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course
ON lesson_progress(user_id, course_id);
