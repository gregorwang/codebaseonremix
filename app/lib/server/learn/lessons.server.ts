import type { CreateLessonInput, Lesson, LessonRow } from "~/lib/learn/types";
import { boolToInt, newId, nowIso, stringifyJsonField } from "./db-json.server";
import { mapLessonRow } from "./mappers.server";

export async function getLessonsByCourse(
  db: D1Database,
  courseId: string,
  options?: { publishedOnly?: boolean },
): Promise<Lesson[]> {
  const publishedOnly = options?.publishedOnly ?? false;
  const query = publishedOnly
    ? "SELECT * FROM lessons WHERE course_id = ? AND is_published = 1 ORDER BY order_index ASC"
    : "SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC";
  const result = await db.prepare(query).bind(courseId).all<LessonRow>();
  return (result.results ?? []).map(mapLessonRow);
}

export async function getLessonBySlug(
  db: D1Database,
  courseId: string,
  slug: string,
): Promise<Lesson | null> {
  const row = await db
    .prepare("SELECT * FROM lessons WHERE course_id = ? AND slug = ?")
    .bind(courseId, slug)
    .first<LessonRow>();
  return row ? mapLessonRow(row) : null;
}

export async function getLessonById(
  db: D1Database,
  id: string,
): Promise<Lesson | null> {
  const row = await db
    .prepare("SELECT * FROM lessons WHERE id = ?")
    .bind(id)
    .first<LessonRow>();
  return row ? mapLessonRow(row) : null;
}

export async function createLesson(
  db: D1Database,
  input: CreateLessonInput,
): Promise<Lesson> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO lessons (
        id, course_id, slug, title, description, learning_goal,
        source_file_path, source_summary, order_index, remix_modules_json,
        teaching_blocks_json, lesson_meta_json,
        is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.courseId,
      input.slug,
      input.title,
      input.description,
      input.learningGoal,
      input.sourceFilePath ?? null,
      input.sourceSummary ?? null,
      input.orderIndex,
      input.remixModules?.length
        ? stringifyJsonField(input.remixModules)
        : null,
      input.teachingBlocks?.length
        ? stringifyJsonField(input.teachingBlocks)
        : null,
      input.lessonMeta ? stringifyJsonField(input.lessonMeta) : null,
      boolToInt(input.isPublished),
      now,
      now,
    )
    .run();
  const lesson = await getLessonById(db, id);
  if (!lesson) throw new Error("Failed to create lesson");
  return lesson;
}
