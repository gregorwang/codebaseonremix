import { data } from "react-router";
import { LessonList } from "~/components/learn/course/LessonList";
import { PageHeader } from "~/components/learn/ui/PageHeader";
import { ProgressBar } from "~/components/learn/ui/ProgressBar";
import { LearnCard } from "~/components/learn/ui/LearnCard";
import type { LessonProgressSummary } from "~/lib/server/learn/attempts.server";
import { getCourseStructure } from "~/lib/server/learn/cache-public.server";
import {
  getCourseProgress,
} from "~/lib/server/learn/progress.server";
import {
  getLessonProgressByCourse,
} from "~/lib/server/learn/progress-write.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.courses.$courseSlug";

async function buildProgressByLessonId(
  db: D1Database,
  userId: string,
  courseId: string,
  lessonIds: string[],
  questionCountByLessonId: Record<string, number>,
): Promise<Record<string, LessonProgressSummary>> {
  const stored = await getLessonProgressByCourse(db, userId, courseId);
  const progressByLessonId: Record<string, LessonProgressSummary> = { ...stored };

  for (const lessonId of lessonIds) {
    if (progressByLessonId[lessonId]) continue;
    progressByLessonId[lessonId] = {
      lessonId,
      totalQuestions: questionCountByLessonId[lessonId] ?? 0,
      attemptedQuestions: 0,
      correctCount: 0,
      wrongCount: 0,
      isCompleted: false,
    };
  }

  return progressByLessonId;
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { DB: db, LEARN_CACHE: cache } = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const structure = await getCourseStructure(db, params.courseSlug!, cache);
  if (!structure) {
    throw data("课程不存在", { status: 404 });
  }

  const { course, lessons, questionCountByLessonId } = structure;
  const [progressByLessonId, courseProgress] = await Promise.all([
    buildProgressByLessonId(
      db,
      userId,
      course.id,
      lessons.map((l) => l.id),
      questionCountByLessonId,
    ),
    getCourseProgress(db, userId, course.id, cache),
  ]);

  return data(
    { course, lessons, progressByLessonId, courseProgress },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

export default function CourseDetail({ loaderData }: Route.ComponentProps) {
  const { course, lessons, progressByLessonId, courseProgress } = loaderData;

  return (
    <div>
      <PageHeader title={course.title} description={course.subtitle ?? undefined} />
      <p className="mt-3 text-slate-600 dark:text-slate-400">{course.description}</p>

      {courseProgress.totalLessons > 0 && (
        <div className="mt-4">
          <ProgressBar
            value={courseProgress.completedLessons}
            max={courseProgress.totalLessons}
            label={`课程进度 ${courseProgress.completedLessons}/${courseProgress.totalLessons} 关`}
            tone={courseProgress.percentComplete >= 100 ? "emerald" : "indigo"}
            showPercent
          />
        </div>
      )}

      {course.projectContext && (
        <LearnCard className="mt-4 text-sm">
          <p className="font-medium">项目背景</p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{course.projectContext}</p>
        </LearnCard>
      )}

      <section className="mt-8">
        <h3 className="mb-4 text-lg font-semibold">关卡列表</h3>
        <LessonList
          courseSlug={course.slug}
          lessons={lessons}
          progressByLessonId={progressByLessonId}
        />
      </section>
    </div>
  );
}
