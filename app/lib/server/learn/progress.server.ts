import type { Course } from "~/lib/learn/types";
import type { LessonRecommendation } from "./ability.server";
import { recommendNextLessons } from "./ability.server";
import type { LessonProgressSummary } from "./attempts.server";
import {
  curriculumStatsFromPublicOverview,
  getPublicCoursesOverview,
  getPublicExamList,
  queryCurriculumCourseStats,
  type CurriculumCourseStats,
} from "./cache-public.server";
import {
  getMistakesForReview,
  countOpenMistakes,
  type MistakeReviewItem,
} from "./mistakes.server";
import {
  getAllCourseProgressForUser,
  getCourseProgressSummary,
} from "./progress-write.server";
import { countSnippetsByUser } from "./snippets.server";

export type { CurriculumCourseStats };

export type CourseProgressSummary = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  totalQuestions: number;
  attemptedQuestions: number;
  percentComplete: number;
};

export type LearningOverview = {
  courses: Array<Course & { progress: CourseProgressSummary }>;
  overall: {
    totalLessons: number;
    completedLessons: number;
    percentComplete: number;
    totalQuestionsAttempted: number;
  };
  continueLesson: LessonRecommendation | null;
  recentMistakes: MistakeReviewItem[];
};

export type LearningDashboardData = LearningOverview & {
  openMistakeCount: number;
  snippetCount: number;
  examCount: number;
};

export function aggregateCourseProgress(
  courseId: string,
  lessonProgress: LessonProgressSummary[],
): CourseProgressSummary {
  const totalLessons = lessonProgress.length;
  const completedLessons = lessonProgress.filter((p) => p.isCompleted).length;
  const totalQuestions = lessonProgress.reduce(
    (sum, p) => sum + p.totalQuestions,
    0,
  );
  const attemptedQuestions = lessonProgress.reduce(
    (sum, p) => sum + p.attemptedQuestions,
    0,
  );
  const percentComplete =
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 1000) / 10
      : 0;

  return {
    courseId,
    totalLessons,
    completedLessons,
    totalQuestions,
    attemptedQuestions,
    percentComplete,
  };
}

export function aggregateOverallProgress(
  summaries: CourseProgressSummary[],
): LearningOverview["overall"] {
  const totalLessons = summaries.reduce((sum, s) => sum + s.totalLessons, 0);
  const completedLessons = summaries.reduce(
    (sum, s) => sum + s.completedLessons,
    0,
  );
  const totalQuestionsAttempted = summaries.reduce(
    (sum, s) => sum + s.attemptedQuestions,
    0,
  );
  const percentComplete =
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 1000) / 10
      : 0;

  return {
    totalLessons,
    completedLessons,
    percentComplete,
    totalQuestionsAttempted,
  };
}

export async function getCurriculumCourseStats(
  db: D1Database,
  cache?: KVNamespace,
): Promise<CurriculumCourseStats> {
  if (cache) {
    const publicOverview = await getPublicCoursesOverview(db, cache);
    return curriculumStatsFromPublicOverview(publicOverview);
  }
  return queryCurriculumCourseStats(db);
}

async function mergeCoursesWithProgress(
  db: D1Database,
  userId: string,
  courses: Course[],
  stats: CurriculumCourseStats,
): Promise<Array<Course & { progress: CourseProgressSummary }>> {
  const progressMap = await getAllCourseProgressForUser(db, userId);

  const lessonAttempted = await db
    .prepare(
      `SELECT course_id, SUM(completed_question_count) as attempted
       FROM lesson_progress
       WHERE user_id = ?
       GROUP BY course_id`,
    )
    .bind(userId)
    .all<{ course_id: string; attempted: number }>();

  const attemptedByCourse = new Map<string, number>();
  for (const row of lessonAttempted.results ?? []) {
    attemptedByCourse.set(row.course_id, row.attempted);
  }

  return courses.map((course) => {
    const row = progressMap.get(course.id);
    const totalLessons =
      row?.total_lesson_count ?? stats.lessonCountByCourseId.get(course.id) ?? 0;
    const completedLessons = row?.completed_lesson_count ?? 0;
    const totalQuestions = stats.questionCountByCourseId.get(course.id) ?? 0;
    const attemptedQuestions = attemptedByCourse.get(course.id) ?? 0;
    const percentComplete =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 1000) / 10
        : 0;

    return {
      ...course,
      progress: {
        courseId: course.id,
        totalLessons,
        completedLessons,
        totalQuestions,
        attemptedQuestions,
        percentComplete,
      },
    };
  });
}

export async function getCoursesOverview(
  db: D1Database,
  userId: string,
  cache?: KVNamespace,
): Promise<{ courses: Array<Course & { progress: CourseProgressSummary }> }> {
  const publicOverview = await getPublicCoursesOverview(db, cache);
  const stats = curriculumStatsFromPublicOverview(publicOverview);

  const coursesWithProgress = await mergeCoursesWithProgress(
    db,
    userId,
    publicOverview.courses,
    stats,
  );

  return { courses: coursesWithProgress };
}

/** @deprecated Use getCoursesOverview or getLearningDashboardOverview */
export async function getLearningOverview(
  db: D1Database,
  userId: string,
): Promise<LearningOverview> {
  const dashboard = await getLearningDashboardOverview(db, userId);
  return {
    courses: dashboard.courses,
    overall: dashboard.overall,
    continueLesson: dashboard.continueLesson,
    recentMistakes: dashboard.recentMistakes,
  };
}

export async function getLearningDashboardOverview(
  db: D1Database,
  userId: string,
  cache?: KVNamespace,
): Promise<LearningDashboardData> {
  const [coursesResult, recommendations, recentMistakes, openMistakeCount, snippetCount, examList] =
    await Promise.all([
      getCoursesOverview(db, userId, cache),
      recommendNextLessons(db, userId, { limit: 1 }),
      getMistakesForReview(db, userId, { resolved: false, limit: 3 }),
      countOpenMistakes(db, userId),
      countSnippetsByUser(db, userId),
      getPublicExamList(db, cache),
    ]);

  const overall = aggregateOverallProgress(
    coursesResult.courses.map((c) => c.progress),
  );

  return {
    courses: coursesResult.courses,
    overall,
    continueLesson: recommendations[0] ?? null,
    recentMistakes,
    openMistakeCount,
    snippetCount,
    examCount: examList.exams.length,
  };
}

export async function getCourseProgress(
  db: D1Database,
  userId: string,
  courseId: string,
  cache?: KVNamespace,
): Promise<CourseProgressSummary> {
  const stats = await getCurriculumCourseStats(db, cache);
  return getCourseProgressSummary(db, userId, courseId, {
    totalLessons: stats.lessonCountByCourseId.get(courseId) ?? 0,
    totalQuestions: stats.questionCountByCourseId.get(courseId) ?? 0,
  });
}
