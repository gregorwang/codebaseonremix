import type { QuestionType, UserAnswer } from "./types";

export function parseUserAnswer(
  formData: FormData,
  questionType: QuestionType,
): UserAnswer {
  const answerJson = formData.get("answerJson");
  if (typeof answerJson === "string" && answerJson) {
    const parsed = JSON.parse(answerJson) as UserAnswer;
    if (parsed.type !== questionType) {
      throw new Error(`Answer type mismatch: expected ${questionType}, got ${parsed.type}`);
    }
    return parsed;
  }

  switch (questionType) {
    case "single_choice":
      return {
        type: "single_choice",
        choiceId: String(formData.get("choiceId") ?? ""),
      };
    case "multi_choice": {
      const raw = formData.get("choiceIds");
      const choiceIds =
        typeof raw === "string" ? (JSON.parse(raw) as string[]) : [];
      return { type: "multi_choice", choiceIds };
    }
    case "sort": {
      const raw = formData.get("itemIds");
      const itemIds = typeof raw === "string" ? (JSON.parse(raw) as string[]) : [];
      return { type: "sort", itemIds };
    }
    case "fill_blank": {
      const raw = formData.get("values");
      const values =
        typeof raw === "string"
          ? (JSON.parse(raw) as Record<string, string>)
          : {};
      return { type: "fill_blank", values };
    }
    case "debug":
      return {
        type: "debug",
        issueId: String(formData.get("issueId") ?? ""),
      };
    case "branch_trace": {
      const raw = formData.get("pathIds");
      const pathIds = typeof raw === "string" ? (JSON.parse(raw) as string[]) : [];
      return { type: "branch_trace", pathIds };
    }
    case "position_judgement":
      return {
        type: "position_judgement",
        positionId: String(formData.get("positionId") ?? ""),
      };
    case "ai_review": {
      const choiceId = formData.get("choiceId");
      const riskIdsRaw = formData.get("riskIds");
      const riskIds =
        typeof riskIdsRaw === "string" ? (JSON.parse(riskIdsRaw) as string[]) : undefined;
      if (choiceId) {
        return { type: "ai_review", choiceId: String(choiceId), riskIds };
      }
      const keywordsRaw = formData.get("keywords");
      const keywords =
        typeof keywordsRaw === "string"
          ? (JSON.parse(keywordsRaw) as string[])
          : [];
      return { type: "ai_review", keywords, riskIds };
    }
    case "true_false": {
      const raw = formData.get("value");
      const value = raw === "true" || raw === "false" ? raw === "true" : null;
      if (value === null) {
        return { type: "true_false", value: false };
      }
      return { type: "true_false", value };
    }
    case "line_pick":
      return {
        type: "line_pick",
        lineId: String(formData.get("lineId") ?? ""),
      };
    case "code_fix":
      return {
        type: "code_fix",
        patchedCode: String(formData.get("patchedCode") ?? ""),
      };
    case "diff_review":
      return {
        type: "diff_review",
        verdict:
          formData.get("verdict") === "accept" ? "accept" : "reject",
        reason: String(formData.get("reason") ?? ""),
      };
    case "review_comment":
      return {
        type: "review_comment",
        comment: String(formData.get("comment") ?? ""),
      };
    case "free_explain":
      return {
        type: "free_explain",
        text: String(formData.get("text") ?? ""),
      };
    default:
      throw new Error(`Unsupported question type: ${questionType}`);
  }
}

export function serializeUserAnswer(answer: UserAnswer): string {
  return JSON.stringify(answer);
}
