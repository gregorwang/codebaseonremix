import { describe, expect, it } from "vitest";
import {
  aggregateCourseProgress,
  aggregateOverallProgress,
} from "~/lib/server/learn/progress.server";
import type { LessonProgressSummary } from "~/lib/server/learn/attempts.server";

function lessonProgress(
  overrides: Partial<LessonProgressSummary> & { lessonId: string },
): LessonProgressSummary {
  return {
    totalQuestions: 5,
    attemptedQuestions: 0,
    correctCount: 0,
    wrongCount: 0,
    isCompleted: false,
    ...overrides,
  };
}

describe("aggregateCourseProgress", () => {
  it("returns 100% when all lessons are completed", () => {
    const result = aggregateCourseProgress("course-1", [
      lessonProgress({ lessonId: "l1", isCompleted: true, attemptedQuestions: 5 }),
      lessonProgress({ lessonId: "l2", isCompleted: true, attemptedQuestions: 5 }),
    ]);

    expect(result.percentComplete).toBe(100);
    expect(result.completedLessons).toBe(2);
    expect(result.totalLessons).toBe(2);
  });

  it("returns 50% when half the lessons are completed", () => {
    const result = aggregateCourseProgress("course-1", [
      lessonProgress({ lessonId: "l1", isCompleted: true, attemptedQuestions: 5 }),
      lessonProgress({ lessonId: "l2", attemptedQuestions: 2 }),
    ]);

    expect(result.percentComplete).toBe(50);
    expect(result.attemptedQuestions).toBe(7);
    expect(result.totalQuestions).toBe(10);
  });
});

describe("aggregateOverallProgress", () => {
  it("aggregates across multiple courses", () => {
    const result = aggregateOverallProgress([
      {
        courseId: "c1",
        totalLessons: 4,
        completedLessons: 2,
        totalQuestions: 20,
        attemptedQuestions: 12,
        percentComplete: 50,
      },
      {
        courseId: "c2",
        totalLessons: 2,
        completedLessons: 2,
        totalQuestions: 10,
        attemptedQuestions: 10,
        percentComplete: 100,
      },
    ]);

    expect(result.totalLessons).toBe(6);
    expect(result.completedLessons).toBe(4);
    expect(result.percentComplete).toBeCloseTo(66.7, 1);
    expect(result.totalQuestionsAttempted).toBe(22);
  });
});
