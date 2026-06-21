import type { AbilityTag } from "./abilityTags";
import type { RemixModuleId } from "./remixModules";

export type QuestionType =
  | "single_choice"
  | "multi_choice"
  | "sort"
  | "fill_blank"
  | "debug"
  | "branch_trace"
  | "position_judgement"
  | "ai_review"
  | "true_false"
  | "line_pick"
  | "code_fix"
  | "diff_review"
  | "review_comment"
  | "free_explain";

export const QUESTION_TYPE_VALUES = [
  "single_choice",
  "multi_choice",
  "sort",
  "fill_blank",
  "debug",
  "branch_trace",
  "position_judgement",
  "ai_review",
  "true_false",
  "line_pick",
  "code_fix",
  "diff_review",
  "review_comment",
  "free_explain",
] as const;

export type Layer =
  | "basic"
  | "code-reading"
  | "state-reasoning"
  | "ai-review"
  | "typescript-review"
  | "production-debugging"
  | "free-response";

export const LAYER_VALUES = [
  "basic",
  "code-reading",
  "state-reasoning",
  "ai-review",
  "typescript-review",
  "production-debugging",
  "free-response",
] as const;

export type ExpectedFixScope =
  | "one-line"
  | "single-function"
  | "single-file"
  | "cross-file";

export const EXPECTED_FIX_SCOPE_VALUES = [
  "one-line",
  "single-function",
  "single-file",
  "cross-file",
] as const;

export type ServerClientBoundary =
  | "server"
  | "client"
  | "shared"
  | "mixed-risk";

export const SERVER_CLIENT_BOUNDARY_VALUES = [
  "server",
  "client",
  "shared",
  "mixed-risk",
] as const;

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type Explanation = {
  short: string;
  detail: string;
  realProjectNote?: string;
  commonMistake?: string;
  aiReviewNote?: string;
};


export type SortStepCategory = "frontend" | "backend" | "database" | "ai" | "ui";

export type FillBlank = {
  id: string;
  placeholder: string;
  acceptedAnswers: string[];
  hint?: string;
  caseSensitive?: boolean;
};

export type SortItem = {
  id: string;
  text: string;
  title?: string;
  description?: string;
  category?: SortStepCategory;
};

export type CodeHighlight = {
  lineStart: number;
  lineEnd: number;
  label: string;
  explanation: string;
};

export type TeachingBlock =
  | {
      type: "concept";
      title: string;
      content: string;
      keyPoints: string[];
    }
  | {
      type: "code_walkthrough";
      title: string;
      sourceFilePath: string;
      code: string;
      highlights: CodeHighlight[];
    }
  | {
      type: "flow";
      title: string;
      steps: {
        id: string;
        title: string;
        description: string;
        sourceHint?: string;
      }[];
    }
  | {
      type: "example";
      title: string;
      scenario: string;
      code?: string;
      explanation: string;
    }
  | {
      type: "checkpoint";
      title: string;
      prompt: string;
    };

export type LessonMeta = {
  abilityTags?: AbilityTag[];
  estimatedQuestionCount?: number;
  trainingFocus?: string[];
};

export type ExamBriefing = {
  taskBackground: string;
  targetOutcome: string;
  involvedFiles: string[];
  impactScope: string[];
  recapPrompt?: string;
};

export type QuestionOption = {
  id: string;
  text: string;
  explanation?: string;
  /** position_judgement: where this option maps in the project */
  locationHint?: string;
};

export type DebugMeta = {
  suspiciousLineStart?: number;
  suspiciousLineEnd?: number;
  scenario?: string;
};

export type AiReviewMeta = {
  riskTypeOptions?: { id: string; label: string }[];
};

export type CourseOrigin = "sample" | "project";

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  projectContext?: string;
  difficulty: Difficulty;
  abilityTags: AbilityTag[];
  orderIndex: number;
  unitIndex?: number;
  isPublished: boolean;
  sourceId?: string;
  origin: CourseOrigin;
  blueprintId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Lesson = {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  description: string;
  learningGoal: string;
  sourceFilePath?: string;
  sourceSummary?: string;
  orderIndex: number;
  remixModules?: RemixModuleId[];
  teachingBlocks?: TeachingBlock[];
  lessonMeta?: LessonMeta;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Question = {
  id: string;
  lessonId: string;
  type: QuestionType;
  title: string;
  prompt: string;
  code?: string;
  options?: QuestionOption[];
  blanks?: FillBlank[];
  sortItems?: SortItem[];
  correctAnswer: unknown;
  explanation: Explanation;
  abilityTags: AbilityTag[];
  mistakeTypes?: string[];
  difficulty: Difficulty;
  sourceFilePath?: string;
  sourceNote?: string;
  debugMeta?: DebugMeta;
  aiReviewMeta?: AiReviewMeta;
  branchScenario?: string;
  /** diff_review / review_comment: original → proposed diff. */
  diffSnippet?: string;
  /** line_pick: candidate lines the user can choose. */
  linePickLines?: LinePickLine[];
  /** code_fix: broken baseline the user is asked to patch. */
  codeFixBaseline?: string;
  /** how invasive the user's expected fix is. */
  expectedFixScope?: ExpectedFixScope;
  /** where the patched code runs. */
  serverClientBoundary?: ServerClientBoundary;
  /** files the question's diff / patch touches. */
  touchedFiles?: string[];
  /** per-distractor feedback keyed by option id. */
  wrongAnswerFeedback?: Record<string, string>;
  /** production-debugging context. */
  realWorldImpact?: string;
  /** ai-review / diff_review specific risk. */
  aiReviewRisk?: string;
  /** typescript-review specific risk. */
  typeSafetyRisk?: string;
  /** training layer the question belongs to (timu.MD §3, §7). */
  layer?: Layer;
  orderIndex: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LinePickLine = {
  id: string;
  lineNumber: number;
  text: string;
  explanation?: string;
};

export type SingleChoiceAnswer = { type: "single_choice"; choiceId: string };
export type MultiChoiceAnswer = { type: "multi_choice"; choiceIds: string[] };
export type SortAnswer = { type: "sort"; itemIds: string[] };
export type FillBlankAnswer = { type: "fill_blank"; values: Record<string, string> };
export type DebugAnswer = { type: "debug"; issueId: string };
export type BranchTraceAnswer = { type: "branch_trace"; pathIds: string[] };
export type PositionJudgementAnswer = { type: "position_judgement"; positionId: string };
export type AiReviewAnswer = {
  type: "ai_review";
  choiceId?: string;
  keywords?: string[];
  riskIds?: string[];
};
export type TrueFalseAnswer = { type: "true_false"; value: boolean };
export type LinePickAnswer = { type: "line_pick"; lineId: string };
export type CodeFixAnswer = { type: "code_fix"; patchedCode: string };
export type DiffReviewAnswer = { type: "diff_review"; verdict: "accept" | "reject"; reason: string };
export type ReviewCommentAnswer = { type: "review_comment"; comment: string };
export type FreeExplainAnswer = { type: "free_explain"; text: string };

export type UserAnswer =
  | SingleChoiceAnswer
  | MultiChoiceAnswer
  | SortAnswer
  | FillBlankAnswer
  | DebugAnswer
  | BranchTraceAnswer
  | PositionJudgementAnswer
  | AiReviewAnswer
  | TrueFalseAnswer
  | LinePickAnswer
  | CodeFixAnswer
  | DiffReviewAnswer
  | ReviewCommentAnswer
  | FreeExplainAnswer;

export type AnswerResult = {
  isCorrect: boolean;
  normalizedUserAnswer: unknown;
  correctAnswer: unknown;
  mistakeType?: string;
  explanation: Explanation;
  abilityTags: AbilityTag[];
  /**
   * Set when the question is free-form (free_explain / review_comment / open
   * ai_review) and there's no rule-based way to grade it. The attempt is
   * recorded but **not** counted as right or wrong — it goes into the
   * "awaiting AI grading" bucket. The UI should show "已提交，等待 AI 评分"
   * rather than "回答正确" / "回答错误".
   */
  needsAiGrading?: boolean;
};

export type Mistake = {
  id: string;
  userId: string;
  questionId: string;
  courseId: string;
  lessonId: string;
  lastAnswer: unknown;
  correctAnswer: unknown;
  wrongCount: number;
  mistakeType?: string;
  abilityTags: AbilityTag[];
  aiSummary?: string;
  isResolved: boolean;
  nextReviewAt?: string;
  lastWrongAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AbilityScore = {
  id: string;
  userId: string;
  abilityTag: AbilityTag;
  correctCount: number;
  wrongCount: number;
  totalCount: number;
  score: number;
  lastPracticedAt?: string;
  updatedAt: string;
};

export type ExamTask = {
  id: string;
  questionId?: string;
  title: string;
  prompt: string;
  type: QuestionType;
  weight: number;
};

export type Exam = {
  id: string;
  slug: string;
  courseId?: string;
  title: string;
  description: string;
  scenario: string;
  briefing?: ExamBriefing;
  tasks: ExamTask[];
  passingScore: number;
  abilityTags: AbilityTag[];
  difficulty: Difficulty;
  isPublished: boolean;
  sourceId?: string;
  origin: CourseOrigin;
  blueprintId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExamResult = {
  id: string;
  userId: string;
  examId: string;
  answers: unknown;
  score: number;
  weakAbilities?: AbilityTag[];
  feedback: unknown;
  isPassed: boolean;
  createdAt: string;
};

export type CodeSnippetStatus = "active" | "archived" | "converted_to_questions";

export type CodeSnippet = {
  id: string;
  userId: string;
  title: string;
  sourceFilePath?: string;
  code: string;
  projectContext?: string;
  userConfusion?: string;
  abilityTags?: AbilityTag[];
  status: CodeSnippetStatus;
  createdAt: string;
  updatedAt: string;
};

export type AiDraftStatus =
  | "draft"
  | "needs_fix"
  | "approved"
  | "rejected"
  | "published";

export type AiQuestionDraft = {
  id: string;
  snippetId?: string;
  createdBy: string;
  sourceTitle: string;
  sourceFilePath?: string;
  sourceCode: string;
  projectContext?: string;
  generationGoal: string;
  targetAbilities: AbilityTag[];
  preferredQuestionTypes: QuestionType[];
  generated: unknown;
  validationResult?: unknown;
  status: AiDraftStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AiExplanationInput = {
  userId: string;
  courseTitle: string;
  lessonTitle: string;
  questionTitle: string;
  questionPrompt: string;
  code?: string;
  questionType: QuestionType;
  options?: QuestionOption[];
  sortItems?: SortItem[];
  blanks?: FillBlank[];
  branchScenario?: string;
  userAnswer: unknown;
  correctAnswer: unknown;
  baseExplanation: Explanation;
  abilityTags: AbilityTag[];
  mistakeType?: string;
  projectContext?: string;
  sourceFilePath?: string;
  /** 被讲解文件的完整源码(用于行锚定讲解); 缺省时回退到 code 片段。 */
  fullFileCode?: string;
  /** 完整源码的行数(行锚定校验夹紧用)。 */
  fullFileLineCount?: number;
};

export type AiQuestionGenerationInput = {
  sourceCode: string;
  sourceFilePath?: string;
  projectContext?: string;
  targetAbilities: AbilityTag[];
  preferredQuestionTypes: QuestionType[];
  difficulty: Difficulty;
  generationGoal: string;
};

export type GeneratedQuestionDifficulty = "easy" | "medium" | "hard";

export type GeneratedQuestion = {
  type: QuestionType;
  title: string;
  prompt: string;
  code?: string;
  options?: QuestionOption[];
  blanks?: FillBlank[];
  sortItems?: SortItem[];
  correctAnswer: unknown;
  explanation: Explanation;
  abilityTags: string[];
  mistakeTypes?: string[];
  difficulty: GeneratedQuestionDifficulty;
  // Phase 7: rich metadata (timu.MD §3, §7). All optional; AI is encouraged
  // to fill them and validateGeneratedQuestion will warn (not error) when
  // ai_review / diff_review / code_fix questions miss them.
  layer?: Layer;
  diffSnippet?: string;
  linePickLines?: LinePickLine[];
  codeFixBaseline?: string;
  expectedFixScope?: ExpectedFixScope;
  serverClientBoundary?: ServerClientBoundary;
  touchedFiles?: string[];
  wrongAnswerFeedback?: Record<string, string>;
  realWorldImpact?: string;
  aiReviewRisk?: string;
  typeSafetyRisk?: string;
};

export type AiQuestionGenerationOutput = {
  title: string;
  summary: string;
  detectedConcepts: string[];
  questions: GeneratedQuestion[];
  warnings: string[];
};

export type AiValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/** 一条注释的标注形态。缺省视为 `block`。 */
export type AnnotationPlacement = "inline" | "block" | "highlight";

/** 行锚定的代码讲解: 一条注释贴在源码的某个行区间上。 */
export type CodeAnnotation = {
  /** 1-based 起始行(已夹紧到文件范围内)。 */
  startLine: number;
  /** 1-based 结束行(>= startLine)。 */
  endLine: number;
  /** 讲解内容(markdown)。 */
  note: string;
  /**
   * 标注形态(AI 自选, 解析时校验):
   *  - inline:    行尾内联短点评(一句话, 渲染在 endLine 行右侧)。
   *  - block:     下方整行详细讲解(可长, 默认形态)。
   *  - highlight: 高亮 startLine..endLine 行区间, 行尾 ⓘ 点开看 note。
   */
  placement?: AnnotationPlacement;
};

/** AI 对一个源码文件的行锚定讲解输出(导读 / 结合答案讲解共用此形状)。 */
export type AnnotatedExplanation = {
  /** 一句话总览。 */
  summary: string;
  /** 锚定到具体行的讲解条目, 按 startLine 升序。 */
  annotations: CodeAnnotation[];
};

// DB row types (snake_case)

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  project_context: string | null;
  difficulty: string;
  ability_tags_json: string;
  order_index: number;
  unit_index: number | null;
  is_published: number;
  source_id: string | null;
  origin: string;
  blueprint_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonRow = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string;
  learning_goal: string;
  source_file_path: string | null;
  source_summary: string | null;
  order_index: number;
  remix_modules_json: string | null;
  teaching_blocks_json: string | null;
  lesson_meta_json: string | null;
  is_published: number;
  created_at: string;
  updated_at: string;
};

export type QuestionRow = {
  id: string;
  lesson_id: string;
  type: string;
  title: string;
  prompt: string;
  code: string | null;
  options_json: string | null;
  blanks_json: string | null;
  sort_items_json: string | null;
  correct_answer_json: string;
  explanation_json: string;
  ability_tags_json: string;
  mistake_types_json: string | null;
  difficulty: string;
  source_file_path: string | null;
  source_note: string | null;
  debug_meta_json: string | null;
  ai_review_meta_json: string | null;
  branch_scenario: string | null;
  source_id: string | null;
  asset_id: string | null;
  diff_snippet: string | null;
  line_pick_lines_json: string | null;
  code_fix_baseline: string | null;
  expected_fix_scope: string | null;
  server_client_boundary: string | null;
  touched_files_json: string | null;
  wrong_answer_feedback_json: string | null;
  real_world_impact: string | null;
  ai_review_risk: string | null;
  type_safety_risk: string | null;
  layer: string | null;
  order_index: number;
  is_published: number;
  created_at: string;
  updated_at: string;
};

export type MistakeRow = {
  id: string;
  user_id: string;
  question_id: string;
  course_id: string;
  lesson_id: string;
  last_answer_json: string;
  correct_answer_json: string;
  wrong_count: number;
  mistake_type: string | null;
  ability_tags_json: string;
  ai_summary: string | null;
  is_resolved: number;
  next_review_at: string | null;
  last_wrong_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AbilityScoreRow = {
  id: string;
  user_id: string;
  ability_tag: string;
  correct_count: number;
  wrong_count: number;
  total_count: number;
  score: number;
  last_practiced_at: string | null;
  updated_at: string;
};

export type AnswerAttemptRow = {
  id: string;
  user_id: string;
  question_id: string;
  lesson_id: string;
  course_id: string;
  user_answer_json: string;
  normalized_answer_json: string | null;
  is_correct: number;
  mistake_type: string | null;
  ability_tags_json: string;
  created_at: string;
};

export type ExamRow = {
  id: string;
  slug: string;
  course_id: string | null;
  title: string;
  description: string;
  scenario: string;
  tasks_json: string;
  exam_briefing_json: string | null;
  passing_score: number;
  ability_tags_json: string;
  difficulty: string;
  is_published: number;
  source_id: string | null;
  origin: string;
  blueprint_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ExamResultRow = {
  id: string;
  user_id: string;
  exam_id: string;
  answers_json: string;
  score: number;
  weak_abilities_json: string | null;
  feedback_json: string;
  is_passed: number;
  created_at: string;
};

export type CodeSnippetRow = {
  id: string;
  user_id: string;
  title: string;
  source_file_path: string | null;
  code: string;
  project_context: string | null;
  user_confusion: string | null;
  ability_tags_json: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AiQuestionDraftRow = {
  id: string;
  snippet_id: string | null;
  created_by: string;
  source_title: string;
  source_file_path: string | null;
  source_code: string;
  project_context: string | null;
  generation_goal: string;
  target_abilities_json: string;
  preferred_question_types_json: string;
  generated_json: string;
  validation_result_json: string | null;
  status: string;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateCourseInput = Omit<Course, "id" | "createdAt" | "updatedAt">;
export type CreateLessonInput = Omit<Lesson, "id" | "createdAt" | "updatedAt">;
export type CreateQuestionInput = Omit<Question, "id" | "createdAt" | "updatedAt">;

// Project curriculum types

export type ProjectSourceStatus =
  | "pending"
  | "scanning"
  | "scanned"
  | "failed";

export type ProjectSource = {
  id: string;
  sourcePath: string;
  displayName: string;
  framework: string;
  status: ProjectSourceStatus;
  fileCount: number;
  lastScannedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFileKind =
  | "root"
  | "route"
  | "component"
  | "layout"
  | "server_util"
  | "auth"
  | "session"
  | "ai_gateway"
  | "database"
  | "rate_limit"
  | "theme"
  | "data"
  | "worker"
  | "config"
  | "unknown";

export type ProjectFile = {
  id: string;
  sourceId: string;
  filePath: string;
  fileKind: ProjectFileKind;
  language?: string;
  sizeBytes: number;
  contentHash?: string;
  summary?: string;
  importanceScore: number;
  content?: string;
  lineCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CodeAssetStatus = "draft" | "published" | "archived";

export type CodeAsset = {
  id: string;
  sourceId: string;
  fileId?: string;
  title: string;
  filePath: string;
  code: string;
  startLine?: number;
  endLine?: number;
  assetType: string;
  businessContext?: string;
  userLearningValue?: string;
  detectedConcepts: string[];
  abilityTags: AbilityTag[];
  status: CodeAssetStatus;
  createdAt: string;
  updatedAt: string;
};

export type CurriculumBlueprintStatus = "draft" | "approved" | "published";

export type CurriculumBlueprint = {
  id: string;
  sourceId: string;
  title: string;
  summary?: string;
  generated: unknown;
  status: CurriculumBlueprintStatus;
  createdAt: string;
  updatedAt: string;
};

export type CurriculumDraftStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "published";

export type CurriculumDraft = {
  id: string;
  sourceId: string;
  blueprintId?: string;
  title: string;
  generatedCourses: unknown[];
  generatedExams?: unknown[];
  generatedAbilities?: unknown[];
  status: CurriculumDraftStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSourceRow = {
  id: string;
  source_path: string;
  display_name: string;
  framework: string;
  status: string;
  file_count: number;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectFileRow = {
  id: string;
  source_id: string;
  file_path: string;
  file_kind: string;
  language: string | null;
  size_bytes: number;
  content_hash: string | null;
  summary: string | null;
  importance_score: number;
  content: string | null;
  line_count: number | null;
  created_at: string;
  updated_at: string;
};

export type CodeAssetRow = {
  id: string;
  source_id: string;
  file_id: string | null;
  title: string;
  file_path: string;
  code: string;
  start_line: number | null;
  end_line: number | null;
  asset_type: string;
  business_context: string | null;
  user_learning_value: string | null;
  detected_concepts_json: string | null;
  ability_tags_json: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CurriculumBlueprintRow = {
  id: string;
  source_id: string;
  title: string;
  summary: string | null;
  generated_json: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CurriculumDraftRow = {
  id: string;
  source_id: string;
  blueprint_id: string | null;
  title: string;
  generated_courses_json: string;
  generated_exams_json: string | null;
  generated_abilities_json: string | null;
  status: string;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};
