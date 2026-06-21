import type { AbilityTag } from "~/lib/learn/abilityTags";
import { isAbilityTag } from "~/lib/learn/abilityTags";
import type { CurriculumBlueprintData, PlannedCourse } from "./curriculumPlanner.server";

export type CurriculumDraftCourse = PlannedCourse & {
  lessons: Array<
    PlannedCourse["lessons"][number] & {
      questions?: Array<{
        type: string;
        title: string;
        prompt: string;
        code?: string;
        abilityTags: string[];
      }>;
    }
  >;
};

export function validateCurriculumBlueprint(data: unknown): {
  valid: boolean;
  errors: string[];
  blueprint?: CurriculumBlueprintData;
} {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["蓝图必须是对象"] };
  }
  const obj = data as CurriculumBlueprintData;
  if (!Array.isArray(obj.courses)) errors.push("courses 必须是数组");
  if (obj.courses?.length === 0) errors.push("至少一门课程");
  for (const course of obj.courses ?? []) {
    if (!course.slug || !course.title) errors.push("课程缺少 slug/title");
    if (!Array.isArray(course.lessons) || course.lessons.length === 0) {
      errors.push(`课程 ${course.slug} 缺少 lessons`);
    }
  }
  return errors.length
    ? { valid: false, errors }
    : { valid: true, errors: [], blueprint: obj };
}

export function validateCurriculumDraftCourses(courses: unknown): {
  valid: boolean;
  errors: string[];
  parsed?: CurriculumDraftCourse[];
} {
  const errors: string[] = [];
  if (!Array.isArray(courses) || courses.length === 0) {
    return { valid: false, errors: ["generatedCourses 必须是非空数组"] };
  }
  const parsed = courses as CurriculumDraftCourse[];
  for (const c of parsed) {
    if (!c.slug || !c.title) errors.push("课程缺少 slug/title");
    if (!c.lessons?.length) errors.push(`课程 ${c.slug} 无关卡`);
  }
  return errors.length ? { valid: false, errors } : { valid: true, errors: [], parsed };
}

export function filterAbilityTags(tags: string[]): AbilityTag[] {
  return tags.filter(isAbilityTag);
}
