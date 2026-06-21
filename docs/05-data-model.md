# 05-data-model.md

# AI 项目接管训练器：D1 数据模型设计

## 1. 数据模型目标

数据模型服务完整第一版，不是静态 Demo。

需要支持：

- 课程。
- 关卡。
- 题目。
- 多题型答案。
- 用户答题记录。
- 错题本。
- 能力树。
- 阶段考试。
- AI 讲解日志。
- AI 出题草稿。
- 代码片段库。
- 管理审核。

---

## 2. 核心实体关系

```txt
Course
  └── Lesson
        └── Question
              └── AnswerAttempt
              └── Mistake

User
  └── LessonProgress
  └── AbilityScore
  └── ExamResult
  └── CodeSnippet
  └── AiExplanationLog

CodeSnippet
  └── AiQuestionDraft
        └── Question after approval
```

---

## 3. 通用字段约定

所有表建议使用：

- id TEXT PRIMARY KEY
- created_at TEXT NOT NULL
- updated_at TEXT NOT NULL

时间统一 ISO 字符串。

JSON 字段统一以 `_json` 结尾。

---

## 4. courses

```sql
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
```

说明：

- project_context 用于保存真实项目背景。
- ability_tags_json 保存课程覆盖能力。

---

## 5. lessons

```sql
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
```

---

## 6. questions

```sql
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
```

---

## 7. question 类型

TypeScript：

```ts
export type QuestionType =
  | "single_choice"
  | "multi_choice"
  | "sort"
  | "fill_blank"
  | "debug"
  | "branch_trace"
  | "position_judgement"
  | "ai_review"
```

---

## 8. answer_attempts

```sql
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
```

---

## 9. mistakes

```sql
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
```

---

## 10. ability_scores

```sql
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
```

score 计算：

```txt
score = correct_count / max(total_count, 1)
```

后续可加权，但第一版保持清晰。

---

## 11. lesson_progress

```sql
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
```

---

## 12. course_progress

```sql
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
```

---

## 13. exams

```sql
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
```

---

## 14. exam_results

```sql
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
```

---

## 15. code_snippets

用户保存真实项目代码片段。

```sql
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
```

status：

```txt
active
archived
converted_to_questions
```

---

## 16. ai_question_drafts

AI 生成题目草稿。

```sql
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
  updated_at TEXT NOT NULL,
  FOREIGN KEY (snippet_id) REFERENCES code_snippets(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_question_drafts_status
ON ai_question_drafts(status);

CREATE INDEX IF NOT EXISTS idx_ai_question_drafts_creator
ON ai_question_drafts(created_by);
```

status：

```txt
draft
needs_fix
approved
rejected
published
```

---

## 17. ai_explanation_logs

用户请求 AI 提示/讲解记录。

```sql
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
```

feature 示例：

```txt
hint
explanation
mistake_summary
question_generation
```

---

## 18. ai_usage_logs

AI 用量日志。

```sql
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
```

---

## 19. admin_audit_logs

管理员操作日志。

```sql
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
```

---

## 20. 种子数据要求

初始 seed 至少包含 3 个课程：

1. theme-global-state。
2. ai-chat-request-chain。
3. auth-protected-token-flow。

每个课程至少：

- 4 个 lesson。
- 每个 lesson 至少 5 道题。
- 覆盖多题型。
- 覆盖 explanation。
- 覆盖 ability_tags。

---

## 21. JSON 字段 TypeScript 类型

### 21.1 Explanation

```ts
export type Explanation = {
  short: string
  detail: string
  realProjectNote?: string
  commonMistake?: string
  aiReviewNote?: string
}
```

### 21.2 QuestionOption

```ts
export type QuestionOption = {
  id: string
  text: string
  explanation?: string
}
```

### 21.3 FillBlank

```ts
export type FillBlank = {
  id: string
  placeholder: string
  acceptedAnswers: string[]
  hint?: string
}
```

### 21.4 SortItem

```ts
export type SortItem = {
  id: string
  text: string
}
```

---

## 22. 数据访问原则

- 页面不直接写 SQL。
- 所有数据库访问在 server 层。
- JSON parse/stringify 必须封装。
- 写操作必须有事务意识。
- AI 草稿必须审核后才能转正式题。
- 删除优先软删除或 archive。
