import type { AbilityTag } from "~/lib/learn/abilityTags";
import { ABILITY_TAG_LABELS, ABILITY_TAGS, isAbilityTag } from "~/lib/learn/abilityTags";
import { getSiblingTags } from "~/lib/learn/abilityTree";
import {
  calculateAbilityScore,
  updateAbilityFromAttempt,
} from "~/lib/learn/abilityScore";
import { parseJsonField } from "./db-json.server";
import {
  getPublicAbilityTags,
  getRemixModuleMapSkeleton,
} from "./cache-public.server";
import { mapAbilityScoreRow } from "./mappers.server";
import { getAllLessonProgressForUser } from "./progress-write.server";
import type { AbilityScore, AbilityScoreRow } from "~/lib/learn/types";

export { calculateAbilityScore, updateAbilityFromAttempt };

export type LessonRecommendation = {
  courseSlug: string;
  courseTitle: string;
  lessonSlug: string;
  lessonTitle: string;
  matchedTags: AbilityTag[];
  reason: string;
};

export async function updateAbilityScore(
  db: D1Database,
  userId: string,
  abilityTag: AbilityTag,
  isCorrect: boolean,
): Promise<AbilityScore> {
  await updateAbilityFromAttempt(db, userId, [abilityTag], isCorrect);
  const row = await db
    .prepare("SELECT * FROM ability_scores WHERE user_id = ? AND ability_tag = ?")
    .bind(userId, abilityTag)
    .first<AbilityScoreRow>();
  if (!row) throw new Error(`Ability score not found: ${abilityTag}`);
  return mapAbilityScoreRow(row);
}

export async function getAbilityMap(
  db: D1Database,
  userId: string,
): Promise<AbilityScore[]> {
  const result = await db
    .prepare("SELECT * FROM ability_scores WHERE user_id = ? ORDER BY ability_tag ASC")
    .bind(userId)
    .all<AbilityScoreRow>();
  return (result.results ?? []).map(mapAbilityScoreRow);
}

export async function getWeakAbilities(
  db: D1Database,
  userId: string,
  options?: { threshold?: number; limit?: number },
): Promise<AbilityScore[]> {
  const threshold = options?.threshold ?? 0.7;
  const limit = options?.limit ?? 5;
  const result = await db
    .prepare(
      `SELECT * FROM ability_scores
       WHERE user_id = ? AND total_count > 0 AND score < ?
       ORDER BY score ASC, wrong_count DESC
       LIMIT ?`,
    )
    .bind(userId, threshold, limit)
    .all<AbilityScoreRow>();
  return (result.results ?? []).map(mapAbilityScoreRow);
}

function tagsOverlap(a: AbilityTag[], b: AbilityTag[]): AbilityTag[] {
  const set = new Set(b);
  return a.filter((tag) => set.has(tag));
}

function mapAbilityTagsJson(json: string): AbilityTag[] {
  const tags = parseJsonField<string[]>(json, []);
  return tags.filter(isAbilityTag);
}

type IncompleteLessonRow = {
  course_slug: string;
  course_title: string;
  lesson_slug: string;
  lesson_title: string;
  ability_tags_json: string;
};

export async function recommendNextLessons(
  db: D1Database,
  userId: string,
  options?: { limit?: number },
): Promise<LessonRecommendation[]> {
  const limit = options?.limit ?? 3;
  const weakAbilities = await getWeakAbilities(db, userId, {
    threshold: 0.7,
    limit: 3,
  });

  let targetTags: AbilityTag[];

  if (weakAbilities.length > 0) {
    targetTags = [
      ...new Set(
        weakAbilities.flatMap((score) => [
          score.abilityTag,
          ...getSiblingTags(score.abilityTag),
        ]),
      ),
    ];
  } else {
    const scores = await getAbilityMap(db, userId);
    const practiced = new Set(scores.map((s) => s.abilityTag));
    targetTags = ABILITY_TAGS.filter((tag) => !practiced.has(tag));
    if (targetTags.length === 0) {
      targetTags = [...ABILITY_TAGS];
    }
  }

  const result = await db
    .prepare(
      `SELECT
        c.slug AS course_slug,
        c.title AS course_title,
        l.slug AS lesson_slug,
        l.title AS lesson_title,
        c.ability_tags_json AS ability_tags_json
      FROM lessons l
      INNER JOIN courses c ON c.id = l.course_id
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
      WHERE l.is_published = 1
        AND c.is_published = 1
        AND (lp.is_completed IS NULL OR lp.is_completed = 0)
      ORDER BY c.order_index ASC, l.order_index ASC`,
    )
    .bind(userId)
    .all<IncompleteLessonRow>();

  const candidates: LessonRecommendation[] = [];

  for (const row of result.results ?? []) {
    const courseTags = mapAbilityTagsJson(row.ability_tags_json);
    const matched = tagsOverlap(courseTags, targetTags);
    if (matched.length === 0) continue;

    const primaryTag = matched[0]!;
    candidates.push({
      courseSlug: row.course_slug,
      courseTitle: row.course_title,
      lessonSlug: row.lesson_slug,
      lessonTitle: row.lesson_title,
      matchedTags: matched,
      reason: weakAbilities.length > 0
        ? `薄弱：${ABILITY_TAG_LABELS[primaryTag]}`
        : `待练习：${ABILITY_TAG_LABELS[primaryTag]}`,
    });

    if (candidates.length >= limit) break;
  }

  return candidates;
}

export async function getPublishedAbilityTagsFromCurriculum(
  db: D1Database,
  cache?: KVNamespace,
): Promise<AbilityTag[]> {
  const cached = await getPublicAbilityTags(db, cache);
  return cached.tagSet;
}

/** @deprecated Use getPublishedAbilityTagsFromCurriculum */
export async function getPublishedCurriculumAbilityTags(
  db: D1Database,
  cache?: KVNamespace,
): Promise<AbilityTag[]> {
  return getPublishedAbilityTagsFromCurriculum(db, cache);
}

export type RemixModuleProgress = {
  moduleId: import("~/lib/learn/remixModules").RemixModuleId;
  label: string;
  description: string;
  paths: string[];
  unitIndex: number;
  totalLessons: number;
  completedLessons: number;
  percent: number;
};

export async function getRemixModuleProgress(
  db: D1Database,
  userId: string,
  cache?: KVNamespace,
): Promise<RemixModuleProgress[]> {
  const { REMIX_MODULE_TREE, isRemixModuleId } = await import(
    "~/lib/learn/remixModules"
  );

  const tallies = new Map<
    import("~/lib/learn/remixModules").RemixModuleId,
    { total: number; completed: number }
  >();

  for (const node of REMIX_MODULE_TREE) {
    tallies.set(node.id, { total: 0, completed: 0 });
  }

  const [skeleton, progressMap] = await Promise.all([
    getRemixModuleMapSkeleton(db, cache),
    getAllLessonProgressForUser(db, userId),
  ]);

  for (const entry of skeleton.lessons) {
    const progress = progressMap.get(entry.lessonId);
    const done = progress?.isCompleted ?? false;

    for (const moduleId of entry.remixModules) {
      if (!isRemixModuleId(moduleId)) continue;
      const tally = tallies.get(moduleId);
      if (!tally) continue;
      tally.total += 1;
      if (done) tally.completed += 1;
    }
  }

  return REMIX_MODULE_TREE.map((node) => {
    const entry = tallies.get(node.id) ?? { total: 0, completed: 0 };
    const percent =
      entry.total === 0 ? 0 : Math.round((entry.completed / entry.total) * 100);
    return {
      moduleId: node.id,
      label: node.label,
      description: node.description,
      paths: node.paths,
      unitIndex: node.unitIndex,
      totalLessons: entry.total,
      completedLessons: entry.completed,
      percent,
    };
  });
}
