import type { ProjectSource, ProjectSourceRow } from "~/lib/learn/types";
import { newId, nowIso } from "../learn/db-json.server";
import { mapProjectSourceRow } from "./mappers.server";

export async function listProjectSources(db: D1Database): Promise<ProjectSource[]> {
  const result = await db
    .prepare("SELECT * FROM project_sources ORDER BY created_at DESC")
    .all<ProjectSourceRow>();
  return (result.results ?? []).map(mapProjectSourceRow);
}

export async function getProjectSourceById(
  db: D1Database,
  id: string,
): Promise<ProjectSource | null> {
  const row = await db
    .prepare("SELECT * FROM project_sources WHERE id = ?")
    .bind(id)
    .first<ProjectSourceRow>();
  return row ? mapProjectSourceRow(row) : null;
}

export async function getProjectSourceByPath(
  db: D1Database,
  sourcePath: string,
): Promise<ProjectSource | null> {
  const row = await db
    .prepare("SELECT * FROM project_sources WHERE source_path = ?")
    .bind(sourcePath)
    .first<ProjectSourceRow>();
  return row ? mapProjectSourceRow(row) : null;
}

export async function createProjectSource(
  db: D1Database,
  params: {
    sourcePath: string;
    displayName: string;
    framework?: string;
  },
): Promise<ProjectSource> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO project_sources (
        id, source_path, display_name, framework, status, file_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    )
    .bind(
      id,
      params.sourcePath,
      params.displayName,
      params.framework ?? "react-router",
      now,
      now,
    )
    .run();
  const source = await getProjectSourceById(db, id);
  if (!source) throw new Error("Failed to create project source");
  return source;
}

export async function updateProjectSourceStatus(
  db: D1Database,
  id: string,
  status: ProjectSource["status"],
  fileCount?: number,
): Promise<ProjectSource> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE project_sources SET
        status = ?, file_count = COALESCE(?, file_count),
        last_scanned_at = ?, updated_at = ?
      WHERE id = ?`,
    )
    .bind(status, fileCount ?? null, now, now, id)
    .run();
  const source = await getProjectSourceById(db, id);
  if (!source) throw new Error(`Project source not found: ${id}`);
  return source;
}

export async function getOrCreateProjectSource(
  db: D1Database,
  params: { sourcePath: string; displayName: string },
): Promise<ProjectSource> {
  const existing = await getProjectSourceByPath(db, params.sourcePath);
  if (existing) return existing;
  return createProjectSource(db, params);
}
