import type { AbilityTag } from "~/lib/learn/abilityTags";
import { isAbilityTag } from "~/lib/learn/abilityTags";
import { isRemixModuleId, type RemixModuleId } from "~/lib/learn/remixModules";
import {
  EXPECTED_FIX_SCOPE_VALUES,
  LAYER_VALUES,
  SERVER_CLIENT_BOUNDARY_VALUES,
  type ExpectedFixScope,
  type Layer,
  type LinePickLine,
  type ServerClientBoundary,
} from "~/lib/learn/types";
import type {
  AbilityScore,
  AbilityScoreRow,
  AiQuestionDraft,
  AiQuestionDraftRow,
  AnswerAttemptRow,
  CodeSnippet,
  CodeSnippetRow,
  Course,
  CourseOrigin,
  CourseRow,
  Difficulty,
  Exam,
  ExamRow,
  Lesson,
  LessonRow,
  Mistake,
  MistakeRow,
  Question,
  QuestionRow,
  QuestionType,
} from "~/lib/learn/types";
import { intToBool, parseJsonField } from "./db-json.server";

function mapAbilityTags(json: string): AbilityTag[] {
  const tags = parseJsonField<string[]>(json, []);
  return tags.filter(isAbilityTag);
}

function mapRemixModules(json: string | null | undefined): RemixModuleId[] | undefined {
  if (!json) return undefined;
  const ids = parseJsonField<string[]>(json, []);
  const modules = ids.filter(isRemixModuleId);
  return modules.length ? modules : undefined;
}

function mapOptionalEnum<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function mapCourseRow(row: CourseRow): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    description: row.description,
    projectContext: row.project_context ?? undefined,
    difficulty: row.difficulty as Difficulty,
    abilityTags: mapAbilityTags(row.ability_tags_json),
    orderIndex: row.order_index,
    unitIndex: row.unit_index ?? undefined,
    isPublished: intToBool(row.is_published),
    sourceId: row.source_id ?? undefined,
    origin: (row.origin ?? "sample") as CourseOrigin,
    blueprintId: row.blueprint_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLessonRow(row: LessonRow): Lesson {
  return {
    id: row.id,
    courseId: row.course_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    learningGoal: row.learning_goal,
    sourceFilePath: row.source_file_path ?? undefined,
    sourceSummary: row.source_summary ?? undefined,
    orderIndex: row.order_index,
    remixModules: mapRemixModules(row.remix_modules_json),
    teachingBlocks: parseJsonField(row.teaching_blocks_json, undefined),
    lessonMeta: parseJsonField(row.lesson_meta_json, undefined),
    isPublished: intToBool(row.is_published),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQuestionRow(row: QuestionRow): Question {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    type: row.type as QuestionType,
    title: row.title,
    prompt: row.prompt,
    code: row.code ?? undefined,
    options: parseJsonField(row.options_json, undefined),
    blanks: parseJsonField(row.blanks_json, undefined),
    sortItems: parseJsonField(row.sort_items_json, undefined),
    correctAnswer: parseJsonField(row.correct_answer_json, null),
    explanation: parseJsonField(row.explanation_json, { short: "", detail: "" }),
    abilityTags: mapAbilityTags(row.ability_tags_json),
    mistakeTypes: parseJsonField(row.mistake_types_json, undefined),
    difficulty: row.difficulty as Difficulty,
    sourceFilePath: row.source_file_path ?? undefined,
    sourceNote: row.source_note ?? undefined,
    debugMeta: parseJsonField(row.debug_meta_json, undefined),
    aiReviewMeta: parseJsonField(row.ai_review_meta_json, undefined),
    branchScenario: row.branch_scenario ?? undefined,
    diffSnippet: row.diff_snippet ?? undefined,
    linePickLines: parseJsonField<LinePickLine[] | undefined>(row.line_pick_lines_json, undefined),
    codeFixBaseline: row.code_fix_baseline ?? undefined,
    expectedFixScope: mapOptionalEnum<ExpectedFixScope>(
      row.expected_fix_scope,
      EXPECTED_FIX_SCOPE_VALUES,
    ),
    serverClientBoundary: mapOptionalEnum<ServerClientBoundary>(
      row.server_client_boundary,
      SERVER_CLIENT_BOUNDARY_VALUES,
    ),
    touchedFiles: parseJsonField<string[] | undefined>(row.touched_files_json, undefined),
    wrongAnswerFeedback: parseJsonField<Record<string, string> | undefined>(
      row.wrong_answer_feedback_json,
      undefined,
    ),
    realWorldImpact: row.real_world_impact ?? undefined,
    aiReviewRisk: row.ai_review_risk ?? undefined,
    typeSafetyRisk: row.type_safety_risk ?? undefined,
    layer: mapOptionalEnum<Layer>(row.layer, LAYER_VALUES),
    orderIndex: row.order_index,
    isPublished: intToBool(row.is_published),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMistakeRow(row: MistakeRow): Mistake {
  return {
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    lastAnswer: parseJsonField(row.last_answer_json, null),
    correctAnswer: parseJsonField(row.correct_answer_json, null),
    wrongCount: row.wrong_count,
    mistakeType: row.mistake_type ?? undefined,
    abilityTags: mapAbilityTags(row.ability_tags_json),
    aiSummary: row.ai_summary ?? undefined,
    isResolved: intToBool(row.is_resolved),
    nextReviewAt: row.next_review_at ?? undefined,
    lastWrongAt: row.last_wrong_at,
    resolvedAt: row.resolved_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAbilityScoreRow(row: AbilityScoreRow): AbilityScore {
  return {
    id: row.id,
    userId: row.user_id,
    abilityTag: row.ability_tag as AbilityTag,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    totalCount: row.total_count,
    score: row.score,
    lastPracticedAt: row.last_practiced_at ?? undefined,
    updatedAt: row.updated_at,
  };
}

export function mapExamRow(row: ExamRow): Exam {
  return {
    id: row.id,
    slug: row.slug,
    courseId: row.course_id ?? undefined,
    title: row.title,
    description: row.description,
    scenario: row.scenario,
    briefing: parseJsonField(row.exam_briefing_json, undefined),
    tasks: parseJsonField(row.tasks_json, []),
    passingScore: row.passing_score,
    abilityTags: mapAbilityTags(row.ability_tags_json),
    difficulty: row.difficulty as Difficulty,
    isPublished: intToBool(row.is_published),
    sourceId: row.source_id ?? undefined,
    origin: (row.origin ?? "sample") as CourseOrigin,
    blueprintId: row.blueprint_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSnippetRow(row: CodeSnippetRow): CodeSnippet {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    sourceFilePath: row.source_file_path ?? undefined,
    code: row.code,
    projectContext: row.project_context ?? undefined,
    userConfusion: row.user_confusion ?? undefined,
    abilityTags: row.ability_tags_json
      ? mapAbilityTags(row.ability_tags_json)
      : undefined,
    status: row.status as CodeSnippet["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const mapCodeSnippetRow = mapSnippetRow;

export function mapAiQuestionDraftRow(row: AiQuestionDraftRow): AiQuestionDraft {
  return {
    id: row.id,
    snippetId: row.snippet_id ?? undefined,
    createdBy: row.created_by,
    sourceTitle: row.source_title,
    sourceFilePath: row.source_file_path ?? undefined,
    sourceCode: row.source_code,
    projectContext: row.project_context ?? undefined,
    generationGoal: row.generation_goal,
    targetAbilities: mapAbilityTags(row.target_abilities_json),
    preferredQuestionTypes: parseJsonField(row.preferred_question_types_json, []),
    generated: parseJsonField(row.generated_json, null),
    validationResult: parseJsonField(row.validation_result_json, undefined),
    status: row.status as AiQuestionDraft["status"],
    reviewNote: row.review_note ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type { AnswerAttemptRow };
