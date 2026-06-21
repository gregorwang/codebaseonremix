import { data } from "react-router";
import { DraftReviewCard } from "~/components/learn/admin/DraftReviewCard";
import type { AiDraftStatus } from "~/lib/learn/types";
import {
  approveAiDraft,
  listDraftsForAdmin,
  publishAiDraftAsQuestions,
  rejectAiDraft,
} from "~/lib/server/learn/aiDrafts.server";
import { getCourses } from "~/lib/server/learn/courses.server";
import { getLessonsByCourse } from "~/lib/server/learn/lessons.server";
import { mergeHeaders } from "~/lib/server/learn/user.server";
import { requireAdmin } from "~/lib/server/learn/requireAdmin.server";
import type { Route } from "./+types/learn.admin.drafts";

const DRAFT_STATUSES: AiDraftStatus[] = [
  "draft",
  "needs_fix",
  "approved",
  "rejected",
  "published",
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { headers } = requireAdmin(request, env);
  const db = env.DB;
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && (DRAFT_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as AiDraftStatus)
      : undefined;
  const highlight = url.searchParams.get("highlight");

  const [drafts, courses] = await Promise.all([
    listDraftsForAdmin(db, { status }),
    getCourses(db),
  ]);

  const coursesWithLessons = await Promise.all(
    courses.map(async (course) => ({
      ...course,
      lessons: await getLessonsByCourse(db, course.id),
    })),
  );

  return data(
    { drafts, courses: coursesWithLessons, status, highlight },
    headers ? { headers: mergeHeaders(null, headers) } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const db = env.DB;
  const { userId, headers } = requireAdmin(request, env);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const draftId = String(formData.get("draftId") ?? "");

  const responseHeaders = headers
    ? { headers: mergeHeaders(null, headers) }
    : undefined;

  if (!draftId) {
    throw data({ ok: false, error: "Missing draftId" }, { status: 400 });
  }

  if (intent === "approve") {
    await approveAiDraft(db, draftId, userId);
    return data({ ok: true }, responseHeaders);
  }

  if (intent === "reject") {
    const reviewNote = String(formData.get("reviewNote") ?? "").trim() || undefined;
    await rejectAiDraft(db, draftId, userId, reviewNote);
    return data({ ok: true }, responseHeaders);
  }

  if (intent === "publish") {
    const lessonId = String(formData.get("lessonId") ?? "");
    if (!lessonId) {
      throw data({ ok: false, error: "请选择关卡" }, { status: 400 });
    }
    await publishAiDraftAsQuestions(db, draftId, lessonId);
    return data({ ok: true, published: true }, responseHeaders);
  }

  throw data({ ok: false, error: "Unknown intent" }, { status: 400 });
}

export default function AdminDraftsPage({ loaderData }: Route.ComponentProps) {
  const { drafts, courses, status, highlight } = loaderData;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <a
          href="/learn/admin/drafts"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !status
              ? "border-[var(--accent-fg)]/30 bg-[var(--accent-soft)] text-[var(--accent-fg)]"
              : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)] hover:border-[var(--accent-fg)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-fg)]"
          }`}
        >
          全部
        </a>
        {DRAFT_STATUSES.map((s) => (
          <a
            key={s}
            href={`/learn/admin/drafts?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              status === s
                ? "border-[var(--accent-fg)]/30 bg-[var(--accent-soft)] text-[var(--accent-fg)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)] hover:border-[var(--accent-fg)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-fg)]"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {drafts.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-6 text-center text-sm text-[var(--fg-soft)]">
          没有匹配的草稿
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className={
                highlight === draft.id
                  ? "rounded-[var(--radius-card)] ring-2 ring-[var(--color-accent-500)]/60 ring-offset-2 ring-offset-[var(--surface-base)]"
                  : undefined
              }
            >
              <DraftReviewCard draft={draft} courses={courses} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
