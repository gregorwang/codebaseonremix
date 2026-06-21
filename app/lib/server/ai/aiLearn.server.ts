import type {
  AiQuestionDraft,
  AnnotatedExplanation,
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
import { parseAnnotatedExplanation, validateQuestionBankShape } from "./aiSchemas.server";
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
} from "./aiPrompts.server";
// Rate limiting was removed: the only meaningful cost gate is the AI Gateway
// quota itself, which Cloudflare enforces upstream. The previous per-user
// hourly cap blocked normal study flow ("AI 讲解已达本小时上限 10 次") with
// zero benefit. Upstream 429s still surface via AiGatewayError("rate_limited").

export type AiLearnResult = {
  text: string;
  feature: AiFeature;
  hintLevel?: number;
  /** 行锚定讲解(explanation / lesson_teaching 解析后填充)。 */
  annotated?: AnnotatedExplanation;
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
  code: "rate_limited" | "not_configured" | "ai_failed" | "forbidden";
  message: string;
};

export function toAiLearnError(error: unknown): AiLearnError {
  if (error instanceof AiGatewayError) {
    if (error.code === "not_configured") {
      return { code: "not_configured", message: error.message };
    }
    if (error.code === "rate_limited") {
      return { code: "rate_limited", message: error.message };
    }
    return { code: "ai_failed", message: error.message };
  }
  if (error instanceof Error && error.message.includes("未找到")) {
    return { code: "forbidden", message: error.message };
  }
  if (error instanceof AiDraftValidationError) {
    return { code: "ai_failed", message: error.message };
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
          ? 2500
          : params.feature === "hint"
            ? 800
            : params.feature === "lesson_teaching"
              ? 4096
              : params.feature === "code_orientation"
                ? 3000
                : params.feature === "lesson_diagram"
                  ? 1500
                  : params.feature === "question_diagram"
                    ? 1500
                    : undefined,
    });

    await Promise.all([
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
    ]);

    return {
      text: response.text,
      feature: params.feature,
      hintLevel: params.hintLevel,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 请求失败";

    await Promise.all([
      logAiExplanation(db, {
        userId: params.userId,
        questionId: params.questionId,
        attemptId: params.attemptId,
        feature: params.feature,
        promptType: params.promptType,
        input: params.input,
        success: false,
        error: message,
      }),
      logAiUsage(db, {
        userId: params.userId,
        feature: params.feature,
        success: false,
        error: message,
      }),
    ]);

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
  });

  return result;
}

export async function generateExplanation(
  db: D1Database,
  env: Env,
  questionId: string,
  input: AiExplanationInput,
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
  });

  const lineCount =
    input.fullFileLineCount ??
    (input.fullFileCode ?? input.code ?? "").split(/\r?\n/).length;
  const annotated = parseAnnotatedExplanation(result.text, lineCount);
  return { ...result, annotated };
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
  });
}

export async function generateAndValidateQuestionDraft(
  db: D1Database,
  env: Env,
  params: GenerateQuestionDraftInput,
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

    await Promise.all([
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
    ]);

    return { draft };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 请求失败";

    await Promise.all([
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
    ]);

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
): Promise<GenerateQuestionsFromSnippetResult> {
  return generateAndValidateQuestionDraft(db, env, {
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
  });
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
  });
}

/* ----------------------------------------------------------------
 * generateCodeOrientation — 卡1 答题前的「读前导读」(行锚定 JSON)。
 * 与 generateLessonTeaching(markdown, 供 TeachingPhase) 是两条独立链路。
 * 输入是某个源码文件的完整代码; 输出 AnnotatedExplanation。
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
  });

  const lineCount = input.fileCode.split(/\r?\n/).length;
  const annotated = parseAnnotatedExplanation(result.text, lineCount);
  return { ...result, annotated };
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
  });

  // 复用 lesson_diagram 的清洗: 剥 ```mermaid 围栏 + 删掉 flowchart 里误用的 `Note over`。
  return { ...result, text: sanitizeMermaid(result.text) };
}
