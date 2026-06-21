PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT NOT NULL,
  project_context TEXT,
  difficulty TEXT NOT NULL,
  ability_tags_json TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  learning_goal TEXT NOT NULL,
  source_file_path TEXT,
  source_summary TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lessons_course_slug
ON lessons(course_id, slug);

CREATE INDEX IF NOT EXISTS idx_lessons_course
ON lessons(course_id);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  code TEXT,
  options_json TEXT,
  blanks_json TEXT,
  sort_items_json TEXT,
  correct_answer_json TEXT NOT NULL,
  explanation_json TEXT NOT NULL,
  ability_tags_json TEXT NOT NULL,
  mistake_types_json TEXT,
  difficulty TEXT NOT NULL,
  source_file_path TEXT,
  source_note TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE INDEX IF NOT EXISTS idx_questions_lesson
ON questions(lesson_id);

CREATE INDEX IF NOT EXISTS idx_questions_type
ON questions(type);

CREATE TABLE IF NOT EXISTS answer_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  user_answer_json TEXT NOT NULL,
  normalized_answer_json TEXT,
  is_correct INTEGER NOT NULL,
  mistake_type TEXT,
  ability_tags_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE INDEX IF NOT EXISTS idx_answer_attempts_user
ON answer_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_answer_attempts_question
ON answer_attempts(question_id);

CREATE INDEX IF NOT EXISTS idx_answer_attempts_user_created
ON answer_attempts(user_id, created_at);

CREATE TABLE IF NOT EXISTS mistakes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  last_answer_json TEXT NOT NULL,
  correct_answer_json TEXT NOT NULL,
  wrong_count INTEGER NOT NULL DEFAULT 1,
  mistake_type TEXT,
  ability_tags_json TEXT NOT NULL,
  ai_summary TEXT,
  is_resolved INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  last_wrong_at TEXT NOT NULL,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mistakes_user_question
ON mistakes(user_id, question_id);

CREATE INDEX IF NOT EXISTS idx_mistakes_user_review
ON mistakes(user_id, is_resolved, next_review_at);

CREATE TABLE IF NOT EXISTS ability_scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ability_tag TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  last_practiced_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ability_scores_user_tag
ON ability_scores(user_id, ability_tag);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed_question_count INTEGER NOT NULL DEFAULT 0,
  total_question_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson
ON lesson_progress(user_id, lesson_id);

CREATE TABLE IF NOT EXISTS course_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  completed_lesson_count INTEGER NOT NULL DEFAULT 0,
  total_lesson_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_progress_user_course
ON course_progress(user_id, course_id);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  course_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  scenario TEXT NOT NULL,
  tasks_json TEXT NOT NULL,
  passing_score REAL NOT NULL DEFAULT 80,
  ability_tags_json TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  weak_abilities_json TEXT,
  feedback_json TEXT NOT NULL,
  is_passed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);

CREATE INDEX IF NOT EXISTS idx_exam_results_user
ON exam_results(user_id);

CREATE INDEX IF NOT EXISTS idx_exam_results_exam
ON exam_results(exam_id);
