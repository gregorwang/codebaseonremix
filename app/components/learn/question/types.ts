import type { Question, UserAnswer } from "~/lib/learn/types";

export type QuestionFeedback = {
  fillBlank?: Record<string, boolean>;
  sort?: { tooEarly?: string[]; tooLate?: string[] };
};

export type QuestionComponentProps = {
  question: Question;
  value: UserAnswer | null;
  onChange: (answer: UserAnswer) => void;
  disabled?: boolean;
  feedback?: QuestionFeedback;
};
