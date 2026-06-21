import { data } from "react-router";
import { MistakeList } from "~/components/learn/review/MistakeList";
import { ReviewFilters } from "~/components/learn/review/ReviewFilters";
import { PageHeader } from "~/components/learn/ui/PageHeader";
import { isAbilityTag } from "~/lib/learn/abilityTags";
import {
  generateMistakeSummary,
  toAiLearnError,
} from "~/lib/server/ai/aiLearn.server";
import {
  getMistakesForReview,
  resolveMistake,
  updateMistakeAiSummary,
} from "~/lib/server/learn/mistakes.server";
import { getCourseById } from "~/lib/server/learn/courses.server";
import { getLessonById } from "~/lib/server/learn/lessons.server";
import { getQuestionById } from "~/lib/server/learn/questions.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.review";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const url = new URL(request.url);
  const tagParam = url.searchParams.get("tag");
  const abilityTag = tagParam && isAbilityTag(tagParam) ? tagParam : null;
  const showResolved = url.searchParams.get("resolved") === "1";

  const mistakes = await getMistakesForReview(db, userId, {
    resolved: showResolved ? undefined : false,
    abilityTag: abilityTag ?? undefined,
    limit: 50,
  });

  return data(
    {
      mistakes,
      filters: { abilityTag, showResolved },
    },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    throw data("Method not allowed", { status: 405 });
  }

  const db = context.cloudflare.env.DB;
  const env = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const responseHeaders = cookieHeaders
    ? { headers: mergeHeaders(null, cookieHeaders) }
    : undefined;

  if (intent === "resolve_mistake") {
    const mistakeId = String(formData.get("mistakeId") ?? "");
    if (!mistakeId) {
      throw data({ ok: false, error: "Missing mistakeId" }, { status: 400 });
    }

    await resolveMistake(db, userId, mistakeId);

    return data({ ok: true as const, mistakeId }, responseHeaders);
  }

  if (intent === "ai_mistake_summary") {
    const mistakeId = String(formData.get("mistakeId") ?? "");
    if (!mistakeId) {
      throw data({ ok: false, error: "Missing mistakeId" }, { status: 400 });
    }

    const mistakes = await getMistakesForReview(db, userId);
    const mistakeItem = mistakes.find((m) => m.id === mistakeId);
    if (!mistakeItem) {
      throw data({ ok: false, error: "错题不存在" }, { status: 404 });
    }

    const [question, lesson, course] = await Promise.all([
      getQuestionById(db, mistakeItem.questionId),
      getLessonById(db, mistakeItem.lessonId),
      getCourseById(db, mistakeItem.courseId),
    ]);

    if (!question || !lesson || !course) {
      throw data({ ok: false, error: "错题上下文不完整" }, { status: 404 });
    }

    try {
      const result = await generateMistakeSummary(db, env, {
        userId,
        mistake: mistakeItem,
        question,
        course,
        lesson,
      });

      await updateMistakeAiSummary(db, userId, mistakeId, result.text);

      return data(
        {
          ok: true as const,
          mistakeId,
          aiSummary: result.text,
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

export default function ReviewPage({ loaderData }: Route.ComponentProps) {
  const { mistakes, filters } = loaderData;

  return (
    <div>
      <PageHeader
        title="错题本"
        description="按能力标签复盘错题，重新练习薄弱点。"
      />

      <div className="mt-6">
        <ReviewFilters
          abilityTag={filters.abilityTag}
          showResolved={filters.showResolved}
        />
      </div>

      <div className="mt-6">
        <MistakeList mistakes={mistakes} />
      </div>
    </div>
  );
}
