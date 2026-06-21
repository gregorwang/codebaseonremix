import { isAbilityTag } from "~/lib/learn/abilityTags";
import type { CurriculumDraft, CurriculumDraftRow } from "~/lib/learn/types";
import { createCourse } from "../learn/courses.server";
import { createExam } from "../learn/exams.server";
import { createLesson } from "../learn/lessons.server";
import { createQuestion } from "../learn/questions.server";
import { newId, nowIso, stringifyJsonField } from "../learn/db-json.server";
import { listCodeAssets } from "./codeAssetExtractor.server";
import {
  buildCurriculumBlueprint,
  saveCurriculumBlueprint,
  type CurriculumBlueprintData,
} from "./curriculumPlanner.server";
import { validateCurriculumDraftCourses, type CurriculumDraftCourse } from "./curriculumSchemas.server";
import { mapCurriculumDraftRow } from "./mappers.server";
import { listProjectFiles } from "./projectScanner.server";

export async function createCurriculumDraftFromBlueprint(
  db: D1Database,
  sourceId: string,
  blueprintId: string,
  data: CurriculumBlueprintData,
  assets: Awaited<ReturnType<typeof listCodeAssets>>,
): Promise<CurriculumDraft> {
  const coursesWithQuestions = data.courses.map((course) => ({
    ...course,
    lessons: course.lessons.map((lesson) => {
      const asset = assets.find((a) => lesson.relatedAssetIds.includes(a.id));
      return {
        ...lesson,
        questions: asset
          ? [
              {
                type: "single_choice",
                title: `理解 ${asset.title}`,
                prompt: `以下哪项最能描述该代码片段在项目中的作用？\n\n文件：${asset.filePath}`,
                code: asset.code.slice(0, 2000),
                abilityTags: asset.abilityTags,
              },
            ]
          : [],
      };
    }),
  }));

  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO curriculum_drafts (
        id, source_id, blueprint_id, title, generated_courses_json,
        generated_exams_json, generated_abilities_json, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    )
    .bind(
      id,
      sourceId,
      blueprintId,
      "项目课程草稿",
      stringifyJsonField(coursesWithQuestions),
      stringifyJsonField([]),
      stringifyJsonField([]),
      now,
      now,
    )
    .run();

  const draft = await getCurriculumDraftById(db, id);
  if (!draft) throw new Error("Failed to create curriculum draft");
  return draft;
}

export async function getCurriculumDraftById(
  db: D1Database,
  id: string,
): Promise<CurriculumDraft | null> {
  const row = await db
    .prepare("SELECT * FROM curriculum_drafts WHERE id = ?")
    .bind(id)
    .first<CurriculumDraftRow>();
  return row ? mapCurriculumDraftRow(row) : null;
}

export async function listCurriculumDrafts(
  db: D1Database,
  sourceId?: string,
): Promise<CurriculumDraft[]> {
  const query = sourceId
    ? "SELECT * FROM curriculum_drafts WHERE source_id = ? ORDER BY created_at DESC"
    : "SELECT * FROM curriculum_drafts ORDER BY created_at DESC";
  const result = sourceId
    ? await db.prepare(query).bind(sourceId).all<CurriculumDraftRow>()
    : await db.prepare(query).all<CurriculumDraftRow>();
  return (result.results ?? []).map(mapCurriculumDraftRow);
}

export async function approveCurriculumDraft(
  db: D1Database,
  draftId: string,
  reviewedBy: string,
): Promise<CurriculumDraft> {
  const now = nowIso();
  await db
    .prepare(
      "UPDATE curriculum_drafts SET status = 'approved', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?",
    )
    .bind(reviewedBy, now, now, draftId)
    .run();
  const draft = await getCurriculumDraftById(db, draftId);
  if (!draft) throw new Error("Draft not found");
  return draft;
}

export async function rejectCurriculumDraft(
  db: D1Database,
  draftId: string,
  note: string,
): Promise<CurriculumDraft> {
  const now = nowIso();
  await db
    .prepare(
      "UPDATE curriculum_drafts SET status = 'rejected', review_note = ?, updated_at = ? WHERE id = ?",
    )
    .bind(note, now, draftId)
    .run();
  const draft = await getCurriculumDraftById(db, draftId);
  if (!draft) throw new Error("Draft not found");
  return draft;
}

export async function publishCurriculumDraft(
  db: D1Database,
  draftId: string,
): Promise<{ courses: number; lessons: number; questions: number }> {
  const draft = await getCurriculumDraftById(db, draftId);
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "approved") {
    throw new Error("仅 approved 状态的草稿可发布");
  }

  const validation = validateCurriculumDraftCourses(draft.generatedCourses);
  if (!validation.valid || !validation.parsed) {
    throw new Error(validation.errors.join("; "));
  }

  let coursesCreated = 0;
  let lessonsCreated = 0;
  let questionsCreated = 0;

  for (const courseData of validation.parsed) {
    const course = await createCourse(db, {
      slug: `project-${courseData.slug}`,
      title: courseData.title,
      description: courseData.description,
      projectContext: courseData.projectContext,
      difficulty: "intermediate",
      abilityTags: courseData.abilityTags,
      orderIndex: courseData.orderIndex,
      isPublished: true,
      origin: "project",
      sourceId: draft.sourceId,
      blueprintId: draft.blueprintId,
    });
    coursesCreated++;

    for (const [li, lessonData] of courseData.lessons.entries()) {
      const draftLesson = lessonData as CurriculumDraftCourse["lessons"][number];
      const lesson = await createLesson(db, {
        courseId: course.id,
        slug: draftLesson.slug.slice(0, 80),
        title: draftLesson.title,
        description: draftLesson.description,
        learningGoal: draftLesson.learningGoal,
        sourceFilePath: draftLesson.sourceFiles[0],
        sourceSummary: draftLesson.questionPlan,
        orderIndex: li,
        isPublished: true,
      });
      lessonsCreated++;

      const questions = draftLesson.questions ?? [];
      for (const [qi, q] of questions.entries()) {
        await createQuestion(db, {
          lessonId: lesson.id,
          type: "single_choice",
          title: q.title,
          prompt: q.prompt,
          code: q.code,
          options: [
            { id: "a", text: "该文件负责正确的业务因果链（推荐理解）" },
            { id: "b", text: "与项目无关的占位代码" },
            { id: "c", text: "仅用于样式装饰" },
          ],
          correctAnswer: { type: "single_choice", choiceId: "a" },
          explanation: {
            short: "结合文件路径与代码上下文理解职责",
            detail: draftLesson.learningGoal,
            realProjectNote: courseData.projectContext,
          },
          abilityTags: q.abilityTags.filter(isAbilityTag),
          difficulty: "intermediate",
          orderIndex: qi,
          isPublished: true,
        });
        questionsCreated++;
      }
    }
  }

  const now = nowIso();
  await db
    .prepare(
      "UPDATE curriculum_drafts SET status = 'published', updated_at = ? WHERE id = ?",
    )
    .bind(now, draftId)
    .run();

  return { courses: coursesCreated, lessons: lessonsCreated, questions: questionsCreated };
}

export async function planAndDraftCurriculum(
  db: D1Database,
  sourceId: string,
): Promise<{ blueprintId: string; draftId: string }> {
  const files = await listProjectFiles(db, sourceId);
  const assets = await listCodeAssets(db, sourceId);
  const blueprintData = buildCurriculumBlueprint(files, assets);
  const blueprintId = await saveCurriculumBlueprint(db, sourceId, blueprintData);
  const draft = await createCurriculumDraftFromBlueprint(
    db,
    sourceId,
    blueprintId,
    blueprintData,
    assets,
  );
  return { blueprintId, draftId: draft.id };
}
