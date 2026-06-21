import type { Course, CourseOrigin, CourseRow, CreateCourseInput } from "~/lib/learn/types";
import { boolToInt, newId, nowIso, stringifyJsonField } from "./db-json.server";
import { refreshLearnPublicCache } from "./cache-public.server";
import { mapCourseRow } from "./mappers.server";

export async function getCourses(
  db: D1Database,
  options?: {
    publishedOnly?: boolean;
    origin?: CourseOrigin;
    preferProjectFirst?: boolean;
  },
): Promise<Course[]> {
  const publishedOnly = options?.publishedOnly ?? false;
  const bindings: string[] = [];
  const conditions: string[] = [];
  if (publishedOnly) conditions.push("is_published = 1");
  if (options?.origin) {
    conditions.push("origin = ?");
    bindings.push(options.origin);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const order = options?.preferProjectFirst
    ? "ORDER BY CASE WHEN origin = 'project' THEN 0 ELSE 1 END, order_index ASC"
    : "ORDER BY order_index ASC";

  const query = `SELECT * FROM courses ${where} ${order}`;
  const result = await db.prepare(query).bind(...bindings).all<CourseRow>();
  return (result.results ?? []).map(mapCourseRow);
}

export async function getCourseBySlug(
  db: D1Database,
  slug: string,
): Promise<Course | null> {
  const row = await db
    .prepare("SELECT * FROM courses WHERE slug = ?")
    .bind(slug)
    .first<CourseRow>();
  return row ? mapCourseRow(row) : null;
}

export async function getCourseById(
  db: D1Database,
  id: string,
): Promise<Course | null> {
  const row = await db
    .prepare("SELECT * FROM courses WHERE id = ?")
    .bind(id)
    .first<CourseRow>();
  return row ? mapCourseRow(row) : null;
}

export async function createCourse(
  db: D1Database,
  input: CreateCourseInput,
): Promise<Course> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO courses (
        id, slug, title, subtitle, description, project_context,
        difficulty, ability_tags_json, order_index, unit_index, is_published,
        source_id, origin, blueprint_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.slug,
      input.title,
      input.subtitle ?? null,
      input.description,
      input.projectContext ?? null,
      input.difficulty,
      stringifyJsonField(input.abilityTags),
      input.orderIndex,
      input.unitIndex ?? null,
      boolToInt(input.isPublished),
      input.sourceId ?? null,
      input.origin ?? "sample",
      input.blueprintId ?? null,
      now,
      now,
    )
    .run();
  const course = await getCourseById(db, id);
  if (!course) throw new Error("Failed to create course");
  return course;
}

export async function updateCourse(
  db: D1Database,
  id: string,
  input: Partial<CreateCourseInput>,
): Promise<Course> {
  const existing = await getCourseById(db, id);
  if (!existing) throw new Error(`Course not found: ${id}`);
  const now = nowIso();
  await db
    .prepare(
      `UPDATE courses SET
        slug = ?, title = ?, subtitle = ?, description = ?,
        project_context = ?, difficulty = ?, ability_tags_json = ?,
        order_index = ?, is_published = ?, updated_at = ?
      WHERE id = ?`,
    )
    .bind(
      input.slug ?? existing.slug,
      input.title ?? existing.title,
      input.subtitle ?? existing.subtitle ?? null,
      input.description ?? existing.description,
      input.projectContext ?? existing.projectContext ?? null,
      input.difficulty ?? existing.difficulty,
      stringifyJsonField(input.abilityTags ?? existing.abilityTags),
      input.orderIndex ?? existing.orderIndex,
      boolToInt(input.isPublished ?? existing.isPublished),
      now,
      id,
    )
    .run();
  const course = await getCourseById(db, id);
  if (!course) throw new Error("Failed to update course");
  return course;
}

export async function publishCourse(
  db: D1Database,
  id: string,
  cache?: KVNamespace,
): Promise<Course> {
  const now = nowIso();
  await db
    .prepare("UPDATE courses SET is_published = 1, updated_at = ? WHERE id = ?")
    .bind(now, id)
    .run();
  const course = await getCourseById(db, id);
  if (!course) throw new Error(`Course not found: ${id}`);
  await refreshLearnPublicCache(db, cache);
  return course;
}
