import { useState } from "react";
import { Link, data } from "react-router";
import {
  ExamAiReviewPanel,
  ExamPractice,
} from "~/components/learn/exam/ExamPractice";
import { ExamBriefingPanel } from "~/components/learn/exam/ExamBriefing";
import { ExamResultPanel } from "~/components/learn/exam/ExamResultPanel";
import type { ExamResult, UserAnswer } from "~/lib/learn/types";
import {
  generateExamReview,
  toAiLearnError,
} from "~/lib/server/ai/aiLearn.server";
import {
  getExamBySlug,
  getLatestExamResult,
  getUserExamResults,
  resolveExamQuestions,
  submitExam,
} from "~/lib/server/learn/exams.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.exams.$examSlug";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const exam = await getExamBySlug(db, params.examSlug!);

  if (!exam || !exam.isPublished) {
    throw data("考试不存在", { status: 404 });
  }

  const questions = await resolveExamQuestions(db, exam);
  const url = new URL(request.url);
  const showResult = url.searchParams.get("result") === "1";
  const latestResult = showResult
    ? await getLatestExamResult(db, userId, exam.id)
    : null;

  return data(
    {
      exam,
      questions,
      latestResult,
    },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

export async function action({ request, context, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    throw data("Method not allowed", { status: 405 });
  }

  const db = context.cloudflare.env.DB;
  const env = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const exam = await getExamBySlug(db, params.examSlug!);

  if (!exam || !exam.isPublished) {
    throw data({ ok: false, error: "考试不存在" }, { status: 404 });
  }

  const questions = await resolveExamQuestions(db, exam);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const responseHeaders = cookieHeaders
    ? { headers: mergeHeaders(null, cookieHeaders) }
    : undefined;

  if (intent === "submit_exam") {
    const raw = String(formData.get("answersJson") ?? "{}");
    let answers: Record<string, UserAnswer> = {};
    try {
      answers = JSON.parse(raw) as Record<string, UserAnswer>;
    } catch {
      return data({ ok: false as const, error: "答案格式无效" }, responseHeaders);
    }

    const result = await submitExam(db, {
      userId,
      exam,
      questions,
      answers,
    });

    return data({ ok: true as const, result }, responseHeaders);
  }

  if (intent === "ai_exam_review") {
    const resultId = String(formData.get("resultId") ?? "");
    const results = await getUserExamResults(db, userId, exam.id);
    const result = results.find((r) => r.id === resultId);
    if (!result) {
      return data({ ok: false as const, error: "找不到考试结果" }, { status: 404 });
    }

    try {
      const ai = await generateExamReview(db, env, {
        userId,
        exam,
        result,
        questions,
      });
      return data({ ok: true as const, text: ai.text }, responseHeaders);
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

export default function ExamDetailPage({ loaderData }: Route.ComponentProps) {
  const { exam, questions, latestResult } = loaderData;
  const [submittedResult, setSubmittedResult] = useState<ExamResult | null>(null);
  const [started, setStarted] = useState(false);
  const result = submittedResult ?? latestResult;

  return (
    <div>
      <Link
        to="/learn/exams"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-fg)] hover:underline"
      >
        ← 返回考试列表
      </Link>

      {result ? (
        <>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--fg-primary)] sm:text-3xl">
            {exam.title}
          </h2>
          <div className="mt-6">
            <ExamResultPanel exam={exam} result={result} />
          </div>
          {exam.briefing?.recapPrompt && (
            <p className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4 text-sm leading-relaxed text-[var(--fg-muted)]">
              <span className="font-semibold text-[var(--fg-primary)]">
                考后复盘：
              </span>
              {exam.briefing.recapPrompt}
            </p>
          )}
          <ExamAiReviewPanel result={result} />
          <div className="mt-6">
            <Link
              to={`/learn/exams/${exam.slug}`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-soft)]"
              onClick={() => {
                setSubmittedResult(null);
                setStarted(false);
              }}
            >
              ↻ 重新考试
            </Link>
          </div>
        </>
      ) : !started ? (
        <div className="mt-4">
          <ExamBriefingPanel exam={exam} onStart={() => setStarted(true)} />
        </div>
      ) : (
        <>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--fg-primary)] sm:text-3xl">
            {exam.title}
          </h2>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--fg-soft)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-brand-500)]" />
            项目改造大关 · 进行中
          </p>
          <ExamPractice
            exam={exam}
            tasks={exam.tasks}
            questions={questions}
            onSubmitted={setSubmittedResult}
          />
        </>
      )}
    </div>
  );
}
