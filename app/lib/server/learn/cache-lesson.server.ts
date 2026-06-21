import type { AbilityTag } from "~/lib/learn/abilityTags";
import { isAbilityTag } from "~/lib/learn/abilityTags";
import type { Difficulty, QuestionType } from "~/lib/learn/types";
import { parseJsonField } from "./db-json.server";
import { LEARN_CACHE_KEYS } from "./cache-keys";
import { getCachedJson, setCachedJson } from "./cache.server";

export type CachedQuestionSummary = {
  id: string;
  title: string;
  type: QuestionType;
  difficulty: Difficulty;
  abilityTags: AbilityTag[];
  orderIndex: number;
};

export type CachedLessonQuestionList = {
  lessonId: string;
  questions: CachedQuestionSummary[];
  generatedAt: string;
};

type QuestionSummaryRow = {
  id: string;
  title: string;
  type: QuestionType;
  difficulty: Difficulty;
  ability_tags_json: string;
  order_index: number;
};

function mapSummaryRow(row: QuestionSummaryRow): CachedQuestionSummary {
  const tags = parseJsonField<string[]>(row.ability_tags_json, []);
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    difficulty: row.difficulty,
    abilityTags: tags.filter(isAbilityTag),
    orderIndex: row.order_index,
  };
}

export async function buildLessonQuestionList(
  db: D1Database,
  lessonId: string,
): Promise<CachedLessonQuestionList> {
  const result = await db
    .prepare(
      `SELECT id, title, type, difficulty, ability_tags_json, order_index
       FROM questions
       WHERE lesson_id = ? AND is_published = 1
       ORDER BY order_index ASC`,
    )
    .bind(lessonId)
    .all<QuestionSummaryRow>();

  return {
    lessonId,
    questions: (result.results ?? []).map(mapSummaryRow),
    generatedAt: new Date().toISOString(),
  };
}

export async function getLessonQuestionList(
  db: D1Database,
  lessonId: string,
  cache?: KVNamespace,
): Promise<CachedLessonQuestionList> {
  const key = LEARN_CACHE_KEYS.lessonQuestionList(lessonId);
  const cached = await getCachedJson<CachedLessonQuestionList>(cache, key);
  if (cached) return cached;

  const built = await buildLessonQuestionList(db, lessonId);
  await setCachedJson(cache, key, built);
  return built;
}

export function resolveQuestionIndex(
  summaries: CachedQuestionSummary[],
  rawIndex: number,
): number {
  if (summaries.length === 0) return 0;
  if (!Number.isFinite(rawIndex)) return 0;
  return Math.min(Math.max(0, rawIndex), summaries.length - 1);
}
