import type { MistakeType } from "./abilityTags";
import type { AnswerResult, Question, UserAnswer } from "./types";

function inferFromAbilityTags(tags: string[]): MistakeType | undefined {
  if (tags.some((t) => t.startsWith("frontend.state."))) {
    return tags.includes("frontend.state.scope")
      ? "state_scope_error"
      : "state_transition_error";
  }
  if (tags.some((t) => t.startsWith("frontend.event."))) return "event_chain_error";
  if (tags.includes("frontend.effect.useEffect")) return "effect_error";
  if (tags.includes("backend.session.cookie")) return "session_error";
  if (tags.includes("backend.auth.required")) return "permission_error";
  if (tags.includes("backend.validation.field")) return "validation_error";
  if (tags.includes("backend.rateLimit")) return "rate_limit_error";
  if (tags.includes("bridge.reactRouter.action")) return "backend_guard_order_error";
  if (tags.includes("bridge.reactRouter.loader")) return "bridge_error";
  if (tags.includes("code.position.handler")) return "code_position_error";
  if (tags.includes("ai.review.architecture")) return "ai_review_error";
  if (tags.includes("project.modify.fullstack")) return "bridge_error";
  return undefined;
}

function inferFromQuestionType(type: Question["type"]): MistakeType | undefined {
  switch (type) {
    case "sort":
    case "branch_trace":
      return "event_chain_error";
    case "debug":
      return "state_scope_error";
    case "fill_blank":
      return "state_transition_error";
    case "position_judgement":
      return "code_position_error";
    case "ai_review":
      return "ai_review_error";
    case "multi_choice":
      return "backend_guard_order_error";
    default:
      return undefined;
  }
}

export function classifyMistake(
  question: Question,
  _userAnswer: UserAnswer,
  result: AnswerResult,
): string | undefined {
  if (result.isCorrect) return undefined;
  if (result.mistakeType) return result.mistakeType;

  if (question.mistakeTypes && question.mistakeTypes.length > 0) {
    return question.mistakeTypes[0];
  }

  return (
    inferFromAbilityTags(question.abilityTags) ??
    inferFromQuestionType(question.type) ??
    "bridge_error"
  );
}
