import type { AbilityTag } from "./abilityTags";
import { newId, nowIso } from "../server/learn/db-json.server";

export function calculateAbilityScore(
  correctCount: number,
  wrongCount: number,
): number {
  const total = correctCount + wrongCount;
  return correctCount / Math.max(total, 1);
}

export async function updateAbilityFromAttempt(
  db: D1Database,
  userId: string,
  abilityTags: AbilityTag[],
  isCorrect: boolean,
): Promise<void> {
  const now = nowIso();
  const uniqueTags = [...new Set(abilityTags)];

  for (const tag of uniqueTags) {
    const existing = await db
      .prepare("SELECT * FROM ability_scores WHERE user_id = ? AND ability_tag = ?")
      .bind(userId, tag)
      .first<{
        id: string;
        correct_count: number;
        wrong_count: number;
        total_count: number;
      }>();

    if (existing) {
      const correctCount = existing.correct_count + (isCorrect ? 1 : 0);
      const wrongCount = existing.wrong_count + (isCorrect ? 0 : 1);
      const totalCount = correctCount + wrongCount;
      const score = calculateAbilityScore(correctCount, wrongCount);
      await db
        .prepare(
          `UPDATE ability_scores SET
            correct_count = ?, wrong_count = ?, total_count = ?,
            score = ?, last_practiced_at = ?, updated_at = ?
          WHERE id = ?`,
        )
        .bind(correctCount, wrongCount, totalCount, score, now, now, existing.id)
        .run();
    } else {
      const correctCount = isCorrect ? 1 : 0;
      const wrongCount = isCorrect ? 0 : 1;
      const totalCount = 1;
      const score = calculateAbilityScore(correctCount, wrongCount);
      await db
        .prepare(
          `INSERT INTO ability_scores (
            id, user_id, ability_tag, correct_count, wrong_count,
            total_count, score, last_practiced_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          newId(),
          userId,
          tag,
          correctCount,
          wrongCount,
          totalCount,
          score,
          now,
          now,
        )
        .run();
    }
  }
}
