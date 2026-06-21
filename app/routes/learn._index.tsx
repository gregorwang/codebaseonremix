import { Link } from "react-router";
import { data } from "react-router";
import { LearningOverview } from "~/components/learn/dashboard/LearningOverview";
import { CourseCard } from "~/components/learn/course/CourseCard";
import { PageHeader } from "~/components/learn/ui/PageHeader";
import { StatCard } from "~/components/learn/ui/StatCard";
import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import { getWeakAbilities } from "~/lib/server/learn/ability.server";
import { getLearningDashboardOverview } from "~/lib/server/learn/progress.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn._index";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { DB: db, LEARN_CACHE: cache } = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);

  const [dashboard, weakAbilities] = await Promise.all([
    getLearningDashboardOverview(db, userId, cache),
    getWeakAbilities(db, userId, { limit: 3 }),
  ]);

  return data(
    {
      overview: dashboard,
      openMistakeCount: dashboard.openMistakeCount,
      weakAbilities,
      snippetCount: dashboard.snippetCount,
      examCount: dashboard.examCount,
    },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

export default function LearnIndex({ loaderData }: Route.ComponentProps) {
  const { overview, openMistakeCount, weakAbilities, snippetCount, examCount } =
    loaderData;

  return (
    <div>
      <PageHeader
        eyebrow="Code Coach · Dashboard"
        title="学习中心"
        description="围绕真实项目代码因果链训练：前端状态、后端守门、前后端连接。"
      />

      <LearningOverview overview={overview} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          to="/learn/review"
          label="错题本"
          value={openMistakeCount}
          hint="最近待复习"
          accent="rose"
        />
        <StatCard
          to="/learn/ability-map"
          label="能力树"
          value={
            weakAbilities.length > 0
              ? weakAbilities.map((w) => ABILITY_TAG_LABELS[w.abilityTag]).join("、")
              : "良好"
          }
          hint={weakAbilities.length > 0 ? "薄弱能力" : "暂无薄弱项"}
          accent="amber"
        />
        <StatCard
          to="/learn/snippets"
          label="项目代码资产"
          value={snippetCount}
          hint="我的片段数"
          accent="indigo"
        />
        <StatCard
          to="/learn/exams"
          label="阶段考试"
          value={examCount}
          hint="可参加场次"
          accent="emerald"
        />
      </div>

      {overview.continueLesson && (
        <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--border-soft-brand)] bg-[var(--brand-soft)] p-4">
          <h3 className="inline-flex items-center gap-2 font-semibold tracking-tight text-[var(--brand-fg-strong)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" />
            推荐练习
          </h3>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            <Link
              to={`/learn/courses/${overview.continueLesson.courseSlug}/lessons/${overview.continueLesson.lessonSlug}`}
              className="font-medium text-[var(--brand-fg)] hover:underline"
            >
              {overview.continueLesson.lessonTitle}
            </Link>
            {" — "}
            {overview.continueLesson.reason}
          </p>
        </section>
      )}

      <div className="mt-6">
        <Link
          to="/learn/courses"
          className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
        >
          浏览全部课程 →
        </Link>
      </div>

      <section className="mt-10">
        <h3 className="mb-4 inline-flex items-center gap-2 pl-3 relative text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
          <span
            aria-hidden
            className="absolute left-0 top-1.5 h-5 w-1 rounded-full bg-gradient-to-b from-[var(--color-brand-400)] to-[var(--color-accent-500)]"
          />
          推荐课程
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {overview.courses.map((course) => (
            <CourseCard key={course.id} course={course} progress={course.progress} />
          ))}
        </div>
      </section>
    </div>
  );
}
