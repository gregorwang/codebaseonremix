import { isAbilityTag, type AbilityTag } from "~/lib/learn/abilityTags";
import {
  EXPECTED_FIX_SCOPE_VALUES,
  LAYER_VALUES,
  QUESTION_TYPE_VALUES,
  SERVER_CLIENT_BOUNDARY_VALUES,
} from "~/lib/learn/types";
import type {
  AiQuestionGenerationOutput,
  AiValidationResult,
  AnnotatedExplanation,
  CodeAnnotation,
  CreateQuestionInput,
  ExpectedFixScope,
  GeneratedQuestion,
  GeneratedQuestionDifficulty,
  Layer,
  QuestionType,
  ServerClientBoundary,
} from "~/lib/learn/types";

/** All 14 question types — the 8 original + 6 added in Phase 1.2. */
const QUESTION_TYPES: readonly QuestionType[] = QUESTION_TYPE_VALUES;

/** All 7 layers from timu.MD §3. */
const LAYERS: readonly Layer[] = LAYER_VALUES;

/** Question types whose richer metadata fields (realWorldImpact, aiReviewRisk)
 *  must be present, per the timu.MD §7.2 quality bar. Missing them on these
 *  types is a *warning* (we still accept the draft); on others they're
 *  optional. */
const RICH_METADATA_REQUIRED_TYPES: readonly QuestionType[] = [
  "ai_review",
  "diff_review",
  "code_fix",
];

const GENERATED_DIFFICULTIES: GeneratedQuestionDifficulty[] = [
  "easy",
  "medium",
  "hard",
];

const SECURITY_PATTERNS = [
  /\bsk-[a-zA-Z0-9]{10,}\b/,
  /\b(api[_-]?key|secret|token)\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{8,}/i,
  /Bearer\s+[a-zA-Z0-9._\-]+/i,
];

const SECURITY_KEYWORDS = [
  "绕过登录",
  "跳过登录",
  "绕过限流",
  "跳过限流",
  "绕过权限",
  "跳过权限",
  "bypass auth",
  "bypass login",
  "bypass rate limit",
  "disable authentication",
];

function isQuestionType(value: string): value is QuestionType {
  return (QUESTION_TYPES as readonly string[]).includes(value);
}

function isLayer(value: string): value is Layer {
  return (LAYERS as readonly string[]).includes(value);
}

function isExpectedFixScope(value: string): value is ExpectedFixScope {
  return (EXPECTED_FIX_SCOPE_VALUES as readonly string[]).includes(value);
}

function isServerClientBoundary(
  value: string,
): value is ServerClientBoundary {
  return (SERVER_CLIENT_BOUNDARY_VALUES as readonly string[]).includes(value);
}

function isGeneratedDifficulty(
  value: string,
): value is GeneratedQuestionDifficulty {
  return (GENERATED_DIFFICULTIES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export {
  QUESTION_TYPES as AI_QUESTION_TYPES,
  LAYERS as AI_LAYERS,
  RICH_METADATA_REQUIRED_TYPES,
};

export function mapGeneratedDifficulty(
  difficulty: GeneratedQuestionDifficulty,
): "beginner" | "intermediate" | "advanced" {
  switch (difficulty) {
    case "easy":
      return "beginner";
    case "hard":
      return "advanced";
    default:
      return "intermediate";
  }
}

/** 高置信度的"硬凭证"特征(sk- key、api_key=xxx 形式)。
 *  注意: 不含 Bearer/关键词检查 —— 那些在讲代码(尤其鉴权代码)时会大量误伤,
 *  比如讲解里出现"校验 Bearer token"是正常教学, 不该被丢。 */
const HARD_SECRET_PATTERNS = [
  /\bsk-[a-zA-Z0-9]{10,}\b/,
  /\b(api[_-]?key|secret|token)\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{8,}/i,
];

function containsHardSecret(text: string): boolean {
  return HARD_SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * 解析 AI 返回的「行锚定讲解」JSON。容错重点:
 *  - 剥掉 ```json ... ``` 代码围栏后再 parse;
 *  - annotations 必须是数组, 每条要有非空 note;
 *  - 行号夹紧到 [1, fileLineCount], endLine >= startLine, 非法的整条丢弃;
 *  - note 命中硬凭证特征的整条丢弃(防 AI 把文件里的真实密钥回显出来)。
 * 解析不出任何有效内容(既无 summary 又无 annotations)时抛错, 交给上层走失败日志。
 */
export function parseAnnotatedExplanation(
  rawText: string,
  fileLineCount: number,
): AnnotatedExplanation {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error("AI 返回的不是合法 JSON");
  }
  if (!isRecord(data)) {
    throw new Error("AI 返回结构非对象");
  }

  const summary = hasNonEmptyString(data.summary) ? data.summary.trim() : "";
  const rawAnnotations = Array.isArray(data.annotations) ? data.annotations : [];
  const lineCap =
    Number.isFinite(fileLineCount) && fileLineCount > 0
      ? Math.floor(fileLineCount)
      : 1;

  const annotations: CodeAnnotation[] = [];
  for (const item of rawAnnotations) {
    if (!isRecord(item)) continue;
    if (!hasNonEmptyString(item.note)) continue;
    const note = item.note.trim();
    if (containsHardSecret(note)) continue;

    const startRaw = Number(item.startLine);
    if (!Number.isFinite(startRaw)) continue;
    const start = Math.max(1, Math.min(Math.floor(startRaw), lineCap));

    const endRaw = Number(item.endLine ?? item.startLine);
    let end = Number.isFinite(endRaw)
      ? Math.max(1, Math.min(Math.floor(endRaw), lineCap))
      : start;
    if (end < start) end = start;

    annotations.push({ startLine: start, endLine: end, note });
  }

  annotations.sort((a, b) => a.startLine - b.startLine);

  if (!summary && annotations.length === 0) {
    throw new Error("AI 未产出有效讲解");
  }

  return { summary, annotations };
}

export function validateAiSecurityContent(text: string): AiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const pattern of SECURITY_PATTERNS) {
    if (pattern.test(text)) {
      errors.push("输出可能包含敏感凭证信息");
      break;
    }
  }

  const lower = text.toLowerCase();
  for (const keyword of SECURITY_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      errors.push(`输出包含不安全建议：${keyword}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateGeneratedQuestion(
  question: unknown,
  index: number,
): AiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `questions[${index}]`;

  if (!isRecord(question)) {
    return { valid: false, errors: [`${prefix} 必须是对象`], warnings };
  }

  if (!hasNonEmptyString(question.type) || !isQuestionType(question.type)) {
    errors.push(`${prefix}.type 无效（必须是 14 种合法题型之一）`);
  }

  if (!hasNonEmptyString(question.title)) {
    errors.push(`${prefix}.title 必填`);
  }

  if (!hasNonEmptyString(question.prompt)) {
    errors.push(`${prefix}.prompt 必填`);
  }

  if (question.correctAnswer === undefined || question.correctAnswer === null) {
    errors.push(`${prefix}.correctAnswer 必填`);
  }

  if (!isRecord(question.explanation)) {
    errors.push(`${prefix}.explanation 必须是对象`);
  } else {
    if (!hasNonEmptyString(question.explanation.short)) {
      errors.push(`${prefix}.explanation.short 必填`);
    }
    if (!hasNonEmptyString(question.explanation.detail)) {
      errors.push(`${prefix}.explanation.detail 必填`);
    }
  }

  if (!Array.isArray(question.abilityTags) || question.abilityTags.length === 0) {
    errors.push(`${prefix}.abilityTags 必须是非空数组`);
  } else {
    for (const tag of question.abilityTags) {
      if (typeof tag !== "string" || !isAbilityTag(tag)) {
        warnings.push(`${prefix}.abilityTags 包含未知标签：${String(tag)}`);
      }
    }
  }

  if (
    !hasNonEmptyString(question.difficulty) ||
    !isGeneratedDifficulty(question.difficulty)
  ) {
    errors.push(`${prefix}.difficulty 必须是 easy/medium/hard`);
  }

  const type = question.type as QuestionType | undefined;
  if (type === "single_choice" || type === "multi_choice") {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`${prefix}.options 选择题至少需要 2 个选项`);
    }
  }

  if (type === "sort") {
    if (!Array.isArray(question.sortItems) || question.sortItems.length < 2) {
      errors.push(`${prefix}.sortItems 排序题至少需要 2 项`);
    }
  }

  if (type === "fill_blank") {
    if (!Array.isArray(question.blanks) || question.blanks.length === 0) {
      errors.push(`${prefix}.blanks 填空题至少 1 个空`);
    }
  }

  // Phase 7: enum-typed metadata fields. Wrong values demote to warning + drop
  // at map time (mapGeneratedQuestionToCreateInput re-checks).
  if (
    typeof question.layer === "string" &&
    !isLayer(question.layer)
  ) {
    warnings.push(`${prefix}.layer 取值非法：${question.layer}`);
  }
  if (
    typeof question.expectedFixScope === "string" &&
    !isExpectedFixScope(question.expectedFixScope)
  ) {
    warnings.push(
      `${prefix}.expectedFixScope 取值非法：${question.expectedFixScope}`,
    );
  }
  if (
    typeof question.serverClientBoundary === "string" &&
    !isServerClientBoundary(question.serverClientBoundary)
  ) {
    warnings.push(
      `${prefix}.serverClientBoundary 取值非法：${question.serverClientBoundary}`,
    );
  }

  // §7.2 quality bar: ai_review / diff_review / code_fix MUST carry the
  // real-world impact + AI-review risk fields. Missing them is a warning
  // (the draft is still acceptable, but the reviewer should fill them in).
  if (type && (RICH_METADATA_REQUIRED_TYPES as readonly string[]).includes(type)) {
    if (!hasNonEmptyString(question.realWorldImpact)) {
      warnings.push(
        `${prefix}.realWorldImpact 建议填写（${type} 类型应说明改坏的真实代价）`,
      );
    }
    if (!hasNonEmptyString(question.aiReviewRisk)) {
      warnings.push(
        `${prefix}.aiReviewRisk 建议填写（${type} 类型应说明 AI 倾向的错误改法）`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateAiQuestionGenerationOutput(
  data: unknown,
): AiValidationResult & { output?: AiQuestionGenerationOutput } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(data)) {
    return { valid: false, errors: ["根对象必须是 JSON 对象"], warnings };
  }

  if (!hasNonEmptyString(data.title)) {
    errors.push("title 必填");
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push("questions 必须是非空数组");
    return { valid: false, errors, warnings };
  }

  for (let i = 0; i < data.questions.length; i++) {
    const result = validateGeneratedQuestion(data.questions[i], i);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  const security = validateAiSecurityContent(JSON.stringify(data));
  errors.push(...security.errors);
  warnings.push(...security.warnings);

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  return {
    valid: true,
    errors,
    warnings,
    output: data as AiQuestionGenerationOutput,
  };
}

/**
 * Phase 7 layer-aware bank shape validator. Runs *after*
 * validateAiQuestionGenerationOutput to enforce timu.MD targets:
 *   - minimum 22 questions per bank (or whatever caller passes)
 *   - at least N distinct layers present
 *   - per-layer minimums when minQuestionsPerLayer is given
 *
 * Returns warnings (not errors) by default — the bank is still saved as
 * a draft for human review even if it's thin. Pass `{ strict: true }`
 * to promote the layer-mix issues to errors.
 */
export function validateQuestionBankShape(
  output: AiQuestionGenerationOutput,
  opts?: {
    minQuestions?: number;
    minDistinctLayers?: number;
    minQuestionsPerLayer?: Partial<Record<Layer, number>>;
    strict?: boolean;
  },
): AiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const minQuestions = opts?.minQuestions ?? 22;
  const minDistinctLayers = opts?.minDistinctLayers ?? 5;
  const strict = opts?.strict ?? false;
  const push = (msg: string) => (strict ? errors : warnings).push(msg);

  if (output.questions.length < minQuestions) {
    push(
      `bank size ${output.questions.length} < ${minQuestions} (timu.MD §3 要求 22+/课)`,
    );
  }

  const layerCounts = new Map<string, number>();
  for (const q of output.questions) {
    const layer = (q as { layer?: string }).layer;
    if (layer) layerCounts.set(layer, (layerCounts.get(layer) ?? 0) + 1);
  }

  if (layerCounts.size < minDistinctLayers) {
    push(
      `仅出现 ${layerCounts.size} 个 layer（${[...layerCounts.keys()].join(",")}），timu.MD §7 要求 ${minDistinctLayers}+`,
    );
  }

  if (opts?.minQuestionsPerLayer) {
    for (const [layer, min] of Object.entries(opts.minQuestionsPerLayer)) {
      if (typeof min !== "number") continue;
      const got = layerCounts.get(layer) ?? 0;
      if (got < min) {
        push(`layer=${layer} 仅 ${got} 题，要求 ${min}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function mapGeneratedQuestionToCreateInput(
  question: GeneratedQuestion,
  lessonId: string,
  orderIndex: number,
  sourceFilePath?: string,
): CreateQuestionInput {
  const abilityTags = question.abilityTags.filter(
    (tag): tag is AbilityTag => isAbilityTag(tag),
  );

  // Phase 7: pass through the rich metadata fields. Enum-typed fields are
  // re-validated here so an AI mishap can't write garbage into D1.
  const layer = question.layer && isLayer(question.layer) ? question.layer : undefined;
  const expectedFixScope =
    question.expectedFixScope && isExpectedFixScope(question.expectedFixScope)
      ? question.expectedFixScope
      : undefined;
  const serverClientBoundary =
    question.serverClientBoundary &&
    isServerClientBoundary(question.serverClientBoundary)
      ? question.serverClientBoundary
      : undefined;

  return {
    lessonId,
    type: question.type,
    title: question.title,
    prompt: question.prompt,
    code: question.code,
    options: question.options,
    blanks: question.blanks,
    sortItems: question.sortItems,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    abilityTags: abilityTags.length > 0 ? abilityTags : ["project.modify.fullstack"],
    mistakeTypes: question.mistakeTypes,
    difficulty: mapGeneratedDifficulty(question.difficulty),
    sourceFilePath,
    orderIndex,
    isPublished: true,
    diffSnippet: question.diffSnippet,
    linePickLines: question.linePickLines,
    codeFixBaseline: question.codeFixBaseline,
    expectedFixScope,
    serverClientBoundary,
    touchedFiles: question.touchedFiles,
    wrongAnswerFeedback: question.wrongAnswerFeedback,
    realWorldImpact: question.realWorldImpact,
    aiReviewRisk: question.aiReviewRisk,
    typeSafetyRisk: question.typeSafetyRisk,
    layer,
  };
}
