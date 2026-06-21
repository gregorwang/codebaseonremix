import { describe, expect, it } from "vitest";
import { gradeExamSubmission } from "~/lib/server/learn/examGrading.server";
import type { Exam, Question } from "~/lib/learn/types";

function makeQuestion(
  id: string,
  abilityTags: Question["abilityTags"] = ["frontend.state.local"],
): Question {
  return {
    id,
    lessonId: "lesson-1",
    type: "single_choice",
    title: `Q ${id}`,
    prompt: "test",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    correctAnswer: { choiceId: "a" },
    explanation: { short: "s", detail: "d" },
    abilityTags,
    difficulty: "intermediate",
    orderIndex: 0,
    isPublished: true,
    createdAt: "",
    updatedAt: "",
  };
}

function makeExam(tasks: Exam["tasks"], passingScore = 80): Exam {
  return {
    id: "exam-1",
    slug: "test-exam",
    title: "Test",
    description: "d",
    scenario: "s",
    tasks,
    passingScore,
    abilityTags: ["frontend.state.local"],
    difficulty: "intermediate",
    isPublished: true,
    origin: "sample",
    createdAt: "",
    updatedAt: "",
  };
}

describe("gradeExamSubmission", () => {
  it("scores 100 when all answers are correct", () => {
    const q1 = makeQuestion("q1");
    const q2 = makeQuestion("q2");
    const exam = makeExam([
      { id: "t1", questionId: "q1", title: "T1", prompt: "", type: "single_choice", weight: 1 },
      { id: "t2", questionId: "q2", title: "T2", prompt: "", type: "single_choice", weight: 1 },
    ]);

    const result = gradeExamSubmission({
      exam,
      questions: [q1, q2],
      answers: {
        t1: { type: "single_choice", choiceId: "a" },
        t2: { type: "single_choice", choiceId: "a" },
      },
    });

    expect(result.score).toBe(100);
    expect(result.isPassed).toBe(true);
    expect(result.weakAbilities).toHaveLength(0);
  });

  it("applies weighted scoring", () => {
    const q1 = makeQuestion("q1");
    const q2 = makeQuestion("q2", ["backend.auth.required"]);
    const exam = makeExam([
      { id: "t1", questionId: "q1", title: "T1", prompt: "", type: "single_choice", weight: 2 },
      { id: "t2", questionId: "q2", title: "T2", prompt: "", type: "single_choice", weight: 1 },
    ]);

    const result = gradeExamSubmission({
      exam,
      questions: [q1, q2],
      answers: {
        t1: { type: "single_choice", choiceId: "a" },
        t2: { type: "single_choice", choiceId: "b" },
      },
    });

    expect(result.score).toBe(66.7);
    expect(result.isPassed).toBe(false);
    expect(result.weakAbilities).toContain("backend.auth.required");
  });

  it("respects passingScore boundary", () => {
    const q1 = makeQuestion("q1");
    const exam = makeExam(
      [{ id: "t1", questionId: "q1", title: "T1", prompt: "", type: "single_choice", weight: 1 }],
      80,
    );

    const fail = gradeExamSubmission({
      exam,
      questions: [q1],
      answers: { t1: { type: "single_choice", choiceId: "b" } },
    });
    expect(fail.score).toBe(0);
    expect(fail.isPassed).toBe(false);

    const pass = gradeExamSubmission({
      exam,
      questions: [q1],
      answers: { t1: { type: "single_choice", choiceId: "a" } },
    });
    expect(pass.score).toBe(100);
    expect(pass.isPassed).toBe(true);
  });
});
