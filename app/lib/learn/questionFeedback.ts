import type { Question, UserAnswer } from "~/lib/learn/types";

export function buildSortFeedback(
  question: Question,
  userAnswer: UserAnswer,
): { tooEarly?: string[]; tooLate?: string[] } | undefined {
  if (userAnswer.type !== "sort" || question.type !== "sort") return undefined;
  const correct = question.correctAnswer as { itemIds: string[] };
  const userIds = userAnswer.itemIds;
  const tooEarly: string[] = [];
  const tooLate: string[] = [];

  for (const id of userIds) {
    const userIndex = userIds.indexOf(id);
    const correctIndex = correct.itemIds.indexOf(id);
    if (correctIndex < 0) continue;
    if (userIndex < correctIndex) tooEarly.push(id);
    if (userIndex > correctIndex) tooLate.push(id);
  }

  if (tooEarly.length === 0 && tooLate.length === 0) return undefined;
  return { tooEarly, tooLate };
}

export function buildFillBlankFeedback(
  question: Question,
  userAnswer: UserAnswer,
): Record<string, boolean> | undefined {
  if (userAnswer.type !== "fill_blank" || question.type !== "fill_blank") return undefined;
  const blanks = question.blanks ?? [];
  const result: Record<string, boolean> = {};
  for (const blank of blanks) {
    const userValue = (userAnswer.values[blank.id] ?? "").trim().toLowerCase();
    const accepted = blank.acceptedAnswers.map((a) => a.trim().toLowerCase());
    result[blank.id] = accepted.includes(userValue);
  }
  return result;
}

export function buildSortFeedbackMessage(
  question: Question,
  userAnswer: UserAnswer,
): string | undefined {
  const feedback = buildSortFeedback(question, userAnswer);
  if (!feedback) return undefined;
  const parts: string[] = [];
  if (feedback.tooEarly?.length) parts.push("有步骤执行过早");
  if (feedback.tooLate?.length) parts.push("有步骤执行过晚");
  const correct = question.correctAnswer as { itemIds: string[] };
  const labels = new Map(question.sortItems?.map((i) => [i.id, i.title ?? i.text]));
  const correctOrder = correct.itemIds.map((id, i) => `${i + 1}. ${labels.get(id) ?? id}`).join(" → ");
  return `${parts.join("；")}。正确顺序：${correctOrder}`;
}
