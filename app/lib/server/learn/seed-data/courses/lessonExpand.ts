import type { SeedLessonData } from "../types";
import { buildLessonQuestions } from "../units/lessonQuestions";
import { buildLessonMeta, buildTeachingBlocks } from "../teaching/buildTeachingBlocks";
import type { LessonSpec } from "../units/factory";
import { PILOT_LESSON_OVERRIDES } from "./pilotOverrides";
import { getRealLessonQuestions } from "../real-questions";

const NORMAL_MIN = 22;

export function expandLessonWithTeaching(
  spec: LessonSpec,
  lessonIdx: number,
  courseSlug: string,
): SeedLessonData {
  const overrideKey = `${courseSlug}/${spec.slug}`;
  const override = PILOT_LESSON_OVERRIDES[overrideKey];

  // Lookup order:
  //   1. Hand-written real questions (anchored to remix/ source).
  //   2. PILOT_LESSON_OVERRIDES (legacy 8-question pilots — questions slot
  //      ignored unless we also have >=22 of them; teaching slots still apply).
  //   3. buildLessonQuestions synthetic generator (Phase 3 default).
  const realQuestions = getRealLessonQuestions(courseSlug, spec.slug);
  const questions =
    realQuestions && realQuestions.length >= NORMAL_MIN
      ? realQuestions.map((q, orderIndex) => ({ ...q, orderIndex }))
      : buildLessonQuestions(spec, lessonIdx, courseSlug);

  return {
    slug: spec.slug,
    title: spec.title,
    description: spec.focus,
    learningGoal:
      override?.learningGoal ??
      `能说明 remix/${spec.path} 在「${spec.title}」中的职责，并用多种题型验证读写代码能力。`,
    sourceFilePath: spec.path,
    sourceSummary: spec.summary,
    orderIndex: lessonIdx,
    remixModules: spec.remixModules,
    teachingBlocks: override?.teachingBlocks ?? buildTeachingBlocks(spec),
    lessonMeta: override?.lessonMeta ?? buildLessonMeta(spec, questions.length),
    questions,
  };
}
