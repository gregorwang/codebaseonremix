import { QUESTION_TYPE_LABELS } from "./questionLabels";
import type {
  FillBlank,
  Question,
  QuestionOption,
  QuestionType,
  SortItem,
  UserAnswer,
} from "./types";

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function optionLabel(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}

export function formatOptionsForAi(options?: QuestionOption[]): string {
  if (!options?.length) return "（本题无选项列表）";

  return options
    .map((option, index) => {
      const letter = optionLabel(index);
      const hint = option.locationHint ? ` [${option.locationHint}]` : "";
      return `${letter}. id=${option.id}：${option.text}${hint}`;
    })
    .join("\n");
}

export function formatSortItemsForAi(items?: SortItem[]): string {
  if (!items?.length) return "（本题无排序步骤）";

  return items
    .map((item, index) => {
      const category = item.category ? ` (${item.category})` : "";
      const desc = item.description ? ` — ${item.description}` : "";
      return `${index + 1}. id=${item.id}：${item.title ?? item.text}${category}${desc}`;
    })
    .join("\n");
}

export function formatBlanksForAi(blanks?: FillBlank[]): string {
  if (!blanks?.length) return "（本题无填空）";

  return blanks
    .map((blank) => `- id=${blank.id}，占位：${blank.placeholder}${blank.hint ? `，提示：${blank.hint}` : ""}`)
    .join("\n");
}

function resolveOptionText(options: QuestionOption[] | undefined, id: string): string {
  const option = options?.find((o) => o.id === id);
  return option ? `${id}（${option.text}）` : id;
}

export function formatAnswerForAi(
  answer: unknown,
  questionType: QuestionType,
  context?: {
    options?: QuestionOption[];
    sortItems?: SortItem[];
    blanks?: FillBlank[];
    linePickLines?: { id: string; lineNumber: number; text: string }[];
  },
): string {
  if (answer === undefined || answer === null) return "（未提供）";

  const typed = answer as UserAnswer & Record<string, unknown>;

  switch (questionType) {
    case "single_choice":
    case "debug":
    case "position_judgement":
      if (typed && typeof typed === "object" && "choiceId" in typed) {
        const id = String(typed.choiceId);
        return resolveOptionText(context?.options, id);
      }
      if (typed && typeof typed === "object" && "issueId" in typed) {
        const id = String(typed.issueId);
        return resolveOptionText(context?.options, id);
      }
      if (typed && typeof typed === "object" && "positionId" in typed) {
        const id = String(typed.positionId);
        return resolveOptionText(context?.options, id);
      }
      break;
    case "multi_choice":
      if (typed && typeof typed === "object" && Array.isArray(typed.choiceIds)) {
        return (typed.choiceIds as string[])
          .map((id) => resolveOptionText(context?.options, id))
          .join("、");
      }
      break;
    case "sort":
      if (typed && typeof typed === "object" && Array.isArray(typed.itemIds)) {
        const labels = new Map(
          context?.sortItems?.map((item) => [item.id, item.title ?? item.text]),
        );
        return (typed.itemIds as string[])
          .map((id, index) => `${index + 1}. ${labels.get(id) ?? id}`)
          .join("\n");
      }
      break;
    case "fill_blank":
      if (typed && typeof typed === "object" && typed.values) {
        return Object.entries(typed.values as Record<string, string>)
          .map(([id, value]) => `${id}：${value || "（空）"}`)
          .join("\n");
      }
      break;
    case "branch_trace":
      if (typed && typeof typed === "object" && Array.isArray(typed.pathIds)) {
        return (typed.pathIds as string[])
          .map((id, index) => {
            const text = context?.options?.find((o) => o.id === id)?.text ?? id;
            return `${index + 1}. ${text}`;
          })
          .join("\n");
      }
      break;
    case "ai_review":
      if (typed && typeof typed === "object" && typed.choiceId) {
        const parts = [resolveOptionText(context?.options, String(typed.choiceId))];
        if (Array.isArray(typed.riskIds) && typed.riskIds.length > 0) {
          parts.push(`风险类型：${(typed.riskIds as string[]).join("、")}`);
        }
        return parts.join("\n");
      }
      break;
    case "true_false":
      if (typed && typeof typed === "object" && "value" in typed) {
        return typed.value ? "正确" : "错误";
      }
      break;
    case "line_pick":
      if (typed && typeof typed === "object" && "lineId" in typed) {
        const id = String(typed.lineId);
        const found = context?.linePickLines?.find((l) => l.id === id);
        return found ? `L${found.lineNumber}：${found.text}` : id;
      }
      break;
    case "code_fix":
      if (typed && typeof typed === "object" && "patchedCode" in typed) {
        return typed.patchedCode
          ? `\`\`\`\n${String(typed.patchedCode)}\n\`\`\``
          : "（未修改）";
      }
      break;
    case "diff_review":
      if (typed && typeof typed === "object" && "verdict" in typed) {
        const v = typed.verdict === "accept" ? "接受" : "拒绝";
        const reason = String(typed.reason ?? "");
        return `${v}${reason ? `\n原因：${reason}` : ""}`;
      }
      break;
    case "review_comment":
      if (typed && typeof typed === "object" && "comment" in typed) {
        return String(typed.comment ?? "") || "（未填写）";
      }
      break;
    case "free_explain":
      if (typed && typeof typed === "object" && "text" in typed) {
        return String(typed.text ?? "") || "（未填写）";
      }
      break;
  }

  try {
    return JSON.stringify(answer, null, 2);
  } catch {
    return String(answer);
  }
}

export function formatQuestionMaterialsForAi(question: Pick<
  Question,
  | "type"
  | "options"
  | "sortItems"
  | "blanks"
  | "branchScenario"
  | "diffSnippet"
  | "linePickLines"
  | "codeFixBaseline"
  | "expectedFixScope"
  | "serverClientBoundary"
  | "touchedFiles"
  | "wrongAnswerFeedback"
  | "realWorldImpact"
  | "aiReviewRisk"
  | "typeSafetyRisk"
  | "layer"
>): string {
  const lines: string[] = [];

  switch (question.type) {
    case "single_choice":
    case "multi_choice":
    case "debug":
    case "position_judgement":
    case "ai_review":
    case "branch_trace":
      lines.push(formatOptionsForAi(question.options));
      break;
    case "sort":
      lines.push(formatSortItemsForAi(question.sortItems));
      break;
    case "fill_blank":
      lines.push(formatBlanksForAi(question.blanks));
      break;
    case "line_pick":
      if (question.linePickLines?.length) {
        lines.push(
          "候选行：\n" +
            question.linePickLines
              .map(
                (l) =>
                  `- id=${l.id} L${l.lineNumber}：${l.text}${l.explanation ? ` — ${l.explanation}` : ""}`,
              )
              .join("\n"),
        );
      }
      break;
    case "code_fix":
      if (question.codeFixBaseline) {
        lines.push(`待修复 baseline：\n\`\`\`\n${question.codeFixBaseline}\n\`\`\``);
      }
      break;
    case "diff_review":
    case "review_comment":
      if (question.diffSnippet) {
        lines.push(`Diff：\n\`\`\`diff\n${question.diffSnippet}\n\`\`\``);
      }
      break;
    default:
      if (question.options?.length) {
        lines.push(formatOptionsForAi(question.options));
      }
  }

  if (question.branchScenario) {
    lines.push(`分支场景：${question.branchScenario}`);
  }
  if (question.expectedFixScope) {
    lines.push(`预期改动范围：${question.expectedFixScope}`);
  }
  if (question.serverClientBoundary) {
    lines.push(`运行边界：${question.serverClientBoundary}`);
  }
  if (question.touchedFiles?.length) {
    lines.push(`涉及文件：${question.touchedFiles.join("、")}`);
  }
  if (question.realWorldImpact) {
    lines.push(`生产影响：${question.realWorldImpact}`);
  }
  if (question.aiReviewRisk) {
    lines.push(`AI 评审风险：${question.aiReviewRisk}`);
  }
  if (question.typeSafetyRisk) {
    lines.push(`类型安全风险：${question.typeSafetyRisk}`);
  }
  if (question.layer) {
    lines.push(`训练层：${question.layer}`);
  }

  return lines.filter(Boolean).join("\n\n") || "（无额外题目材料）";
}

export function questionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPE_LABELS[type] ?? type;
}
