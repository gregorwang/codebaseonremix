import { describe, expect, it } from "vitest";
import { parseAiJsonResponse } from "~/lib/server/ai/aiJson.server";
import {
  AI_LAYERS,
  AI_QUESTION_TYPES,
  RICH_METADATA_REQUIRED_TYPES,
  mapGeneratedDifficulty,
  mapGeneratedQuestionToCreateInput,
  validateAiQuestionGenerationOutput,
  validateAiSecurityContent,
  validateGeneratedQuestion,
  validateQuestionBankShape,
} from "~/lib/server/ai/aiSchemas.server";
import type {
  AiQuestionGenerationOutput,
  GeneratedQuestion,
} from "~/lib/learn/types";

const validOutput: AiQuestionGenerationOutput = {
  title: "测试批次",
  summary: "summary",
  detectedConcepts: ["loader"],
  warnings: [],
  questions: [
    {
      type: "single_choice",
      title: "状态作用域",
      prompt: "点击后谁更新状态？",
      options: [
        { id: "a", text: "父组件" },
        { id: "b", text: "子组件" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: {
        short: "父组件持有状态",
        detail: "状态在父组件 useState 中。",
      },
      abilityTags: ["frontend.state.local"],
      difficulty: "medium",
    },
  ],
};

describe("validateAiQuestionGenerationOutput", () => {
  it("accepts valid output", () => {
    const result = validateAiQuestionGenerationOutput(validOutput);
    expect(result.valid).toBe(true);
    expect(result.output?.questions).toHaveLength(1);
  });

  it("rejects choice question without options", () => {
    const invalid = {
      ...validOutput,
      questions: [
        {
          ...validOutput.questions[0],
          options: undefined,
        },
      ],
    };
    const result = validateAiQuestionGenerationOutput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("options"))).toBe(true);
  });

  it("validates parse + schema pipeline", () => {
    const parsed = parseAiJsonResponse(
      "```json\n" + JSON.stringify(validOutput) + "\n```",
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const validated = validateAiQuestionGenerationOutput(parsed.data);
      expect(validated.valid).toBe(true);
    }
  });
});

describe("validateAiSecurityContent", () => {
  it("flags api key patterns", () => {
    const result = validateAiSecurityContent("use sk-abcdefghijklmnopqrstuvwxyz");
    expect(result.valid).toBe(false);
  });

  it("flags bypass suggestions", () => {
    const result = validateAiSecurityContent("可以绕过登录直接访问");
    expect(result.valid).toBe(false);
  });
});

describe("mapGeneratedDifficulty", () => {
  it("maps easy to beginner", () => {
    expect(mapGeneratedDifficulty("easy")).toBe("beginner");
  });
});

// ---------------------------------------------------------------------------
// Phase 7 additions: 14 types, 7 layers, scope/boundary unions, rich metadata.
// ---------------------------------------------------------------------------

describe("AI_QUESTION_TYPES (Phase 7)", () => {
  it("contains all 14 types (8 original + 6 new)", () => {
    expect(AI_QUESTION_TYPES).toHaveLength(14);
    for (const t of [
      "single_choice", "multi_choice", "sort", "fill_blank",
      "debug", "branch_trace", "position_judgement", "ai_review",
      "true_false", "line_pick", "code_fix", "diff_review",
      "review_comment", "free_explain",
    ]) {
      expect(AI_QUESTION_TYPES).toContain(t);
    }
  });
});

describe("AI_LAYERS (Phase 7)", () => {
  it("contains all 7 layers from timu.MD §3", () => {
    expect(AI_LAYERS).toHaveLength(7);
    for (const l of [
      "basic", "code-reading", "state-reasoning", "ai-review",
      "typescript-review", "production-debugging", "free-response",
    ]) {
      expect(AI_LAYERS).toContain(l);
    }
  });
});

describe("validateGeneratedQuestion (Phase 7)", () => {
  it("rejects an unknown type", () => {
    const r = validateGeneratedQuestion(
      { ...validOutput.questions[0], type: "bogus" },
      0,
    );
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/type/);
  });

  it("warns when ai_review is missing realWorldImpact + aiReviewRisk", () => {
    const q: GeneratedQuestion = {
      type: "ai_review",
      title: "AI 局部补丁评审",
      prompt: "AI 改法是否合格？",
      options: [
        { id: "bad", text: "不合格：漏 session" },
        { id: "ok", text: "合格" },
      ],
      correctAnswer: { choiceId: "bad" },
      explanation: { short: "漏 session", detail: "守门必须服务端独立" },
      abilityTags: ["ai.review.architecture"],
      difficulty: "medium",
    };
    const r = validateGeneratedQuestion(q, 0);
    expect(r.valid).toBe(true); // not a hard error
    expect(r.warnings.some((w) => w.includes("realWorldImpact"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("aiReviewRisk"))).toBe(true);
  });

  it("does not warn for ai_review when both rich fields are filled", () => {
    const q: GeneratedQuestion = {
      type: "ai_review",
      title: "AI 局部补丁评审",
      prompt: "AI 改法是否合格？",
      options: [
        { id: "bad", text: "不合格：漏 session" },
        { id: "ok", text: "合格" },
      ],
      correctAnswer: { choiceId: "bad" },
      explanation: { short: "漏 session", detail: "守门必须服务端独立" },
      abilityTags: ["ai.review.architecture"],
      difficulty: "medium",
      realWorldImpact: "未授权用户能访问受保护数据。",
      aiReviewRisk: "AI 用 try/catch 兜底吞掉 401。",
      layer: "ai-review",
    };
    const r = validateGeneratedQuestion(q, 0);
    expect(r.valid).toBe(true);
    expect(r.warnings.filter((w) => w.includes("realWorldImpact"))).toHaveLength(0);
    expect(r.warnings.filter((w) => w.includes("aiReviewRisk"))).toHaveLength(0);
  });

  it("warns on out-of-vocabulary layer / scope / boundary", () => {
    const q = {
      ...validOutput.questions[0],
      layer: "bogus-layer",
      expectedFixScope: "two-line",
      serverClientBoundary: "browser",
    };
    const r = validateGeneratedQuestion(q, 0);
    expect(r.valid).toBe(true); // still valid (fields are optional)
    expect(r.warnings.some((w) => w.includes("layer"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("expectedFixScope"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("serverClientBoundary"))).toBe(true);
  });

  it("RICH_METADATA_REQUIRED_TYPES covers ai_review/diff_review/code_fix only", () => {
    expect([...RICH_METADATA_REQUIRED_TYPES].sort()).toEqual(
      ["ai_review", "code_fix", "diff_review"],
    );
  });
});

describe("validateQuestionBankShape (Phase 7)", () => {
  function bankOf(layers: string[]): AiQuestionGenerationOutput {
    return {
      title: "x",
      summary: "x",
      detectedConcepts: [],
      warnings: [],
      questions: layers.map((layer, i) => ({
        type: "single_choice",
        title: `q${i}`,
        prompt: `p${i}`,
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        correctAnswer: { choiceId: "a" },
        explanation: { short: "s", detail: "d" },
        abilityTags: ["frontend.state.local"],
        difficulty: "medium",
        layer,
      })) as GeneratedQuestion[],
    };
  }

  it("warns on size shortfall by default", () => {
    const out = bankOf(["basic", "basic", "basic"]); // 3 questions, all basic
    const r = validateQuestionBankShape(out);
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes("bank size"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("layer"))).toBe(true);
  });

  it("errors on shortfall when strict=true", () => {
    const out = bankOf(["basic", "basic"]);
    const r = validateQuestionBankShape(out, { strict: true });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("passes when 22 questions cover 5+ layers", () => {
    const layers = [
      ...Array(5).fill("basic"),
      ...Array(5).fill("code-reading"),
      ...Array(4).fill("state-reasoning"),
      ...Array(4).fill("ai-review"),
      ...Array(4).fill("production-debugging"),
    ];
    const out = bankOf(layers);
    const r = validateQuestionBankShape(out);
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("respects minQuestionsPerLayer", () => {
    const out = bankOf(Array(22).fill("basic")); // 22 questions but all basic
    const r = validateQuestionBankShape(out, {
      minQuestionsPerLayer: { "ai-review": 3 },
    });
    expect(r.warnings.some((w) => w.includes("ai-review"))).toBe(true);
  });
});

describe("mapGeneratedQuestionToCreateInput (Phase 7)", () => {
  it("passes through rich metadata fields", () => {
    const q: GeneratedQuestion = {
      type: "diff_review",
      title: "AI Diff",
      prompt: "Is this diff safe?",
      diffSnippet: "--- a\n+++ b\n",
      correctAnswer: { type: "diff_review", verdict: "reject", reason: "bad" },
      explanation: { short: "x", detail: "y" },
      abilityTags: ["ai.review.architecture"],
      difficulty: "medium",
      layer: "ai-review",
      realWorldImpact: "守门失效",
      aiReviewRisk: "try/catch 兜底",
      expectedFixScope: "one-line",
      serverClientBoundary: "server",
      touchedFiles: ["app/root.tsx"],
      wrongAnswerFeedback: { accept: "AI 没说清原因" },
      typeSafetyRisk: "返回类型抹平",
    };
    const input = mapGeneratedQuestionToCreateInput(q, "lesson-1", 0);
    expect(input.layer).toBe("ai-review");
    expect(input.realWorldImpact).toBe("守门失效");
    expect(input.aiReviewRisk).toBe("try/catch 兜底");
    expect(input.expectedFixScope).toBe("one-line");
    expect(input.serverClientBoundary).toBe("server");
    expect(input.diffSnippet).toBe("--- a\n+++ b\n");
    expect(input.touchedFiles).toEqual(["app/root.tsx"]);
    expect(input.wrongAnswerFeedback).toEqual({ accept: "AI 没说清原因" });
    expect(input.typeSafetyRisk).toBe("返回类型抹平");
  });

  it("drops invalid enum values silently", () => {
    const q: GeneratedQuestion = {
      type: "single_choice",
      title: "x",
      prompt: "y",
      correctAnswer: { choiceId: "a" },
      explanation: { short: "x", detail: "y" },
      abilityTags: ["frontend.state.local"],
      difficulty: "medium",
      // Cast to bypass TS — the runtime guard is the unit under test.
      layer: "bogus" as unknown as GeneratedQuestion["layer"],
      expectedFixScope: "two-line" as unknown as GeneratedQuestion["expectedFixScope"],
      serverClientBoundary: "browser" as unknown as GeneratedQuestion["serverClientBoundary"],
    };
    const input = mapGeneratedQuestionToCreateInput(q, "lesson-1", 0);
    expect(input.layer).toBeUndefined();
    expect(input.expectedFixScope).toBeUndefined();
    expect(input.serverClientBoundary).toBeUndefined();
  });
});
