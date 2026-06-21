import { describe, expect, it } from "vitest";
import { EXAM_BANK_COURSE } from "~/lib/server/learn/seed-data/examQuestionBank";
import { PROJECT_COURSES, SAMPLE_COURSES } from "~/lib/server/learn/seed-data";
import { PROJECT_EXAMS, SAMPLE_EXAMS } from "~/lib/server/learn/seed-data/exams";

describe("project seed data integrity", () => {
  it("has 20 project courses and 3 sample courses", () => {
    expect(PROJECT_COURSES).toHaveLength(20);
    expect(SAMPLE_COURSES).toHaveLength(3);
  });

  it("project courses use site- slug prefix and 6 lessons with 8+ questions each", () => {
    let lessonCount = 0;
    for (const course of PROJECT_COURSES) {
      expect(course.slug.startsWith("site-")).toBe(true);
      expect(course.lessons.length).toBeGreaterThanOrEqual(6);
      lessonCount += course.lessons.length;
      for (const lesson of course.lessons) {
        expect(lesson.questions.length).toBeGreaterThanOrEqual(6);
        expect(lesson.remixModules?.length).toBeGreaterThan(0);
      }
    }
    expect(lessonCount).toBeGreaterThanOrEqual(120);
  });

  it("project lessons have teaching blocks and at least 8 questions", () => {
    for (const course of PROJECT_COURSES) {
      for (const lesson of course.lessons) {
        expect(lesson.teachingBlocks?.length ?? 0).toBeGreaterThanOrEqual(2);
        expect(lesson.questions.length).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("courses are ordered by unit with strict orderIndex 0-19", () => {
    const indices = PROJECT_COURSES.map((c) => c.orderIndex);
    expect(indices).toEqual([...Array(20)].map((_, i) => i));
    for (const course of PROJECT_COURSES) {
      expect(course.unitIndex).toBeDefined();
      expect(course.subtitle).toMatch(/^单元 \d+/);
    }
  });

  it("exam taskRefs resolve to existing lessons", () => {
    const lessonIndex = new Map<string, number>();
    for (const course of [
      ...PROJECT_COURSES,
      ...SAMPLE_COURSES,
      EXAM_BANK_COURSE,
    ]) {
      for (const lesson of course.lessons) {
        lessonIndex.set(`${course.slug}/${lesson.slug}`, lesson.questions.length);
      }
    }

    for (const exam of [...PROJECT_EXAMS, ...SAMPLE_EXAMS]) {
      for (const ref of exam.taskRefs) {
        const key = `${ref.courseSlug}/${ref.lessonSlug}`;
        const count = lessonIndex.get(key);
        expect(count, `missing lesson ${key}`).toBeDefined();
        expect(ref.questionIndex, `bad index for ${key}`).toBeLessThan(count!);
      }
    }
  });

  it("has 12 project exams (4 major + 8 unit) and no separate sample exams", () => {
    // The 3 legacy sample exams used to live in their own pool lessons that
    // 100% duplicated major-exam content; both lessons and exams were
    // removed in the dedup refactor.
    expect(PROJECT_EXAMS).toHaveLength(12);
    expect(SAMPLE_EXAMS).toHaveLength(0);
  });
});
