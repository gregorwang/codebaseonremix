import type { AbilityTag } from "~/lib/learn/abilityTags";
import { ABILITY_TAG_LABELS, isAbilityTag } from "~/lib/learn/abilityTags";
import { getGroupForTag } from "~/lib/learn/abilityTree";
import type { Course, Exam, Lesson } from "~/lib/learn/types";
import { isRemixModuleId, type RemixModuleId } from "~/lib/learn/remixModules";
import { parseJsonField } from "./db-json.server";
import { getCourses, getCourseBySlug } from "./courses.server";
import { getExams } from "./exams.server";
import { getLessonsByCourse } from "./lessons.server";
import { LEARN_CACHE_KEYS } from "./cache-keys";
import { deleteCacheKey, getCachedJson, setCachedJson } from "./cache.server";
import { buildLessonQuestionList } from "./cache-lesson.server";

export type CurriculumCourseStats = {
  lessonCountByCourseId: Map<string, number>;
  questionCountByCourseId: Map<string, number>;
};

export type CachedPublicCoursesOverview = {
  courses: Course[];
  lessonCountByCourseId: Record<string, number>;
  questionCountByCourseId: Record<string, number>;
  generatedAt: string;
};

export type CachedCourseStructure = {
  course: Course;
  lessons: Lesson[];
  questionCountByLessonId: Record<string, number>;
  generatedAt: string;
};

export type CachedAbilityTagEntry = {
  tag: AbilityTag;
  label: string;
  group: string;
  source: "course" | "question" | "exam" | "system";
};

export type CachedAbilityTags = {
  tags: CachedAbilityTagEntry[];
  tagSet: AbilityTag[];
  generatedAt: string;
};

export type CachedRemixModuleMap = {
  lessons: Array<{
    lessonId: string;
    remixModules: RemixModuleId[];
  }>;
  generatedAt: string;
};

export type CachedExamList = {
  exams: Exam[];
  generatedAt: string;
};

function mapsFromStats(stats: CurriculumCourseStats): {
  lessonCountByCourseId: Record<string, number>;
  questionCountByCourseId: Record<string, number>;
} {
  return {
    lessonCountByCourseId: Object.fromEntries(stats.lessonCountByCourseId),
    questionCountByCourseId: Object.fromEntries(stats.questionCountByCourseId),
  };
}

function statsFromCached(payload: CachedPublicCoursesOverview): CurriculumCourseStats {
  return {
    lessonCountByCourseId: new Map(Object.entries(payload.lessonCountByCourseId)),
    questionCountByCourseId: new Map(Object.entries(payload.questionCountByCourseId)),
  };
}

export async function queryCurriculumCourseStats(
  db: D1Database,
): Promise<CurriculumCourseStats> {
  const [lessonRows, questionRows] = await Promise.all([
    db
      .prepare(
        `SELECT course_id, COUNT(*) as count
         FROM lessons
         WHERE is_published = 1
         GROUP BY course_id`,
      )
      .all<{ course_id: string; count: number }>(),
    db
      .prepare(
        `SELECT l.course_id, COUNT(q.id) as count
         FROM questions q
         INNER JOIN lessons l ON l.id = q.lesson_id
         WHERE q.is_published = 1 AND l.is_published = 1
         GROUP BY l.course_id`,
      )
      .all<{ course_id: string; count: number }>(),
  ]);

  const lessonCountByCourseId = new Map<string, number>();
  for (const row of lessonRows.results ?? []) {
    lessonCountByCourseId.set(row.course_id, row.count);
  }

  const questionCountByCourseId = new Map<string, number>();
  for (const row of questionRows.results ?? []) {
    questionCountByCourseId.set(row.course_id, row.count);
  }

  return { lessonCountByCourseId, questionCountByCourseId };
}

export async function buildPublicCoursesOverview(
  db: D1Database,
): Promise<CachedPublicCoursesOverview> {
  const [courses, stats] = await Promise.all([
    getCourses(db, { publishedOnly: true, preferProjectFirst: true }),
    queryCurriculumCourseStats(db),
  ]);
  const counts = mapsFromStats(stats);
  return {
    courses,
    ...counts,
    generatedAt: new Date().toISOString(),
  };
}

export async function getPublicCoursesOverview(
  db: D1Database,
  cache?: KVNamespace,
): Promise<CachedPublicCoursesOverview> {
  const key = LEARN_CACHE_KEYS.publicCoursesOverview();
  const cached = await getCachedJson<CachedPublicCoursesOverview>(cache, key);
  if (cached) return cached;

  const built = await buildPublicCoursesOverview(db);
  await setCachedJson(cache, key, built);
  return built;
}

export function curriculumStatsFromPublicOverview(
  payload: CachedPublicCoursesOverview,
): CurriculumCourseStats {
  return statsFromCached(payload);
}

export async function buildCourseStructure(
  db: D1Database,
  courseSlug: string,
): Promise<CachedCourseStructure | null> {
  const course = await getCourseBySlug(db, courseSlug);
  if (!course || !course.isPublished) return null;

  const lessons = await getLessonsByCourse(db, course.id, { publishedOnly: true });

  const placeholders = lessons.map(() => "?").join(", ");
  const questionCountByLessonId: Record<string, number> = {};

  if (lessons.length > 0) {
    const counts = await db
      .prepare(
        `SELECT lesson_id, COUNT(*) as count
         FROM questions
         WHERE lesson_id IN (${placeholders}) AND is_published = 1
         GROUP BY lesson_id`,
      )
      .bind(...lessons.map((l) => l.id))
      .all<{ lesson_id: string; count: number }>();

    for (const row of counts.results ?? []) {
      questionCountByLessonId[row.lesson_id] = row.count;
    }
  }

  return {
    course,
    lessons,
    questionCountByLessonId,
    generatedAt: new Date().toISOString(),
  };
}

export async function getCourseStructure(
  db: D1Database,
  courseSlug: string,
  cache?: KVNamespace,
): Promise<CachedCourseStructure | null> {
  const key = LEARN_CACHE_KEYS.courseStructure(courseSlug);
  const cached = await getCachedJson<CachedCourseStructure>(cache, key);
  if (cached) return cached;

  const built = await buildCourseStructure(db, courseSlug);
  if (built) {
    await setCachedJson(cache, key, built);
  }
  return built;
}

export async function buildPublicExamList(db: D1Database): Promise<CachedExamList> {
  const exams = await getExams(db, { publishedOnly: true, preferProjectFirst: true });
  return { exams, generatedAt: new Date().toISOString() };
}

export async function getPublicExamList(
  db: D1Database,
  cache?: KVNamespace,
): Promise<CachedExamList> {
  const key = LEARN_CACHE_KEYS.publicExams();
  const cached = await getCachedJson<CachedExamList>(cache, key);
  if (cached) return cached;

  const built = await buildPublicExamList(db);
  await setCachedJson(cache, key, built);
  return built;
}

function groupForTag(tag: AbilityTag): string {
  return getGroupForTag(tag).label;
}

export async function buildPublicAbilityTags(
  db: D1Database,
): Promise<CachedAbilityTags> {
  const tagSources = new Map<AbilityTag, Set<CachedAbilityTagEntry["source"]>>();

  function addTag(tag: AbilityTag, source: CachedAbilityTagEntry["source"]) {
    const sources = tagSources.get(tag) ?? new Set();
    sources.add(source);
    tagSources.set(tag, sources);
  }

  const courses = await getCourses(db, { publishedOnly: true });
  for (const course of courses) {
    for (const tag of course.abilityTags) {
      addTag(tag, "course");
    }
  }

  const questionRows = await db
    .prepare(
      `SELECT q.ability_tags_json AS tags_json
       FROM questions q
       INNER JOIN lessons l ON l.id = q.lesson_id
       INNER JOIN courses c ON c.id = l.course_id
       WHERE q.is_published = 1 AND l.is_published = 1 AND c.is_published = 1`,
    )
    .all<{ tags_json: string }>();

  for (const row of questionRows.results ?? []) {
    const parsed = parseJsonField<string[]>(row.tags_json, []);
    for (const tag of parsed) {
      if (isAbilityTag(tag)) addTag(tag, "question");
    }
  }

  const exams = await getExams(db, { publishedOnly: true });
  for (const exam of exams) {
    for (const tag of exam.abilityTags) {
      addTag(tag, "exam");
    }
  }

  const tags: CachedAbilityTagEntry[] = [...tagSources.entries()].map(
    ([tag, sources]) => ({
      tag,
      label: ABILITY_TAG_LABELS[tag],
      group: groupForTag(tag),
      source: sources.has("course")
        ? "course"
        : sources.has("question")
          ? "question"
          : sources.has("exam")
            ? "exam"
            : "system",
    }),
  );

  tags.sort((a, b) => a.tag.localeCompare(b.tag));

  return {
    tags,
    tagSet: tags.map((t) => t.tag),
    generatedAt: new Date().toISOString(),
  };
}

export async function getPublicAbilityTags(
  db: D1Database,
  cache?: KVNamespace,
): Promise<CachedAbilityTags> {
  const key = LEARN_CACHE_KEYS.publicAbilityTags();
  const cached = await getCachedJson<CachedAbilityTags>(cache, key);
  if (cached) return cached;

  const built = await buildPublicAbilityTags(db);
  await setCachedJson(cache, key, built);
  return built;
}

export async function buildRemixModuleMapSkeleton(
  db: D1Database,
): Promise<CachedRemixModuleMap> {
  const rows = await db
    .prepare(
      `SELECT l.id AS lesson_id, l.remix_modules_json
       FROM lessons l
       INNER JOIN courses c ON c.id = l.course_id
       WHERE c.is_published = 1
         AND c.origin = 'project'
         AND l.is_published = 1
         AND l.remix_modules_json IS NOT NULL`,
    )
    .all<{ lesson_id: string; remix_modules_json: string }>();

  const lessons: CachedRemixModuleMap["lessons"] = [];

  for (const row of rows.results ?? []) {
    const moduleIds = parseJsonField<string[]>(row.remix_modules_json, [])
      .filter(isRemixModuleId);
    if (moduleIds.length === 0) continue;
    lessons.push({ lessonId: row.lesson_id, remixModules: moduleIds });
  }

  return {
    lessons,
    generatedAt: new Date().toISOString(),
  };
}

export async function getRemixModuleMapSkeleton(
  db: D1Database,
  cache?: KVNamespace,
): Promise<CachedRemixModuleMap> {
  const key = LEARN_CACHE_KEYS.publicRemixModuleMap();
  const cached = await getCachedJson<CachedRemixModuleMap>(cache, key);
  if (cached) return cached;

  const built = await buildRemixModuleMapSkeleton(db);
  await setCachedJson(cache, key, built);
  return built;
}

export async function warmLearnPublicCache(
  db: D1Database,
  cache?: KVNamespace,
): Promise<void> {
  if (!cache) return;

  const courses = await buildPublicCoursesOverview(db);
  await setCachedJson(cache, LEARN_CACHE_KEYS.publicCoursesOverview(), courses);

  const [exams, abilityTags, remixMap] = await Promise.all([
    buildPublicExamList(db),
    buildPublicAbilityTags(db),
    buildRemixModuleMapSkeleton(db),
  ]);

  await Promise.all([
    setCachedJson(cache, LEARN_CACHE_KEYS.publicExams(), exams),
    setCachedJson(cache, LEARN_CACHE_KEYS.publicAbilityTags(), abilityTags),
    setCachedJson(cache, LEARN_CACHE_KEYS.publicRemixModuleMap(), remixMap),
  ]);

  for (const course of courses.courses) {
    const structure = await buildCourseStructure(db, course.slug);
    if (structure) {
      await setCachedJson(
        cache,
        LEARN_CACHE_KEYS.courseStructure(course.slug),
        structure,
      );
      await Promise.all(
        structure.lessons.map(async (lesson) => {
          const questionList = await buildLessonQuestionList(db, lesson.id);
          await setCachedJson(
            cache,
            LEARN_CACHE_KEYS.lessonQuestionList(lesson.id),
            questionList,
          );
        }),
      );
    }
  }
}

export async function invalidateCourseStructureCache(
  cache: KVNamespace | undefined,
  courseSlug: string,
): Promise<void> {
  await deleteCacheKey(cache, LEARN_CACHE_KEYS.courseStructure(courseSlug));
}

export async function refreshLearnPublicCache(
  db: D1Database,
  cache?: KVNamespace,
): Promise<void> {
  await warmLearnPublicCache(db, cache);
}
