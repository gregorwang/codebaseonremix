import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { CourseOrigin } from "~/lib/learn/types";
import type { Difficulty, ExamBriefing } from "~/lib/learn/types";
import type { SeedExamTaskRef } from "./examTypes";
import { PROJECT_MAJOR_EXAMS, PROJECT_UNIT_EXAMS } from "./examDefinitions";

export type { SeedExamTaskRef } from "./examTypes";

export type SeedExamData = {
  slug: string;
  courseSlug: string;
  title: string;
  description: string;
  scenario: string;
  briefing?: ExamBriefing;
  passingScore: number;
  difficulty: Difficulty;
  abilityTags: AbilityTag[];
  taskRefs: SeedExamTaskRef[];
  origin?: CourseOrigin;
  isPublished?: boolean;
};

export const PROJECT_EXAMS: SeedExamData[] = [
  ...PROJECT_MAJOR_EXAMS,
  ...PROJECT_UNIT_EXAMS,
];

/**
 * The legacy SAMPLE_EXAMS (theme-global-system-exam / fullstack-feature-exam /
 * protected-api-exam) used to live in their own per-sample EXAM_BANK_COURSE
 * lessons that 100% duplicated the major exam packs. Those lessons are gone
 * (see examQuestionBank.ts) so we drop the matching exams entirely; the
 * 4 major exams + 8 unit exams already cover the same content.
 */
export const SAMPLE_EXAMS: SeedExamData[] = [];

export const SEED_EXAMS: SeedExamData[] = [...PROJECT_EXAMS, ...SAMPLE_EXAMS];
