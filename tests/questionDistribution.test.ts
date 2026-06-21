import { describe, expect, it } from "vitest";
import type { QuestionType } from "~/lib/learn/types";
import { EXAM_BANK_COURSE } from "~/lib/server/learn/seed-data/examQuestionBank";
import { PROJECT_COURSES, SAMPLE_COURSES } from "~/lib/server/learn/seed-data";
import { PROJECT_EXAMS, SAMPLE_EXAMS } from "~/lib/server/learn/seed-data/exams";

const ALL_TYPES: QuestionType[] = [
  "single_choice",
  "multi_choice",
  "sort",
  "fill_blank",
  "debug",
  "branch_trace",
  "position_judgement",
  "ai_review",
];

function typesInQuestions(questions: { type: QuestionType; code?: string }[]) {
  return new Set(questions.map((q) => q.type));
}

function examTypesFromRefs(
  exams: typeof PROJECT_EXAMS,
  lessonIndex: Map<string, { type: QuestionType }[]>,
) {
  const types = new Set<QuestionType>();
  for (const exam of exams) {
    for (const ref of exam.taskRefs) {
      const key = `${ref.courseSlug}/${ref.lessonSlug}`;
      const lessonQs = lessonIndex.get(key);
      const question = lessonQs?.[ref.questionIndex];
      if (question) types.add(question.type);
    }
  }
  return types;
}

describe("question type distribution", () => {
  const lessonIndex = new Map<string, { type: QuestionType; code?: string }[]>();
  for (const course of [...PROJECT_COURSES, ...SAMPLE_COURSES, EXAM_BANK_COURSE]) {
    for (const lesson of course.lessons) {
      lessonIndex.set(`${course.slug}/${lesson.slug}`, lesson.questions);
    }
  }

  it("project lessons have 22+ questions and cover 5+ distinct types", () => {
    // Phase 7 / timu.MD §3-§4: per-lesson density is 22-30 (Nemesis 36-54)
    // and per-lesson layer mix is 5+ distinct layers, but NOT every type
    // must appear in every lesson — timu.MD §4's root-loader sample exam
    // (28 Q) deliberately omits `debug`. Per-type coverage is checked at
    // COURSE level (next test).
    for (const course of PROJECT_COURSES) {
      const courseTypes = new Set<QuestionType>();
      for (const lesson of course.lessons) {
        expect(lesson.questions.length).toBeGreaterThanOrEqual(22);
        const types = typesInQuestions(lesson.questions);
        // Each lesson should have meaningful variety, not 22 single-choice.
        expect(
          types.size,
          `${course.slug}/${lesson.slug} only has ${types.size} distinct types`,
        ).toBeGreaterThanOrEqual(5);
        for (const t of types) courseTypes.add(t);
      }
      expect(courseTypes.size).toBeGreaterThanOrEqual(5);
    }
  });

  it("sample lessons have at least 6 questions", () => {
    for (const course of SAMPLE_COURSES) {
      for (const lesson of course.lessons) {
        expect(lesson.questions.length).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it("project courses collectively cover all 8 question types", () => {
    const all = new Set<QuestionType>();
    for (const course of PROJECT_COURSES) {
      for (const lesson of course.lessons) {
        for (const q of lesson.questions) all.add(q.type);
      }
    }
    for (const t of ALL_TYPES) {
      expect(all.has(t), `missing ${t}`).toBe(true);
    }
  });

  it("project exams have 8+ tasks and 6+ types", () => {
    for (const exam of PROJECT_EXAMS) {
      expect(exam.taskRefs.length).toBeGreaterThanOrEqual(8);
      const types = new Set<QuestionType>();
      for (const ref of exam.taskRefs) {
        const qs = lessonIndex.get(`${ref.courseSlug}/${ref.lessonSlug}`);
        const question = qs?.[ref.questionIndex];
        if (question) types.add(question.type);
      }
      expect(types.size).toBeGreaterThanOrEqual(6);
    }
  });

  it("sample exams have 8 tasks referencing exam bank", () => {
    for (const exam of SAMPLE_EXAMS) {
      expect(exam.taskRefs.length).toBeGreaterThanOrEqual(8);
      expect(exam.courseSlug).toBe("site-exam-bank");
    }
  });
});
