import type { AbilityTag } from "./abilityTags";
import type { AnswerResult, Question, UserAnswer } from "./types";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function buildResult(
  question: Question,
  isCorrect: boolean,
  normalizedUserAnswer: unknown,
  mistakeType?: string,
  needsAiGrading?: boolean,
): AnswerResult {
  return {
    isCorrect,
    normalizedUserAnswer,
    correctAnswer: question.correctAnswer,
    mistakeType,
    explanation: question.explanation,
    abilityTags: question.abilityTags as AbilityTag[],
    needsAiGrading,
  };
}

function checkSingleChoice(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { choiceId: string };
  const answer = userAnswer as { type: "single_choice"; choiceId: string };
  const normalized = { choiceId: answer.choiceId };
  return buildResult(
    question,
    answer.choiceId === correct.choiceId,
    normalized,
  );
}

function checkMultiChoice(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { choiceIds: string[] };
  const answer = userAnswer as { type: "multi_choice"; choiceIds: string[] };
  const normalizedIds = [...answer.choiceIds].sort();
  const correctIds = [...correct.choiceIds].sort();
  return buildResult(question, arraysEqual(normalizedIds, correctIds), {
    choiceIds: normalizedIds,
  });
}

function checkSort(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { itemIds: string[] };
  const answer = userAnswer as { type: "sort"; itemIds: string[] };
  return buildResult(
    question,
    arraysEqual(answer.itemIds, correct.itemIds),
    { itemIds: answer.itemIds },
  );
}

function checkFillBlank(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { values: Record<string, string> };
  const answer = userAnswer as { type: "fill_blank"; values: Record<string, string> };
  const blanks = question.blanks ?? [];
  const normalized: Record<string, string> = {};

  let isCorrect = blanks.length > 0;
  for (const blank of blanks) {
    const userValue = answer.values[blank.id] ?? "";
    const normalizedValue = normalizeText(userValue);
    normalized[blank.id] = normalizedValue;
    const accepted = blank.acceptedAnswers.map(normalizeText);
    if (!accepted.includes(normalizedValue)) {
      isCorrect = false;
    }
  }

  if (blanks.length === 0 && Object.keys(correct.values).length > 0) {
    isCorrect = Object.entries(correct.values).every(
      ([key, value]) => normalized[key] === normalizeText(value),
    );
  }

  return buildResult(question, isCorrect, { values: normalized });
}

function checkDebug(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { issueId: string };
  const answer = userAnswer as { type: "debug"; issueId: string };
  return buildResult(
    question,
    answer.issueId === correct.issueId,
    { issueId: answer.issueId },
  );
}

function checkBranchTrace(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { pathIds: string[] };
  const answer = userAnswer as { type: "branch_trace"; pathIds: string[] };
  return buildResult(
    question,
    arraysEqual(answer.pathIds, correct.pathIds),
    { pathIds: answer.pathIds },
  );
}

function checkPositionJudgement(
  question: Question,
  userAnswer: UserAnswer,
): AnswerResult {
  const correct = question.correctAnswer as { positionId: string };
  const answer = userAnswer as { type: "position_judgement"; positionId: string };
  return buildResult(
    question,
    answer.positionId === correct.positionId,
    { positionId: answer.positionId },
  );
}

function checkAiReview(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as {
    choiceId?: string;
    keywords?: string[];
    riskIds?: string[];
  };
  const answer = userAnswer as {
    type: "ai_review";
    choiceId?: string;
    keywords?: string[];
    riskIds?: string[];
  };

  const hasChoice = !!correct.choiceId;
  const hasRisks = !!(correct.riskIds && correct.riskIds.length > 0);
  const hasKeywords = !!(correct.keywords && correct.keywords.length > 0);

  // No structured criteria → this is an open-ended AI review. We can't
  // grade it locally; defer to the AI explanation flow. Importantly,
  // do NOT default to isCorrect=true (the old behaviour, which marked
  // every submission "回答正确" regardless of content).
  if (!hasChoice && !hasRisks && !hasKeywords) {
    return buildResult(
      question,
      false,
      {
        choiceId: answer.choiceId,
        keywords: answer.keywords,
        riskIds: answer.riskIds,
      },
      undefined,
      true, // needsAiGrading
    );
  }

  // Structured criteria present → grade strictly. Start from `true` only
  // because the loop below intersects with each criterion; if any criterion
  // is missing or wrong, isCorrect collapses to false.
  let isCorrect = true;

  if (hasChoice) {
    isCorrect = answer.choiceId === correct.choiceId;
  }

  if (hasRisks) {
    const userRisks = [...(answer.riskIds ?? [])].sort();
    const expectedRisks = [...(correct.riskIds ?? [])].sort();
    isCorrect = isCorrect && arraysEqual(userRisks, expectedRisks);
  }

  if (hasKeywords) {
    const userText = (answer.keywords ?? []).join(" ").toLowerCase();
    const matched = (correct.keywords ?? []).every((keyword) =>
      userText.includes(keyword.toLowerCase()),
    );
    isCorrect = isCorrect && matched;
  }

  return buildResult(
    question,
    isCorrect,
    {
      choiceId: answer.choiceId,
      keywords: answer.keywords,
      riskIds: answer.riskIds,
    },
    isCorrect ? undefined : "ai_review_error",
  );
}

function checkTrueFalse(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { value: boolean };
  const answer = userAnswer as { type: "true_false"; value: boolean };
  return buildResult(
    question,
    answer.value === correct.value,
    { value: answer.value },
    answer.value !== correct.value ? "true_false_wrong" : undefined,
  );
}

function checkLinePick(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { lineId: string };
  const answer = userAnswer as { type: "line_pick"; lineId: string };
  const isCorrect = !!answer.lineId && answer.lineId === correct.lineId;
  return buildResult(
    question,
    isCorrect,
    { lineId: answer.lineId ?? "" },
    isCorrect ? undefined : "line_pick_wrong",
  );
}

function checkCodeFix(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { patchedCode: string };
  const answer = userAnswer as { type: "code_fix"; patchedCode: string };
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  const isCorrect =
    !!answer.patchedCode &&
    normalize(answer.patchedCode) === normalize(correct.patchedCode);
  return buildResult(
    question,
    isCorrect,
    { patchedCode: answer.patchedCode ?? "" },
    isCorrect ? undefined : "code_fix_wrong",
  );
}

function checkDiffReview(question: Question, userAnswer: UserAnswer): AnswerResult {
  const correct = question.correctAnswer as { verdict: "accept" | "reject"; reason: string };
  const answer = userAnswer as {
    type: "diff_review";
    verdict: "accept" | "reject";
    reason: string;
  };
  // Verdict must match; reason is graded by AI later (Phase 7), so we accept any non-empty reason.
  const isCorrect = answer.verdict === correct.verdict;
  return buildResult(
    question,
    isCorrect,
    { verdict: answer.verdict, reason: answer.reason ?? "" },
    isCorrect ? undefined : "diff_review_verdict_wrong",
  );
}

function checkReviewComment(question: Question, userAnswer: UserAnswer): AnswerResult {
  const answer = userAnswer as { type: "review_comment"; comment: string };
  const submitted = typeof answer.comment === "string" && answer.comment.trim().length > 0;
  // Free-form: there's no rule that can decide if a PR review comment is
  // good. We only check that the user actually wrote something; AI does
  // the substantive grading later. Don't auto-mark "回答正确" — flag it as
  // awaiting AI grading instead.
  return buildResult(
    question,
    false,
    { comment: answer.comment ?? "" },
    submitted ? undefined : "review_comment_empty",
    submitted, // needsAiGrading
  );
}

function checkFreeExplain(question: Question, userAnswer: UserAnswer): AnswerResult {
  const answer = userAnswer as { type: "free_explain"; text: string };
  const submitted = typeof answer.text === "string" && answer.text.trim().length > 0;
  // Same as review_comment — non-empty submissions go into the "awaiting
  // AI grading" bucket rather than being auto-marked correct.
  return buildResult(
    question,
    false,
    { text: answer.text ?? "" },
    submitted ? undefined : "free_explain_empty",
    submitted, // needsAiGrading
  );
}

export function checkAnswer(question: Question, userAnswer: UserAnswer): AnswerResult {
  if (userAnswer.type !== question.type) {
    return buildResult(question, false, userAnswer);
  }

  switch (question.type) {
    case "single_choice":
      return checkSingleChoice(question, userAnswer);
    case "multi_choice":
      return checkMultiChoice(question, userAnswer);
    case "sort":
      return checkSort(question, userAnswer);
    case "fill_blank":
      return checkFillBlank(question, userAnswer);
    case "debug":
      return checkDebug(question, userAnswer);
    case "branch_trace":
      return checkBranchTrace(question, userAnswer);
    case "position_judgement":
      return checkPositionJudgement(question, userAnswer);
    case "ai_review":
      return checkAiReview(question, userAnswer);
    case "true_false":
      return checkTrueFalse(question, userAnswer);
    case "line_pick":
      return checkLinePick(question, userAnswer);
    case "code_fix":
      return checkCodeFix(question, userAnswer);
    case "diff_review":
      return checkDiffReview(question, userAnswer);
    case "review_comment":
      return checkReviewComment(question, userAnswer);
    case "free_explain":
      return checkFreeExplain(question, userAnswer);
    default:
      return buildResult(question, false, userAnswer);
  }
}
