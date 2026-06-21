import { data, redirect } from "react-router";
import { LessonFlow } from "~/components/learn/lesson/LessonFlow";
import { parseUserAnswer } from "~/lib/learn/parseUserAnswer";
import type { QuestionType, TeachingBlock, UserAnswer } from "~/lib/learn/types";
import {
  generateExplanation,
  generateHint,
  generateLessonTeaching,
  generateLessonDiagram,
  generateQuestionDiagram,
  generateCodeOrientation,
  parseAttemptUserAnswer,
  toAiLearnError,
} from "~/lib/server/ai/aiLearn.server";
import {
  calculateLessonProgress,
  getUserAttempts,
  submitAnswer,
} from "~/lib/server/learn/attempts.server";
import { getCourseStructure } from "~/lib/server/learn/cache-public.server";
import {
  getLessonQuestionList,
  resolveQuestionIndex,
} from "~/lib/server/learn/cache-lesson.server";
import { getQuestionById, getQuestionsByLesson } from "~/lib/server/learn/questions.server";
import { getSourceFileContent } from "~/lib/server/project-curriculum/projectScanner.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import {
  AI_TEACHING_TTL_SECONDS,
  LEARN_CACHE_KEYS,
} from "~/lib/server/learn/cache-keys";
import type { Route } from "./+types/learn.courses.$courseSlug.lessons.$lessonSlug";

/** 从 lesson.teachingBlocks 里取 code_walkthrough.code; 没有就返回空字符串。 */
function pickPrimaryFileCode(blocks: TeachingBlock[] | undefined): string {
  if (!blocks) return "";
  for (const b of blocks) {
    if (b.type === "code_walkthrough" && b.code?.trim()) return b.code;
  }
  return "";
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { DB: db, LEARN_CACHE: cache } = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);

  const structure = await getCourseStructure(db, params.courseSlug!, cache);
  if (!structure) {
    throw data("课程不存在", { status: 404 });
  }

  const lesson = structure.lessons.find((item) => item.slug === params.lessonSlug);
  if (!lesson || !lesson.isPublished) {
    throw data("关卡不存在", { status: 404 });
  }

  const url = new URL(request.url);
  const hasExplicitQ = url.searchParams.has("q");
  const rawIndex = Number(url.searchParams.get("q") ?? "0");

  const [questionList, progress, cachedAiTeaching, cachedAiDiagram, attemptedRows] =
    await Promise.all([
      getLessonQuestionList(db, lesson.id, cache),
      calculateLessonProgress(db, userId, lesson.id),
      // KV 预查: 命中就直接渲染, 用户不用再点 AI 生成
      cache?.get(LEARN_CACHE_KEYS.lessonAiTeaching(lesson.id)) ??
        Promise.resolve(null),
      cache?.get(LEARN_CACHE_KEYS.lessonAiDiagram(lesson.id)) ??
        Promise.resolve(null),
      // 拉这个 user 在本课所有已尝试题目的 id, 用于断点续做
      db
        .prepare(
          `SELECT DISTINCT question_id FROM answer_attempts
           WHERE user_id = ? AND lesson_id = ?`,
        )
        .bind(userId, lesson.id)
        .all<{ question_id: string }>(),
    ]);

  // 没有显式 ?q= 时, 自动跳到第一道还没答过的题。全部答过则停在最后一题供回看。
  // 显式带了 ?q= (从答题页/链接跳过来) 就完全尊重 URL, 不动。
  //
  // **关键**: 没有 ?q= 时必须 redirect 把索引钉到 URL 上。
  // 因为提交答案后 RR7 会重新跑 loader, 此时若 URL 还没有 ?q=,
  // "第一道未答的题"就会变成下一题, 当前题的反馈/AI 讲解就丢了 (bug 1);
  // 全部答完时还会 fallback 到 0 把人甩回第 1 题 (bug 2)。
  let questionIndex: number;
  if (hasExplicitQ) {
    questionIndex = resolveQuestionIndex(questionList.questions, rawIndex);
  } else {
    const attemptedIds = new Set(
      (attemptedRows.results ?? []).map((r) => r.question_id),
    );
    const firstUnanswered = questionList.questions.findIndex(
      (q) => !attemptedIds.has(q.id),
    );
    // 全部答完 → 钉到最后一题 (而不是第 0 题), 用户能看到完成状态。
    questionIndex =
      firstUnanswered >= 0
        ? firstUnanswered
        : Math.max(0, questionList.questions.length - 1);
    if (questionList.questions.length > 0) {
      const target = new URL(request.url);
      target.searchParams.set("q", String(questionIndex));
      // 保留 phase 等其它参数; 仅追加 q。同时把 cookie 一起带上, 以免首访丢 learn_uid。
      const headers = cookieHeaders
        ? mergeHeaders(null, cookieHeaders)
        : undefined;
      throw redirect(
        target.pathname + target.search,
        headers ? { headers } : undefined,
      );
    }
  }
  const summary = questionList.questions[questionIndex];
  const currentQuestion = summary ? await getQuestionById(db, summary.id) : null;

  return data(
    {
      course: structure.course,
      lesson,
      questionSummaries: questionList.questions,
      currentQuestion,
      questionIndex,
      progress,
      userId,
      aiTeachingText: cachedAiTeaching ?? null,
      aiDiagramSource: cachedAiDiagram ?? null,
    },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

async function loadQuestionContext(
  db: D1Database,
  cache: KVNamespace | undefined,
  params: { courseSlug?: string; lessonSlug?: string },
  questionId: string,
) {
  const structure = await getCourseStructure(db, params.courseSlug!, cache);
  if (!structure) throw data("课程不存在", { status: 404 });

  const lesson = structure.lessons.find((item) => item.slug === params.lessonSlug);
  if (!lesson) throw data("关卡不存在", { status: 404 });

  const question = await getQuestionById(db, questionId);
  if (!question || question.lessonId !== lesson.id) {
    throw data({ ok: false, error: "题目不存在" }, { status: 404 });
  }

  return { course: structure.course, lesson, question };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    throw data("Method not allowed", { status: 405 });
  }

  const { DB: db, LEARN_CACHE: cache } = context.cloudflare.env;
  const env = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  const responseHeadersEarly = cookieHeaders
    ? { headers: mergeHeaders(null, cookieHeaders) }
    : undefined;

  /* ---------- 课级 AI 讲解 (不需要 questionId) ---------- */
  if (intent === "ai_lesson_teaching") {
    const structure = await getCourseStructure(db, params.courseSlug!, cache);
    if (!structure) throw data("课程不存在", { status: 404 });
    const lesson = structure.lessons.find((item) => item.slug === params.lessonSlug);
    if (!lesson) throw data("关卡不存在", { status: 404 });

    const cacheKey = LEARN_CACHE_KEYS.lessonAiTeaching(lesson.id);
    const force = formData.get("force") === "1";

    if (!force && cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return data(
          { ok: true as const, feature: "lesson_teaching" as const, text: cached, fromCache: true },
          responseHeadersEarly,
        );
      }
    }

    try {
      // 收集这节课所有题目的 code 字段做上下文 (前 5 个非空, 截到 ~3KB 防过长)
      const questions = await getQuestionsByLesson(db, lesson.id);
      const samples = questions
        .map((q) => q.code?.trim())
        .filter((c): c is string => Boolean(c))
        .slice(0, 5)
        .join("\n\n--- 下一段 ---\n\n")
        .slice(0, 3000);

      const result = await generateLessonTeaching(db, env, {
        userId,
        courseTitle: structure.course.title,
        courseSlug: structure.course.slug,
        projectContext: structure.course.projectContext ?? "",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonSlug: lesson.slug,
        lessonSummary: lesson.description ?? lesson.learningGoal ?? "",
        lessonFocus: lesson.learningGoal ?? "",
        abilityTags: lesson.lessonMeta?.abilityTags ?? [],
        primaryFilePath: lesson.sourceFilePath ?? "remix/(未指定)",
        primaryFileCode: pickPrimaryFileCode(lesson.teachingBlocks),
        questionCodeSamples: samples,
      });

      // 写入 KV cache, 全局共享 7 天 (cache.put 失败不阻塞响应)
      if (cache) {
        await cache
          .put(cacheKey, result.text, { expirationTtl: AI_TEACHING_TTL_SECONDS })
          .catch((err) => console.warn("[ai_lesson_teaching] cache put failed", err));
      }
      return data(
        { ok: true as const, feature: "lesson_teaching" as const, text: result.text, fromCache: false },
        responseHeadersEarly,
      );
    } catch (error) {
      const aiError = toAiLearnError(error);
      return data(
        { ok: false as const, error: aiError.message, code: aiError.code },
        responseHeadersEarly,
      );
    }
  }

  /* ---------- 课级 AI 思维导图 (Mermaid 源码; 与 lesson_teaching 并行) ---------- */
  if (intent === "ai_lesson_diagram") {
    const structure = await getCourseStructure(db, params.courseSlug!, cache);
    if (!structure) throw data("课程不存在", { status: 404 });
    const lesson = structure.lessons.find((item) => item.slug === params.lessonSlug);
    if (!lesson) throw data("关卡不存在", { status: 404 });

    const cacheKey = LEARN_CACHE_KEYS.lessonAiDiagram(lesson.id);
    const force = formData.get("force") === "1";

    if (!force && cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return data(
          { ok: true as const, feature: "lesson_diagram" as const, text: cached, fromCache: true },
          responseHeadersEarly,
        );
      }
    }

    try {
      const questions = await getQuestionsByLesson(db, lesson.id);
      const samples = questions
        .map((q) => q.code?.trim())
        .filter((c): c is string => Boolean(c))
        .slice(0, 5)
        .join("\n\n--- 下一段 ---\n\n")
        .slice(0, 3000);

      const result = await generateLessonDiagram(db, env, {
        userId,
        courseTitle: structure.course.title,
        courseSlug: structure.course.slug,
        projectContext: structure.course.projectContext ?? "",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonSlug: lesson.slug,
        lessonSummary: lesson.description ?? lesson.learningGoal ?? "",
        lessonFocus: lesson.learningGoal ?? "",
        abilityTags: lesson.lessonMeta?.abilityTags ?? [],
        primaryFilePath: lesson.sourceFilePath ?? "remix/(未指定)",
        primaryFileCode: pickPrimaryFileCode(lesson.teachingBlocks),
        questionCodeSamples: samples,
      });

      if (cache) {
        await cache
          .put(cacheKey, result.text, { expirationTtl: AI_TEACHING_TTL_SECONDS })
          .catch((err) => console.warn("[ai_lesson_diagram] cache put failed", err));
      }
      return data(
        { ok: true as const, feature: "lesson_diagram" as const, text: result.text, fromCache: false },
        responseHeadersEarly,
      );
    } catch (error) {
      const aiError = toAiLearnError(error);
      return data(
        { ok: false as const, error: aiError.message, code: aiError.code },
        responseHeadersEarly,
      );
    }
  }

  /* ---------- 文件级「读前导读」(行锚定 JSON, 按文件路径缓存) ---------- */
  if (intent === "ai_orientation") {
    const path = String(formData.get("path") ?? "").trim();
    if (!path) {
      return data(
        { ok: false as const, error: "缺少文件路径", code: "ai_failed" as const },
        responseHeadersEarly,
      );
    }
    const structure = await getCourseStructure(db, params.courseSlug!, cache);
    if (!structure) throw data("课程不存在", { status: 404 });
    const lesson = structure.lessons.find((item) => item.slug === params.lessonSlug);
    if (!lesson) throw data("关卡不存在", { status: 404 });

    const cacheKey = LEARN_CACHE_KEYS.codeOrientation(path);
    const force = formData.get("force") === "1";
    if (!force && cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        try {
          return data(
            {
              ok: true as const,
              feature: "code_orientation" as const,
              annotated: JSON.parse(cached),
              fromCache: true,
            },
            responseHeadersEarly,
          );
        } catch {
          /* 缓存损坏 → 落到重新生成 */
        }
      }
    }

    const file = await getSourceFileContent(db, path);
    if (!file) {
      return data(
        { ok: false as const, error: "该文件未收录源码", code: "ai_failed" as const },
        responseHeadersEarly,
      );
    }

    try {
      const result = await generateCodeOrientation(db, env, {
        userId,
        filePath: file.path,
        fileCode: file.code,
        lessonTitle: lesson.title,
        lessonFocus: lesson.learningGoal ?? lesson.description ?? "",
        abilityTags: lesson.lessonMeta?.abilityTags ?? [],
      });
      if (cache && result.annotated) {
        await cache
          .put(cacheKey, JSON.stringify(result.annotated), {
            expirationTtl: AI_TEACHING_TTL_SECONDS,
          })
          .catch((err) => console.warn("[ai_orientation] cache put failed", err));
      }
      return data(
        {
          ok: true as const,
          feature: "code_orientation" as const,
          annotated: result.annotated ?? { summary: "", annotations: [] },
          fromCache: false,
        },
        responseHeadersEarly,
      );
    } catch (error) {
      const aiError = toAiLearnError(error);
      return data(
        { ok: false as const, error: aiError.message, code: aiError.code },
        responseHeadersEarly,
      );
    }
  }

  const questionId = String(formData.get("questionId") ?? "");
  if (!questionId) {
    throw data({ ok: false, error: "Missing questionId" }, { status: 400 });
  }

  const { course, lesson, question } = await loadQuestionContext(
    db,
    cache,
    params,
    questionId,
  );

  const responseHeaders = responseHeadersEarly;

  if (intent === "submit_answer") {
    const questionType = String(formData.get("questionType") ?? "") as QuestionType;
    if (!questionType) {
      throw data({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const userAnswer = parseUserAnswer(formData, questionType);
    const { result } = await submitAnswer(db, { userId, questionId, userAnswer });
    const progress = await calculateLessonProgress(db, userId, lesson.id);

    const questionList = await getLessonQuestionList(db, lesson.id, cache);
    const questionIndex = questionList.questions.findIndex((q) => q.id === questionId);

    return data(
      {
        ok: true as const,
        questionId,
        isCorrect: result.isCorrect,
        needsAiGrading: result.needsAiGrading,
        explanation: result.explanation,
        mistakeType: result.mistakeType,
        progress,
        nextQuestionIndex: questionIndex + 1,
        totalQuestions: questionList.questions.length,
      },
      responseHeaders,
    );
  }

  if (
    intent === "ai_hint" ||
    intent === "ai_explanation" ||
    intent === "ai_question_diagram"
  ) {
    const attempts = await getUserAttempts(db, userId, {
      questionId,
      limit: 1,
    });
    const latestAttempt = attempts[0];
    // ai_hint 仍要求"先答错"; ai_explanation / ai_question_diagram 放宽到"提交过即可"(对错都讲)。
    const requireWrong = intent === "ai_hint";
    if (
      !latestAttempt ||
      (requireWrong && latestAttempt.is_correct === 1)
    ) {
      return data(
        {
          ok: false as const,
          error: requireWrong
            ? "请先提交错误答案后再使用 AI。"
            : "请先提交答案后再使用 AI 讲解。",
          code: "forbidden" as const,
        },
        responseHeaders,
      );
    }

    const answerJson = formData.get("answerJson");
    const userAnswerFromAttempt = parseAttemptUserAnswer(latestAttempt);
    const userAnswerFromForm =
      typeof answerJson === "string" && answerJson
        ? parseUserAnswer(formData, question.type)
        : null;

    // 把被讲解文件的完整源码喂给 AI(优先题目来源文件, 回退到课程锚点文件)。
    const sourcePath = question.sourceFilePath ?? lesson.sourceFilePath;
    const sourceFile = sourcePath
      ? await getSourceFileContent(db, sourcePath)
      : null;

    try {
      if (intent === "ai_hint") {
        const previousHintCount = Number(formData.get("previousHintCount") ?? "0");
        const result = await generateHint(db, env, {
          userId,
          question,
          course,
          lesson,
          userAnswer:
            userAnswerFromForm ??
            (userAnswerFromAttempt as UserAnswer),
          previousHintCount: Number.isFinite(previousHintCount)
            ? previousHintCount
            : 0,
        });
        return data(
          {
            ok: true as const,
            feature: "hint" as const,
            text: result.text,
            hintLevel: result.hintLevel,
          },
          responseHeaders,
        );
      }

      // explanation 和 question_diagram 共享同一份 AiExplanationInput, 只是终端 prompt 不同。
      const explanationInput = {
        userId,
        courseTitle: course.title,
        lessonTitle: lesson.title,
        questionTitle: question.title,
        questionPrompt: question.prompt,
        code: question.code,
        questionType: question.type,
        options: question.options,
        sortItems: question.sortItems,
        blanks: question.blanks,
        branchScenario: question.branchScenario,
        userAnswer: userAnswerFromAttempt,
        correctAnswer: question.correctAnswer,
        baseExplanation: question.explanation,
        abilityTags: question.abilityTags,
        mistakeType: latestAttempt.mistake_type ?? undefined,
        projectContext: course.projectContext,
        sourceFilePath: question.sourceFilePath,
        fullFileCode: sourceFile?.code,
        fullFileLineCount: sourceFile?.lineCount ?? undefined,
      };

      if (intent === "ai_question_diagram") {
        const result = await generateQuestionDiagram(
          db,
          env,
          questionId,
          explanationInput,
        );
        return data(
          {
            ok: true as const,
            feature: "question_diagram" as const,
            text: result.text,
          },
          responseHeaders,
        );
      }

      const result = await generateExplanation(db, env, questionId, explanationInput);

      return data(
        {
          ok: true as const,
          feature: "explanation" as const,
          annotated: result.annotated ?? { summary: "", annotations: [] },
        },
        responseHeaders,
      );
    } catch (error) {
      const aiError = toAiLearnError(error);
      return data(
        { ok: false as const, error: aiError.message, code: aiError.code },
        responseHeaders,
      );
    }
  }

  throw data({ ok: false, error: "Unknown intent" }, { status: 400 });
}

export default function LessonPage({ loaderData }: Route.ComponentProps) {
  const {
    course,
    lesson,
    questionSummaries,
    currentQuestion,
    questionIndex,
    progress,
    aiTeachingText,
    aiDiagramSource,
  } = loaderData;

  return (
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {course.title} / {lesson.title}
      </p>
      <h2 className="mt-1 text-2xl font-bold">{lesson.title}</h2>

      <div className="mt-6">
        <LessonFlow
          course={course}
          lesson={lesson}
          questionSummaries={questionSummaries}
          currentQuestion={currentQuestion}
          questionIndex={questionIndex}
          initialProgress={progress}
          initialAiTeachingText={aiTeachingText}
          initialAiDiagramSource={aiDiagramSource}
        />
      </div>
    </div>
  );
}
