import { describe, expect, it } from "vitest";
import { mapQuestionRow } from "~/lib/server/learn/mappers.server";
import { questionInputToRow } from "~/lib/server/learn/questions.server";
import type { CreateQuestionInput, Question, QuestionRow, QuestionType } from "~/lib/learn/types";

const NOW = "2026-06-16T20:00:00.000Z";

function baseInput(overrides: Partial<CreateQuestionInput> = {}): CreateQuestionInput {
  return {
    lessonId: "lesson-1",
    type: "single_choice",
    title: "示例题",
    prompt: "下列哪个是 root loader 的作用？",
    correctAnswer: { type: "single_choice", choiceId: "a" },
    explanation: { short: "短答", detail: "详细解释" },
    abilityTags: ["frontend.state.global"],
    difficulty: "beginner",
    orderIndex: 0,
    isPublished: true,
    ...overrides,
  };
}

/**
 * Asserts that a Question, once written as a QuestionRow (via questionInputToRow
 * — the same shape createQuestion INSERTs) and then read back via mapQuestionRow,
 * round-trips every field without loss. The 11 new metadata fields from
 * migration 0008 are explicitly exercised.
 */
function expectRoundTrip(input: CreateQuestionInput) {
  const id = "q-test-id";
  const row = questionInputToRow(id, input, NOW);
  const question: Question = mapQuestionRow(row);
  // The mapper can't know `id` or `createdAt`/`updatedAt` from a CreateQuestionInput
  // because those are server-assigned. We assert everything else.
  expect(question.lessonId).toBe(input.lessonId);
  expect(question.type).toBe(input.type);
  expect(question.title).toBe(input.title);
  expect(question.prompt).toBe(input.prompt);
  expect(question.code).toBe(input.code ?? undefined);
  expect(question.options).toEqual(input.options);
  expect(question.blanks).toEqual(input.blanks);
  expect(question.sortItems).toEqual(input.sortItems);
  expect(question.correctAnswer).toEqual(input.correctAnswer);
  expect(question.explanation).toEqual(input.explanation);
  expect(question.abilityTags).toEqual(input.abilityTags);
  expect(question.mistakeTypes).toEqual(input.mistakeTypes);
  expect(question.difficulty).toBe(input.difficulty);
  expect(question.sourceFilePath).toBe(input.sourceFilePath);
  expect(question.sourceNote).toBe(input.sourceNote);
  expect(question.debugMeta).toEqual(input.debugMeta);
  expect(question.aiReviewMeta).toEqual(input.aiReviewMeta);
  expect(question.branchScenario).toBe(input.branchScenario);
  expect(question.diffSnippet).toBe(input.diffSnippet);
  expect(question.linePickLines).toEqual(input.linePickLines);
  expect(question.codeFixBaseline).toBe(input.codeFixBaseline);
  expect(question.expectedFixScope).toBe(input.expectedFixScope);
  expect(question.serverClientBoundary).toBe(input.serverClientBoundary);
  expect(question.touchedFiles).toEqual(input.touchedFiles);
  expect(question.wrongAnswerFeedback).toEqual(input.wrongAnswerFeedback);
  expect(question.realWorldImpact).toBe(input.realWorldImpact);
  expect(question.aiReviewRisk).toBe(input.aiReviewRisk);
  expect(question.typeSafetyRisk).toBe(input.typeSafetyRisk);
  expect(question.layer).toBe(input.layer);
  expect(question.orderIndex).toBe(input.orderIndex);
  expect(question.isPublished).toBe(input.isPublished);
  expect(question.id).toBe(id);
  expect(question.createdAt).toBe(NOW);
  expect(question.updatedAt).toBe(NOW);
}

describe("questionMapper round-trip (Phase 1.4)", () => {
  it("round-trips a minimal input (no new fields)", () => {
    expectRoundTrip(baseInput());
  });

  it("round-trips all 11 new metadata fields populated", () => {
    expectRoundTrip(
      baseInput({
        type: "diff_review",
        diffSnippet:
          "--- a/root.tsx\n+++ b/root.tsx\n@@\n-  if (auth)\n+  if (true)\n",
        codeFixBaseline: "const x = unvalidated(input);",
        expectedFixScope: "one-line",
        serverClientBoundary: "server",
        touchedFiles: ["app/routes/api.foo.ts", "app/services/foo.server.ts"],
        wrongAnswerFeedback: {
          a: "A 选项忽略了 root loader 边界。",
          b: "B 选项更糟：会破坏 SSR。",
        },
        realWorldImpact:
          "匿名请求每分钟多触发 1 次 D1 查询，单 worker 容量会下降约 8%。",
        aiReviewRisk:
          "AI 倾向于把守门逻辑简化成一个 try/catch，掩盖真正的越权路径。",
        typeSafetyRisk: "string 联合应换成受控 union；`as Foo` 是假的类型安全。",
        layer: "ai-review",
      }),
    );
  });

  it("round-trips line_pick with typed line metadata", () => {
    expectRoundTrip(
      baseInput({
        type: "line_pick",
        linePickLines: [
          { id: "L2", lineNumber: 2, text: "const theme = await getTheme(request);" },
          {
            id: "L5",
            lineNumber: 5,
            text: "  ? await getSessionCached(request)",
            explanation: "这是 session 守门后的真正读取。",
          },
        ],
        layer: "code-reading",
      }),
    );
  });

  it("round-trips free_explain with empty touched array (no fields undefined)", () => {
    expectRoundTrip(
      baseInput({
        type: "free_explain",
        correctAnswer: { type: "free_explain", text: "" },
        layer: "free-response",
        // No diffSnippet, no baseline, no touched files — should remain undefined.
      }),
    );
  });

  it("rejects invalid enum values silently (returns undefined for that field)", () => {
    const row: QuestionRow = questionInputToRow("q1", baseInput(), NOW);
    // Force-feed an invalid enum string.
    const dirtyRow: QuestionRow = {
      ...row,
      expected_fix_scope: "invalid-scope",
      server_client_boundary: "browser", // not in SERVER_CLIENT_BOUNDARY_VALUES
      layer: "bogus",
    };
    const q = mapQuestionRow(dirtyRow);
    expect(q.expectedFixScope).toBeUndefined();
    expect(q.serverClientBoundary).toBeUndefined();
    expect(q.layer).toBeUndefined();
  });

  it("accepts every documented enum value", () => {
    const row: QuestionRow = questionInputToRow("q1", baseInput(), NOW);
    const allQuestionTypes: QuestionType[] = [
      "single_choice",
      "multi_choice",
      "sort",
      "fill_blank",
      "debug",
      "branch_trace",
      "position_judgement",
      "ai_review",
      "true_false",
      "line_pick",
      "code_fix",
      "diff_review",
      "review_comment",
      "free_explain",
    ];
    for (const t of allQuestionTypes) {
      const r: QuestionRow = { ...row, type: t };
      expect(mapQuestionRow(r).type).toBe(t);
    }
  });
});
