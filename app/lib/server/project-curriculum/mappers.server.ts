import type {
  CodeAsset,
  CodeAssetRow,
  CurriculumBlueprint,
  CurriculumBlueprintRow,
  CurriculumDraft,
  CurriculumDraftRow,
  ProjectFile,
  ProjectFileRow,
  ProjectSource,
  ProjectSourceRow,
} from "~/lib/learn/types";
import type { AbilityTag } from "~/lib/learn/abilityTags";
import { isAbilityTag } from "~/lib/learn/abilityTags";
import { intToBool, parseJsonField } from "../learn/db-json.server";

export function mapProjectSourceRow(row: ProjectSourceRow): ProjectSource {
  return {
    id: row.id,
    sourcePath: row.source_path,
    displayName: row.display_name,
    framework: row.framework,
    status: row.status as ProjectSource["status"],
    fileCount: row.file_count,
    lastScannedAt: row.last_scanned_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProjectFileRow(row: ProjectFileRow): ProjectFile {
  return {
    id: row.id,
    sourceId: row.source_id,
    filePath: row.file_path,
    fileKind: row.file_kind as ProjectFile["fileKind"],
    language: row.language ?? undefined,
    sizeBytes: row.size_bytes,
    contentHash: row.content_hash ?? undefined,
    summary: row.summary ?? undefined,
    importanceScore: row.importance_score,
    content: row.content ?? undefined,
    lineCount: row.line_count ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCodeAssetRow(row: CodeAssetRow): CodeAsset {
  return {
    id: row.id,
    sourceId: row.source_id,
    fileId: row.file_id ?? undefined,
    title: row.title,
    filePath: row.file_path,
    code: row.code,
    startLine: row.start_line ?? undefined,
    endLine: row.end_line ?? undefined,
    assetType: row.asset_type,
    businessContext: row.business_context ?? undefined,
    userLearningValue: row.user_learning_value ?? undefined,
    detectedConcepts: parseJsonField<string[]>(row.detected_concepts_json, []),
    abilityTags: parseJsonField<string[]>(row.ability_tags_json, []).filter(
      isAbilityTag,
    ) as AbilityTag[],
    status: row.status as CodeAsset["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCurriculumBlueprintRow(
  row: CurriculumBlueprintRow,
): CurriculumBlueprint {
  return {
    id: row.id,
    sourceId: row.source_id,
    title: row.title,
    summary: row.summary ?? undefined,
    generated: parseJsonField(row.generated_json, {}),
    status: row.status as CurriculumBlueprint["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCurriculumDraftRow(row: CurriculumDraftRow): CurriculumDraft {
  return {
    id: row.id,
    sourceId: row.source_id,
    blueprintId: row.blueprint_id ?? undefined,
    title: row.title,
    generatedCourses: parseJsonField(row.generated_courses_json, []),
    generatedExams: row.generated_exams_json
      ? parseJsonField(row.generated_exams_json, [])
      : undefined,
    generatedAbilities: row.generated_abilities_json
      ? parseJsonField(row.generated_abilities_json, [])
      : undefined,
    status: row.status as CurriculumDraft["status"],
    reviewNote: row.review_note ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
