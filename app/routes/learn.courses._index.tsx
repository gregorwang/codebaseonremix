import { data } from "react-router";
import { CourseCard } from "~/components/learn/course/CourseCard";
import { PageHeader } from "~/components/learn/ui/PageHeader";
import { UNIT_LABELS } from "~/lib/learn/remixModules";
import { getCoursesOverview } from "~/lib/server/learn/progress.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.courses._index";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { DB: db, LEARN_CACHE: cache } = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const overview = await getCoursesOverview(db, userId, cache);

  return data(
    { courses: overview.courses },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

function groupProjectCoursesByUnit(
  courses: Route.ComponentProps["loaderData"]["courses"],
) {
  const project = courses.filter((c) => c.origin === "project");
  const bySubtitle = new Map<string, typeof project>();

  for (const course of project) {
    const unit = course.subtitle ?? "未分组";
    const list = bySubtitle.get(unit) ?? [];
    list.push(course);
    bySubtitle.set(unit, list);
  }

  const unitLabelSet = new Set<string>(UNIT_LABELS);
  const orderedUnits: string[] = UNIT_LABELS.filter((label) => bySubtitle.has(label));
  for (const label of bySubtitle.keys()) {
    if (!unitLabelSet.has(label)) {
      orderedUnits.push(label);
    }
  }

  return orderedUnits.map((label) => {
    const unitCourses = (bySubtitle.get(label) ?? []).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    const completed = unitCourses.filter(
      (c) =>
        c.progress.completedLessons === c.progress.totalLessons &&
        c.progress.totalLessons > 0,
    ).length;
    return { label, courses: unitCourses, completed, total: unitCourses.length };
  });
}

export default function CoursesIndex({ loaderData }: Route.ComponentProps) {
  const { courses } = loaderData;
  const projectUnits = groupProjectCoursesByUnit(courses);
  const sampleCourses = courses.filter((c) => c.origin !== "project");
  const projectCount = projectUnits.reduce((n, u) => n + u.total, 0);

  return (
    <div>
      <PageHeader
        title="全部课程"
        description={`${projectCount} 门项目课按 ${projectUnits.length} 个单元循序渐进；另有 ${sampleCourses.length} 门示例课。`}
      />

      {projectUnits.length > 0 && (
        <div className="mt-6 space-y-10">
          {projectUnits.map((unit) => (
            <section key={unit.label}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold">{unit.label}</h3>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  已完成 {unit.completed}/{unit.total} 门
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {unit.courses.map((course) => (
                  <CourseCard key={course.id} course={course} progress={course.progress} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {sampleCourses.length > 0 && (
        <section className={projectUnits.length > 0 ? "mt-10" : "mt-6"}>
          <h3 className="mb-4 text-lg font-semibold text-slate-600 dark:text-slate-400">
            示例课程
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {sampleCourses.map((course) => (
              <CourseCard key={course.id} course={course} progress={course.progress} />
            ))}
          </div>
        </section>
      )}

      {courses.length === 0 && (
        <p className="mt-6 text-slate-600 dark:text-slate-400">
          暂无已发布课程。运行 npm run db:seed:remote -- --force 导入项目课。
        </p>
      )}
    </div>
  );
}
