import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { RemixModuleId } from "~/lib/learn/remixModules";
import type { CreateQuestionInput, Difficulty, Explanation, LessonMeta, TeachingBlock } from "~/lib/learn/types";

export type SeedExplanation = Partial<Explanation> & Pick<Explanation, "short">;

export type SeedLessonData = {
  slug: string;
  title: string;
  description: string;
  learningGoal: string;
  sourceFilePath?: string;
  sourceSummary?: string;
  orderIndex: number;
  remixModules?: RemixModuleId[];
  teachingBlocks?: TeachingBlock[];
  lessonMeta?: LessonMeta;
  questions: Omit<CreateQuestionInput, "lessonId">[];
};

export type SeedCourseData = {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  projectContext: string;
  difficulty: Difficulty;
  abilityTags: AbilityTag[];
  orderIndex: number;
  unitIndex?: number;
  remixModules?: RemixModuleId[];
  lessons: SeedLessonData[];
};

export function q(
  partial: Omit<CreateQuestionInput, "lessonId" | "isPublished" | "difficulty" | "explanation" | "orderIndex"> & {
    difficulty?: Difficulty;
    orderIndex?: number;
    explanation: SeedExplanation;
  },
): Omit<CreateQuestionInput, "lessonId"> {
  const explanation: Explanation = {
    detail: partial.explanation.detail ?? partial.explanation.short,
    ...partial.explanation,
  };
  return {
    difficulty: partial.difficulty ?? "intermediate",
    isPublished: true,
    orderIndex: partial.orderIndex ?? 0,
    ...partial,
    explanation,
  };
}
