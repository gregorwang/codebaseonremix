import type { RemixModuleId } from "~/lib/learn/remixModules";
import { UNIT_LABELS } from "~/lib/learn/remixModules";
import type { Difficulty } from "~/lib/learn/types";
import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { SeedCourseData, SeedLessonData } from "../types";
import { expandLessonWithTeaching } from "../courses/lessonExpand";

export type LessonSpec = {
  slug: string;
  title: string;
  path: string;
  summary: string;
  focus: string;
  remixModules: RemixModuleId[];
  abilityTags: AbilityTag[];
  /**
   * Optional primary file used by per-lesson real-question modules when
   * `path` points to a directory or to a placeholder. Real-question authors
   * should anchor `code` excerpts and AI-改坏题 to this file when set.
   */
  primaryFile?: string;
};

export type CourseSpec = {
  slug: string;
  title: string;
  description: string;
  projectContext: string;
  difficulty: Difficulty;
  abilityTags: AbilityTag[];
  orderIndex: number;
  unitIndex: number;
  remixModules: RemixModuleId[];
  lessons: LessonSpec[];
};

function expandLesson(
  spec: LessonSpec,
  lessonIdx: number,
  courseSlug: string,
): SeedLessonData {
  return expandLessonWithTeaching(spec, lessonIdx, courseSlug);
}

export function expandCourse(spec: CourseSpec): SeedCourseData {
  return {
    slug: spec.slug,
    title: spec.title,
    subtitle: UNIT_LABELS[spec.unitIndex],
    description: spec.description,
    projectContext: spec.projectContext,
    difficulty: spec.difficulty,
    abilityTags: spec.abilityTags,
    orderIndex: spec.orderIndex,
    unitIndex: spec.unitIndex,
    remixModules: spec.remixModules,
    lessons: spec.lessons.map((lesson, idx) => expandLesson(lesson, idx, spec.slug)),
  };
}

export function expandCourses(specs: CourseSpec[]): SeedCourseData[] {
  return specs.map(expandCourse);
}
