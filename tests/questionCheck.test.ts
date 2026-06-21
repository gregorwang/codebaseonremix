import { describe, expect, it } from "vitest";
import { classifyMistake } from "~/lib/learn/mistakeClassifier";
import { calculateAbilityScore } from "~/lib/learn/abilityScore";
import { checkAnswer } from "~/lib/learn/questionCheck";
import type { Question, UserAnswer } from "~/lib/learn/types";

function makeQuestion(overrides: Partial<Question> & Pick<Question, "type" | "correctAnswer">): Question {
  return {
    id: "q1",
    lessonId: "l1",
    title: "Test",
    prompt: "Test prompt",
    explanation: { short: "short", detail: "detail" },
    abilityTags: ["frontend.state.scope"],
    difficulty: "intermediate",
    orderIndex: 0,
    isPublished: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("checkAnswer", () => {
  it("checks single_choice", () => {
    const question = makeQuestion({
      type: "single_choice",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctAnswer: { choiceId: "b" },
    });
    expect(checkAnswer(question, { type: "single_choice", choiceId: "b" }).isCorrect).toBe(true);
    expect(checkAnswer(question, { type: "single_choice", choiceId: "a" }).isCorrect).toBe(false);
  });

  it("checks multi_choice", () => {
    const question = makeQuestion({
      type: "multi_choice",
      correctAnswer: { choiceIds: ["a", "c"] },
    });
    const correct: UserAnswer = { type: "multi_choice", choiceIds: ["c", "a"] };
    const wrong: UserAnswer = { type: "multi_choice", choiceIds: ["a"] };
    expect(checkAnswer(question, correct).isCorrect).toBe(true);
    expect(checkAnswer(question, wrong).isCorrect).toBe(false);
  });

  it("checks sort", () => {
    const question = makeQuestion({
      type: "sort",
      sortItems: [{ id: "1", text: "1" }, { id: "2", text: "2" }],
      correctAnswer: { itemIds: ["1", "2"] },
    });
    expect(checkAnswer(question, { type: "sort", itemIds: ["1", "2"] }).isCorrect).toBe(true);
    expect(checkAnswer(question, { type: "sort", itemIds: ["2", "1"] }).isCorrect).toBe(false);
  });

  it("checks fill_blank", () => {
    const question = makeQuestion({
      type: "fill_blank",
      blanks: [{ id: "x", placeholder: "p", acceptedAnswers: ["global", "全局"] }],
      correctAnswer: { values: { x: "global" } },
    });
    expect(checkAnswer(question, { type: "fill_blank", values: { x: "全局" } }).isCorrect).toBe(true);
    expect(checkAnswer(question, { type: "fill_blank", values: { x: "local" } }).isCorrect).toBe(false);
  });

  it("checks debug", () => {
    const question = makeQuestion({
      type: "debug",
      correctAnswer: { issueId: "scope" },
    });
    expect(checkAnswer(question, { type: "debug", issueId: "scope" }).isCorrect).toBe(true);
    expect(checkAnswer(question, { type: "debug", issueId: "other" }).isCorrect).toBe(false);
  });

  it("checks branch_trace", () => {
    const question = makeQuestion({
      type: "branch_trace",
      correctAnswer: { pathIds: ["a", "b"] },
    });
    expect(checkAnswer(question, { type: "branch_trace", pathIds: ["a", "b"] }).isCorrect).toBe(true);
    expect(checkAnswer(question, { type: "branch_trace", pathIds: ["b", "a"] }).isCorrect).toBe(false);
  });

  it("checks position_judgement", () => {
    const question = makeQuestion({
      type: "position_judgement",
      correctAnswer: { positionId: "root" },
    });
    expect(checkAnswer(question, { type: "position_judgement", positionId: "root" }).isCorrect).toBe(true);
    expect(checkAnswer(question, { type: "position_judgement", positionId: "leaf" }).isCorrect).toBe(false);
  });

  it("checks ai_review by choiceId", () => {
    const question = makeQuestion({
      type: "ai_review",
      correctAnswer: { choiceId: "a" },
    });
    expect(checkAnswer(question, { type: "ai_review", choiceId: "a" }).isCorrect).toBe(true);
    expect(checkAnswer(question, { type: "ai_review", choiceId: "b" }).isCorrect).toBe(false);
  });

  it("checks ai_review by keywords", () => {
    const question = makeQuestion({
      type: "ai_review",
      correctAnswer: { keywords: ["局部", "全局"] },
    });
    expect(
      checkAnswer(question, { type: "ai_review", keywords: ["这是局部补丁而非全局状态"] }).isCorrect,
    ).toBe(true);
    expect(checkAnswer(question, { type: "ai_review", keywords: ["完全正确"] }).isCorrect).toBe(false);
  });
});

describe("classifyMistake", () => {
  it("returns mistake type for wrong answers", () => {
    const question = makeQuestion({
      type: "single_choice",
      correctAnswer: { choiceId: "b" },
      abilityTags: ["frontend.state.scope"],
      mistakeTypes: ["state_scope_error"],
    });
    const answer: UserAnswer = { type: "single_choice", choiceId: "a" };
    const result = checkAnswer(question, answer);
    expect(classifyMistake(question, answer, result)).toBe("state_scope_error");
  });

  it("returns undefined for correct answers", () => {
    const question = makeQuestion({
      type: "single_choice",
      correctAnswer: { choiceId: "a" },
    });
    const answer: UserAnswer = { type: "single_choice", choiceId: "a" };
    const result = checkAnswer(question, answer);
    expect(classifyMistake(question, answer, result)).toBeUndefined();
  });
});

describe("calculateAbilityScore", () => {
  it("calculates score ratio", () => {
    expect(calculateAbilityScore(3, 1)).toBe(0.75);
    expect(calculateAbilityScore(0, 0)).toBe(0);
    expect(calculateAbilityScore(5, 0)).toBe(1);
  });
});

describe("checkAnswer — Phase 2 new types", () => {
  it("checks true_false", () => {
    const question = makeQuestion({
      type: "true_false",
      correctAnswer: { value: true },
    });
    expect(checkAnswer(question, { type: "true_false", value: true }).isCorrect).toBe(true);
    expect(checkAnswer(question, { type: "true_false", value: false }).isCorrect).toBe(false);
  });

  it("checks line_pick by lineId", () => {
    const question = makeQuestion({
      type: "line_pick",
      correctAnswer: { lineId: "L3" },
    });
    expect(checkAnswer(question, { type: "line_pick", lineId: "L3" }).isCorrect).toBe(true);
    expect(checkAnswer(question, { type: "line_pick", lineId: "L5" }).isCorrect).toBe(false);
    // Empty selection is always wrong (not silent accept).
    expect(checkAnswer(question, { type: "line_pick", lineId: "" }).isCorrect).toBe(false);
  });

  it("checks code_fix with whitespace-insensitive equality", () => {
    const question = makeQuestion({
      type: "code_fix",
      codeFixBaseline: "const x = 1",
      correctAnswer: { patchedCode: "const  x  =  1" },
    });
    expect(
      checkAnswer(question, { type: "code_fix", patchedCode: "const x = 1" }).isCorrect,
    ).toBe(true);
    expect(
      checkAnswer(question, { type: "code_fix", patchedCode: "const x = 2" }).isCorrect,
    ).toBe(false);
    // Empty patch is wrong.
    expect(checkAnswer(question, { type: "code_fix", patchedCode: "" }).isCorrect).toBe(
      false,
    );
  });

  it("checks diff_review verdict and accepts any non-empty reason", () => {
    const question = makeQuestion({
      type: "diff_review",
      correctAnswer: { verdict: "reject", reason: "AI 漏掉 session 守门" },
    });
    expect(
      checkAnswer(question, {
        type: "diff_review",
        verdict: "reject",
        reason: "any reason counts for substance grading later",
      }).isCorrect,
    ).toBe(true);
    // Verdict mismatch is always wrong.
    expect(
      checkAnswer(question, {
        type: "diff_review",
        verdict: "accept",
        reason: "this is right",
      }).isCorrect,
    ).toBe(false);
  });

  it("review_comment defers to AI: empty rejected, non-empty marked needsAiGrading", () => {
    const question = makeQuestion({
      type: "review_comment",
      correctAnswer: { comment: "no correct answer — AI grades" },
    });
    const empty = checkAnswer(question, { type: "review_comment", comment: "    " });
    expect(empty.isCorrect).toBe(false);
    expect(empty.needsAiGrading).toBeFalsy();
    const filled = checkAnswer(question, {
      type: "review_comment",
      comment: "请加 session 守门再 patch。",
    });
    // Free-form answers are never auto-marked correct anymore — AI must grade.
    expect(filled.isCorrect).toBe(false);
    expect(filled.needsAiGrading).toBe(true);
  });

  it("free_explain defers to AI: empty rejected, non-empty marked needsAiGrading", () => {
    const question = makeQuestion({
      type: "free_explain",
      correctAnswer: { text: "no correct answer — AI grades" },
    });
    const empty = checkAnswer(question, { type: "free_explain", text: "" });
    expect(empty.isCorrect).toBe(false);
    expect(empty.needsAiGrading).toBeFalsy();
    const filled = checkAnswer(question, {
      type: "free_explain",
      text: "这段代码先取 session，没有就重定向到 /login。",
    });
    expect(filled.isCorrect).toBe(false);
    expect(filled.needsAiGrading).toBe(true);
  });

  it("returns isCorrect:false when answer.type mismatches question.type", () => {
    const question = makeQuestion({
      type: "true_false",
      correctAnswer: { value: true },
    });
    expect(
      checkAnswer(question, { type: "single_choice", choiceId: "a" }).isCorrect,
    ).toBe(false);
  });
});
