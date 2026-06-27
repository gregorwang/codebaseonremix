import type {
  AiQuestionDraft,
  CodeSnippet,
  Course,
  Difficulty,
  Exam,
  ExamResult,
  Lesson,
  Mistake,
  Question,
  QuestionType,
  UserAnswer,
} from "~/lib/learn/types";
import type { AiExplanationInput } from "~/lib/learn/types";
import type { AbilityTag } from "~/lib/learn/abilityTags";
import { parseJsonField } from "../learn/db-json.server";
import { getUserAttempts } from "../learn/attempts.server";
import { createValidatedAiDraft, AiDraftValidationError } from "../learn/aiDrafts.server";
import {
  validateQuestionBankShape,
  parseStructuredCodeExplain,
  type StructuredCodeExplain,
} from "./aiSchemas.server";
import {
  AiGatewayError,
  callAiGateway,
  type AiFeature,
} from "./aiGateway.server";
import { parseAiJsonResponse } from "./aiJson.server";
import { logAiExplanation, logAiUsage } from "./aiLogs.server";
import {
  buildExplanationPrompt,
  buildHintPrompt,
  buildMistakeSummaryPrompt,
  buildQuestionGenerationPrompt,
  buildExamReviewPrompt,
  buildLessonTeachingPrompt,
  buildCodeOrientationPrompt,
  buildLessonDiagramPrompt,
  buildQuestionDiagramPrompt,
  buildCodeExplainPrompt,
} from "./aiPrompts.server";
// Rate limiting was removed: the only meaningful cost gate is the AI Gateway
// quota itself, which Cloudflare enforces upstream. The previous per-user
// hourly cap blocked normal study flow ("AI 讲解已达本小时上限 10 次") with
// zero benefit. Upstream 429s still surface via AiGatewayError("rate_limited").

export type AiLearnResult = {
  text: string;
  feature: AiFeature;
  hintLevel?: number;
};

export type GenerateQuestionsFromSnippetResult = {
  draft: AiQuestionDraft;
};

export type GenerateQuestionDraftInput = {
  userId: string;
  sourceTitle: string;
  sourceCode: string;
  sourceFilePath?: string;
  projectContext?: string;
  userConfusion?: string;
  targetAbilities: AbilityTag[];
  preferredQuestionTypes: QuestionType[];
  difficulty: Difficulty;
  generationGoal: string;
  desiredQuestionCount?: number;
  snippetId?: string;
  /** Phase 7: layer-aware generation. AI is told to cover at least these
   *  layers; passing a subset narrows the prompt's layer pool. */
  targetLayers?: import("~/lib/learn/types").Layer[];
  /** Phase 7: per-layer minimum counts. Used by validateQuestionBankShape. */
  minQuestionsPerLayer?: Partial<
    Record<import("~/lib/learn/types").Layer, number>
  >;
  /** Phase 7: when true, layer-mix shortfalls promote to errors and the
   *  draft is rejected. Default false — shortfalls become draft warnings. */
  strictLayerMix?: boolean;
};

export type AiLearnError = {
  code:
    | "rate_limited"
    | "not_configured"
    | "upstream_5xx"
    | "upstream_timeout"
    | "ai_parse_failed"
    | "ai_failed"
    | "forbidden";
  message: string;
  /**
   * 仅 upstream_5xx / upstream_timeout / ai_parse_failed 时建议给前端展示"重试"按钮;
   * not_configured / rate_limited / forbidden / ai_failed (兜底) 不建议重试。
   */
  retryable?: boolean;
  /** AiGatewayError 透出的尝试次数, 给前端日志/排查链路用。 */
  attemptCount?: number;
};

export function toAiLearnError(error: unknown): AiLearnError {
  if (error instanceof AiGatewayError) {
    const attemptCount = error.attemptCount;
    if (error.code === "not_configured") {
      return { code: "not_configured", message: error.message, attemptCount };
    }
    if (error.code === "rate_limited") {
      return { code: "rate_limited", message: error.message, attemptCount };
    }
    if (error.code === "upstream_5xx") {
      return {
        code: "upstream_5xx",
        message: error.message || "AI 服务端暂时不可用, 可稍后重试。",
        retryable: true,
        attemptCount,
      };
    }
    if (error.code === "upstream_timeout") {
      return {
        code: "upstream_timeout",
        message: error.message || "AI 网关响应过慢, 可稍后重试。",
        retryable: true,
        attemptCount,
      };
    }
    if (error.code === "upstream_parse_failed") {
      return {
        code: "ai_parse_failed",
        message: error.message || "AI 返回内容解析失败, 可重试。",
        retryable: true,
        attemptCount,
      };
    }
    // 普通 upstream (4xx 非 429 / 网络层)。重试已经在网关层用完, 这里默认不再建议前端再点。
    return { code: "ai_failed", message: error.message, attemptCount };
  }
  if (error instanceof Error && error.message.includes("未找到")) {
    return { code: "forbidden", message: error.message };
  }
  if (error instanceof AiDraftValidationError) {
    return { code: "ai_parse_failed", message: error.message, retryable: true };
  }
  // 例如 aiSchemas.server.ts 抛出的 "AI 返回的不是合法 JSON" / "AI 返回结构非对象"。
  if (error instanceof Error && /AI 返回(的不是合法 JSON|结构非对象)/.test(error.message)) {
    return { code: "ai_parse_failed", message: error.message, retryable: true };
  }
  return {
    code: "ai_failed",
    message: error instanceof Error ? error.message : "AI 请求失败",
  };
}

async function assertWrongAttemptExists(
  db: D1Database,
  userId: string,
  questionId: string,
) {
  const attempts = await getUserAttempts(db, userId, {
    questionId,
    limit: 1,
  });
  const latest = attempts[0];
  if (!latest || latest.is_correct === 1) {
    throw new Error("未找到该题的错误作答记录，请先提交错误答案后再使用 AI。");
  }
  return latest;
}

/** 放宽门禁: 只要用户提交过(对错均可)就允许。用于答题后的结合讲解 / 思维导图。 */
async function assertAttemptExists(
  db: D1Database,
  userId: string,
  questionId: string,
) {
  const attempts = await getUserAttempts(db, userId, {
    questionId,
    limit: 1,
  });
  const latest = attempts[0];
  if (!latest) {
    throw new Error("请先提交答案后再使用 AI 讲解。");
  }
  return latest;
}

/**
 * 把日志写入排到响应之外: 用户等的是 AI 文本, 不是 D1 INSERT。
 *
 * 拿到 ExecutionContext 时走 ctx.waitUntil — Workers runtime 会保活 worker
 * 直到 promise settle, 不阻塞 fetch 返回, 也不会被 GC 提前杀掉。拿不到时
 * (单元测试 / 直接调用) 退回单纯的 fire-and-forget, 加 .catch 防止
 * unhandledRejection 把进程拖崩。
 *
 * 关键点: 即便日志写失败, 用户已经拿到 AI 回复 — 日志只是观测面,
 * 不应该影响功能。
 */
function fireAndForget(
  ctx: ExecutionContext | undefined,
  work: Promise<unknown>,
): void {
  const guarded = work.catch((err) => {
    console.error("[ai-log] background write failed", err);
  });
  if (ctx) {
    try {
      ctx.waitUntil(guarded);
      return;
    } catch (err) {
      // Workers runtime 偶尔会拒绝 waitUntil (比如响应已发送过久),
      // 这种情况退回普通 fire-and-forget 而不是把错误抛给调用方。
      console.warn("[ai-log] ctx.waitUntil rejected; falling back", err);
    }
  }
  // 不需要 await 也不需要 return — guarded 已经吃掉了 rejection。
  void guarded;
}

async function runAiFeature(
  db: D1Database,
  env: Env,
  params: {
    userId: string;
    feature: AiFeature;
    questionId?: string;
    attemptId?: string;
    promptType: string;
    systemPrompt: string;
    prompt: string;
    input: unknown;
    hintLevel?: number;
    /**
     * Workers 的 ExecutionContext, 用来把日志写入交给 ctx.waitUntil。
     * 调用方拿不到时 (脚本 / 测试) 留空即可, 自动退回 fire-and-forget。
     */
    executionCtx?: ExecutionContext;
  },
): Promise<AiLearnResult> {
  try {
    const response = await callAiGateway(env, {
      feature: params.feature,
      userId: params.userId,
      systemPrompt: params.systemPrompt,
      prompt: params.prompt,
      maxTokens:
        params.feature === "explanation"
          ? 4096
          : params.feature === "hint"
            ? 800
            : params.feature === "lesson_teaching"
              ? 4096
              : params.feature === "code_orientation"
                ? 4096
                : params.feature === "lesson_diagram"
                  ? 1500
                  : params.feature === "question_diagram"
                    ? 1500
                    : undefined,
    });

    fireAndForget(
      params.executionCtx,
      Promise.all([
        logAiExplanation(db, {
          userId: params.userId,
          questionId: params.questionId,
          attemptId: params.attemptId,
          feature: params.feature,
          promptType: params.promptType,
          input: params.input,
          output: response.text,
          provider: response.provider,
          model: response.model,
          success: true,
          latencyMs: response.latencyMs,
        }),
        logAiUsage(db, {
          userId: params.userId,
          feature: params.feature,
          provider: response.provider,
          model: response.model,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          latencyMs: response.latencyMs,
          success: true,
        }),
      ]),
    );

    return {
      text: response.text,
      feature: params.feature,
      hintLevel: params.hintLevel,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 请求失败";
    // G: 网关层透传了 attemptCount; 写进 error_message 末尾, 方便事后查"重试有没有救回来"。
    const attemptCount =
      error instanceof AiGatewayError && error.attemptCount
        ? error.attemptCount
        : undefined;
    const annotated = attemptCount && attemptCount > 1
      ? `${message} [attempts=${attemptCount}]`
      : message;

    fireAndForget(
      params.executionCtx,
      Promise.all([
        logAiExplanation(db, {
          userId: params.userId,
          questionId: params.questionId,
          attemptId: params.attemptId,
          feature: params.feature,
          promptType: params.promptType,
          input: params.input,
          success: false,
          error: annotated,
        }),
        logAiUsage(db, {
          userId: params.userId,
          feature: params.feature,
          success: false,
          error: annotated,
        }),
      ]),
    );

    throw error;
  }
}

export async function generateHint(
  db: D1Database,
  env: Env,
  params: {
    userId: string;
    question: Question;
    course: Course;
    lesson: Lesson;
    userAnswer?: UserAnswer;
    previousHintCount: number;
  },
  ctx?: ExecutionContext,
): Promise<AiLearnResult> {
  const attempt = await assertWrongAttemptExists(
    db,
    params.userId,
    params.question.id,
  );

  const hintLevel = Math.min(4, params.previousHintCount + 1);
  const built = buildHintPrompt(
    {
      question: params.question,
      userAnswer: params.userAnswer,
      previousHintCount: params.previousHintCount,
      projectContext: params.course.projectContext,
    },
    hintLevel,
  );

  const result = await runAiFeature(db, env, {
    userId: params.userId,
    feature: "hint",
    questionId: params.question.id,
    attemptId: attempt.id,
    promptType: built.promptType,
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    input: {
      questionId: params.question.id,
      hintLevel,
      previousHintCount: params.previousHintCount,
    },
    hintLevel,
    executionCtx: ctx,
  });

  return result;
}

export async function generateExplanation(
  db: D1Database,
  env: Env,
  questionId: string,
  input: AiExplanationInput,
  ctx?: ExecutionContext,
): Promise<AiLearnResult> {
  // 放宽: 对错都讲(答对→确认+加深, 答错→纠正), 但必须先提交过。
  const attempt = await assertAttemptExists(db, input.userId, questionId);

  const built = buildExplanationPrompt(input);

  const result = await runAiFeature(db, env, {
    userId: input.userId,
    feature: "explanation",
    questionId,
    attemptId: attempt.id,
    promptType: built.promptType,
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    input,
    executionCtx: ctx,
  });

  // v3: AI 直接产 markdown 成品, 前端用 AiMarkdown 整块画。不再解析行锚定 JSON。
  return result;
}

export async function generateMistakeSummary(
  db: D1Database,
  env: Env,
  params: {
    userId: string;
    mistake: Mistake;
    question: Question;
    course: Course;
    lesson: Lesson;
  },
  ctx?: ExecutionContext,
): Promise<AiLearnResult> {
  const built = buildMistakeSummaryPrompt(params.mistake, params.question, {
    courseTitle: params.course.title,
    lessonTitle: params.lesson.title,
    projectContext: params.course.projectContext,
  });

  return runAiFeature(db, env, {
    userId: params.userId,
    feature: "mistake_summary",
    questionId: params.question.id,
    promptType: built.promptType,
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    input: {
      mistakeId: params.mistake.id,
      questionId: params.question.id,
    },
    executionCtx: ctx,
  });
}

export async function generateExamReview(
  db: D1Database,
  env: Env,
  params: {
    userId: string;
    exam: Exam;
    result: ExamResult;
    questions: Question[];
  },
  ctx?: ExecutionContext,
): Promise<AiLearnResult> {
  const built = buildExamReviewPrompt(
    params.exam,
    params.result,
    params.questions,
  );

  return runAiFeature(db, env, {
    userId: params.userId,
    feature: "exam_review",
    promptType: built.promptType,
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    input: {
      examId: params.exam.id,
      resultId: params.result.id,
      score: params.result.score,
    },
    executionCtx: ctx,
  });
}

export async function generateAndValidateQuestionDraft(
  db: D1Database,
  env: Env,
  params: GenerateQuestionDraftInput,
  ctx?: ExecutionContext,
): Promise<GenerateQuestionsFromSnippetResult> {
  const built = buildQuestionGenerationPrompt({
    sourceTitle: params.sourceTitle,
    sourceCode: params.sourceCode,
    sourceFilePath: params.sourceFilePath,
    projectContext: params.projectContext,
    userConfusion: params.userConfusion,
    targetAbilities: params.targetAbilities,
    preferredQuestionTypes: params.preferredQuestionTypes,
    difficulty: params.difficulty,
    generationGoal: params.generationGoal,
    desiredQuestionCount: params.desiredQuestionCount,
    targetLayers: params.targetLayers,
    minQuestionsPerLayer: params.minQuestionsPerLayer,
  });

  const input = {
    snippetId: params.snippetId,
    targetAbilities: params.targetAbilities,
    preferredQuestionTypes: params.preferredQuestionTypes,
    difficulty: params.difficulty,
    generationGoal: params.generationGoal,
    desiredQuestionCount: params.desiredQuestionCount ?? 22,
    targetLayers: params.targetLayers,
    minQuestionsPerLayer: params.minQuestionsPerLayer,
    strictLayerMix: params.strictLayerMix ?? false,
  };

  try {
    const response = await callAiGateway(env, {
      feature: "question_generation",
      userId: params.userId,
      systemPrompt: built.systemPrompt,
      prompt: built.prompt,
    });

    const parsed = parseAiJsonResponse(response.text);
    if (!parsed.ok) {
      throw new AiDraftValidationError([parsed.error]);
    }

    // Phase 7: layer-aware bank shape validation. Runs in addition to the
    // per-question validation inside createValidatedAiDraft. Warnings are
    // attached to the draft; errors (only when strictLayerMix=true) abort
    // before the draft is persisted.
    const shape = validateQuestionBankShape(
      parsed.data as import("~/lib/learn/types").AiQuestionGenerationOutput,
      {
        minQuestions: params.desiredQuestionCount ?? 22,
        minDistinctLayers: 5,
        minQuestionsPerLayer: params.minQuestionsPerLayer,
        strict: params.strictLayerMix ?? false,
      },
    );
    if (!shape.valid) {
      throw new AiDraftValidationError(shape.errors);
    }

    const draft = await createValidatedAiDraft(db, {
      snippetId: params.snippetId,
      createdBy: params.userId,
      sourceTitle: params.sourceTitle,
      sourceCode: params.sourceCode,
      sourceFilePath: params.sourceFilePath,
      projectContext: params.projectContext,
      generationGoal: params.generationGoal,
      targetAbilities: params.targetAbilities,
      preferredQuestionTypes: params.preferredQuestionTypes,
      generated: parsed.data,
    });

    fireAndForget(
      ctx,
      Promise.all([
        logAiExplanation(db, {
          userId: params.userId,
          feature: "question_generation",
          promptType: built.promptType,
          input,
          output: response.text,
          provider: response.provider,
          model: response.model,
          success: true,
          latencyMs: response.latencyMs,
        }),
        logAiUsage(db, {
          userId: params.userId,
          feature: "question_generation",
          provider: response.provider,
          model: response.model,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          latencyMs: response.latencyMs,
          success: true,
        }),
      ]),
    );

    return { draft };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 请求失败";

    fireAndForget(
      ctx,
      Promise.all([
        logAiExplanation(db, {
          userId: params.userId,
          feature: "question_generation",
          promptType: built.promptType,
          input,
          success: false,
          error: message,
        }),
        logAiUsage(db, {
          userId: params.userId,
          feature: "question_generation",
          success: false,
          error: message,
        }),
      ]),
    );

    throw error;
  }
}

export async function generateQuestionsFromSnippet(
  db: D1Database,
  env: Env,
  params: {
    userId: string;
    snippet: CodeSnippet;
    targetAbilities: AbilityTag[];
    preferredQuestionTypes: QuestionType[];
    difficulty: Difficulty;
    generationGoal: string;
    desiredQuestionCount?: number;
  },
  ctx?: ExecutionContext,
): Promise<GenerateQuestionsFromSnippetResult> {
  return generateAndValidateQuestionDraft(
    db,
    env,
    {
      userId: params.userId,
      snippetId: params.snippet.id,
      sourceTitle: params.snippet.title,
      sourceCode: params.snippet.code,
      sourceFilePath: params.snippet.sourceFilePath,
      projectContext: params.snippet.projectContext,
      userConfusion: params.snippet.userConfusion,
      targetAbilities: params.targetAbilities,
      preferredQuestionTypes: params.preferredQuestionTypes,
      difficulty: params.difficulty,
      generationGoal: params.generationGoal,
      desiredQuestionCount: params.desiredQuestionCount,
    },
    ctx,
  );
}

export function parseAttemptUserAnswer(row: {
  user_answer_json: string;
}): unknown {
  return parseJsonField(row.user_answer_json, null);
}

/* ---------------------------------------------------------------- *
 * 课级 AI 知识点讲解。前端按钮触发, 路由先查 KV cache, miss 才走这里。
 * 输出是 markdown 文本, 由前端 AiMarkdown 渲染。
 * ---------------------------------------------------------------- */

export type GenerateLessonTeachingInput = {
  userId: string;
  courseTitle: string;
  courseSlug: string;
  projectContext: string;
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
  lessonSummary: string;
  lessonFocus: string;
  abilityTags: string[];
  primaryFilePath: string;
  primaryFileCode: string;
  questionCodeSamples?: string;
};

export async function generateLessonTeaching(
  db: D1Database,
  env: Env,
  input: GenerateLessonTeachingInput,
  ctx?: ExecutionContext,
): Promise<AiLearnResult> {
  const built = buildLessonTeachingPrompt({
    courseTitle: input.courseTitle,
    courseSlug: input.courseSlug,
    projectContext: input.projectContext,
    lessonTitle: input.lessonTitle,
    lessonSlug: input.lessonSlug,
    lessonSummary: input.lessonSummary,
    lessonFocus: input.lessonFocus,
    abilityTags: input.abilityTags,
    primaryFilePath: input.primaryFilePath,
    primaryFileCode: input.primaryFileCode,
    questionCodeSamples: input.questionCodeSamples,
  });

  return runAiFeature(db, env, {
    userId: input.userId,
    feature: "lesson_teaching",
    promptType: built.promptType,
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    input: {
      lessonId: input.lessonId,
      courseSlug: input.courseSlug,
      lessonSlug: input.lessonSlug,
      primaryFilePath: input.primaryFilePath,
      hasCode: input.primaryFileCode.trim().length > 0,
    },
    executionCtx: ctx,
  });
}

/* ----------------------------------------------------------------
 * generateCodeOrientation — 卡1 答题前的「读前导读」(markdown 成品)。
 * 与 generateLessonTeaching(markdown, 供 TeachingPhase) 同栈但作用域不同(题目级 vs 关卡级)。
 * 输入是某个源码文件的完整代码; 输出由 AI 自己组装的 markdown(含 ```代码块``` + 讲解)。
 * ---------------------------------------------------------------- */

export async function generateCodeOrientation(
  db: D1Database,
  env: Env,
  input: {
    userId: string;
    filePath: string;
    fileCode: string;
    lessonTitle: string;
    lessonFocus: string;
    abilityTags: string[];
  },
  ctx?: ExecutionContext,
): Promise<AiLearnResult> {
  const built = buildCodeOrientationPrompt({
    lessonTitle: input.lessonTitle,
    lessonFocus: input.lessonFocus,
    abilityTags: input.abilityTags,
    primaryFilePath: input.filePath,
    primaryFileCode: input.fileCode,
  });

  const result = await runAiFeature(db, env, {
    userId: input.userId,
    feature: "code_orientation",
    promptType: built.promptType,
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    input: { filePath: input.filePath },
    executionCtx: ctx,
  });

  // v3: AI 直接产 markdown 成品。
  return result;
}

/* ----------------------------------------------------------------
 * generateCodeExplain — 新版「老师旁批注」结构化讲解。
 *
 * 与 generateCodeOrientation / generateExplanation 平行: 同样的源码 + 关卡上下文
 * (explanation stage 还会带上题目 + 用户作答), 但要求 AI 输出严格 JSON 结构,
 * 解析后给 CodeExplainView 渲染成卡片化批注, 不走 markdown。
 *
 * 两个 stage:
 *  - orientation: 答题前导读, 中性不剧透。无 attempt 强制。
 *  - explanation: 答题后讲解, 结合用户作答; 必须先提交过 (复用 assertAttemptExists)。
 *
 * 返回:
 *   - AiLearnResult: 原始 JSON 字符串 (供 KV 缓存 + 日志)
 *   - parsed: 解析后的结构化批注 (供路由直接 spread 到响应)
 * ---------------------------------------------------------------- */

export type GenerateCodeExplainInput = {
  userId: string;
  stage: "orientation" | "explanation";
  lessonTitle: string;
  lessonFocus: string;
  abilityTags: string[];
  filePath: string;
  fileCode: string;
  fileLineCount: number;
  /** stage === "explanation" 时必填。 */
  questionContext?: {
    questionId: string;
    title: string;
    prompt: string;
    questionType: string;
    userAnswerJson: string;
    correctAnswerJson: string;
    baseExplanation?: string;
    mistakeType?: string;
  };
};

export async function generateCodeExplain(
  db: D1Database,
  env: Env,
  input: GenerateCodeExplainInput,
  ctx?: ExecutionContext,
): Promise<AiLearnResult & { parsed: StructuredCodeExplain }> {
  // explanation stage 守门: 必须先有 attempt, 不允许"没答就要批注"绕过 orientation。
  if (input.stage === "explanation") {
    if (!input.questionContext) {
      throw new Error("explanation 阶段需要 questionContext");
    }
    await assertAttemptExists(db, input.userId, input.questionContext.questionId);
  }

  const built = buildCodeExplainPrompt({
    stage: input.stage,
    lessonTitle: input.lessonTitle,
    lessonFocus: input.lessonFocus,
    abilityTags: input.abilityTags,
    filePath: input.filePath,
    fileCode: input.fileCode,
    questionContext: input.questionContext
      ? {
          title: input.questionContext.title,
          prompt: input.questionContext.prompt,
          questionType: input.questionContext.questionType,
          userAnswerJson: input.questionContext.userAnswerJson,
          correctAnswerJson: input.questionContext.correctAnswerJson,
          baseExplanation: input.questionContext.baseExplanation,
          mistakeType: input.questionContext.mistakeType,
        }
      : undefined,
  });

  const result = await runAiFeature(db, env, {
    userId: input.userId,
    feature: "code_explain",
    questionId: input.questionContext?.questionId,
    promptType: built.promptType,
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    input: { filePath: input.filePath, stage: input.stage },
    executionCtx: ctx,
  });

  let parsed: StructuredCodeExplain;
  try {
    parsed = parseStructuredCodeExplain(
      result.text,
      input.fileLineCount,
      input.filePath,
    );
  } catch (err) {
    // AI 输出不是合法 JSON / 没有有效批注: 抛 Error 让上层 toAiLearnError 抓住,
    // 路由层会返回 ai_failed, 前端弹"重新生成"。
    throw new Error(
      err instanceof Error
        ? `AI 返回结构无法解析: ${err.message}`
        : "AI 返回结构无法解析",
    );
  }

  return { ...result, parsed };
}

/* ----------------------------------------------------------------
 * generateLessonDiagram
 *
 * 与 generateLessonTeaching 平行: 同样的 lesson 上下文, 但产出 Mermaid 源码
 * (mindmap / flowchart / sequenceDiagram), 客户端用 mermaid 库渲染。
 * 路由层会和 teaching 并发调用。
 * ---------------------------------------------------------------- */

export type GenerateLessonDiagramInput = GenerateLessonTeachingInput;

export async function generateLessonDiagram(
  db: D1Database,
  env: Env,
  input: GenerateLessonDiagramInput,
  ctx?: ExecutionContext,
): Promise<AiLearnResult> {
  const built = buildLessonDiagramPrompt({
    courseTitle: input.courseTitle,
    courseSlug: input.courseSlug,
    projectContext: input.projectContext,
    lessonTitle: input.lessonTitle,
    lessonSlug: input.lessonSlug,
    lessonSummary: input.lessonSummary,
    lessonFocus: input.lessonFocus,
    abilityTags: input.abilityTags,
    primaryFilePath: input.primaryFilePath,
    primaryFileCode: input.primaryFileCode,
    questionCodeSamples: input.questionCodeSamples,
  });

  const result = await runAiFeature(db, env, {
    userId: input.userId,
    feature: "lesson_diagram",
    promptType: built.promptType,
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    input: {
      lessonId: input.lessonId,
      courseSlug: input.courseSlug,
      lessonSlug: input.lessonSlug,
      primaryFilePath: input.primaryFilePath,
      hasCode: input.primaryFileCode.trim().length > 0,
    },
    executionCtx: ctx,
  });

  // 即便 system prompt 严令禁止, 模型仍可能习惯性包 ```mermaid ... ``` 代码块,
  // 或在 flowchart 里误用 sequenceDiagram 专用的 `Note over` 语法 (会直接解析报错)。
  // 在这里做一次保守的清洗, 让前端 MermaidDiagram 拿到的永远是干净、可渲染的源码。
  return { ...result, text: sanitizeMermaid(result.text) };
}

function stripMermaidFence(text: string): string {
  const trimmed = text.trim();
  // ```mermaid ... ``` 或 ``` ... ```
  const fenceMatch = /^```(?:mermaid)?\s*\n([\s\S]+?)\n```\s*$/.exec(trimmed);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

/**
 * 在剥掉代码围栏的基础上, 修掉模型最常踩的语法坑:
 *  - `Note over` / `Note left of` / `Note right of` 只在 sequenceDiagram 合法,
 *    模型却常把它写进 flowchart / mindmap, 导致整张图解析失败、页面飘出炸弹。
 *    这里仅在「图不是 sequenceDiagram」时把这类行删掉, 让其余部分仍能渲染。
 */
function sanitizeMermaid(text: string): string {
  const source = stripMermaidFence(text);
  // 取第一行非空内容判断图类型 (mindmap / flowchart / graph / sequenceDiagram ...)。
  const firstMeaningful = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  const isSequence = /^sequenceDiagram\b/.test(firstMeaningful ?? "");
  if (isSequence) return source;

  const cleaned = source
    .split("\n")
    .filter((line) => !/^\s*Note\s+(over|left of|right of)\b/i.test(line))
    .join("\n");
  return cleaned.trim();
}

/* ----------------------------------------------------------------
 * generateQuestionDiagram
 *
 * 与 generateExplanation 平行: 同样的 AiExplanationInput 上下文 + 同样的
 * "必须先有错答 attempt" 守门, 但产出 Mermaid 源码, 客户端用 mermaid 库渲染。
 * 对应错题面板里第三颗按钮 "🧠 思维导图"。
 * ---------------------------------------------------------------- */

export async function generateQuestionDiagram(
  db: D1Database,
  env: Env,
  questionId: string,
  input: AiExplanationInput,
  ctx?: ExecutionContext,
): Promise<AiLearnResult> {
  // 放宽门禁: 提交过即可(对错都给图)。
  const attempt = await assertAttemptExists(db, input.userId, questionId);

  const built = buildQuestionDiagramPrompt(input);

  const result = await runAiFeature(db, env, {
    userId: input.userId,
    feature: "question_diagram",
    questionId,
    attemptId: attempt.id,
    promptType: built.promptType,
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    input,
    executionCtx: ctx,
  });

  // 复用 lesson_diagram 的清洗: 剥 ```mermaid 围栏 + 删掉 flowchart 里误用的 `Note over`。
  return { ...result, text: sanitizeMermaid(result.text) };
}
