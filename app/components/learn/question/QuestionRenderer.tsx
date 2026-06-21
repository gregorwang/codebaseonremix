import type { ComponentType } from "react";
import type { Question, QuestionType, UserAnswer } from "~/lib/learn/types";
import { AiReviewQuestion } from "./AiReviewQuestion";
import { BranchTraceQuestion } from "./BranchTraceQuestion";
import { CodeFixQuestion } from "./CodeFixQuestion";
import { DebugQuestion } from "./DebugQuestion";
import { DiffReviewQuestion } from "./DiffReviewQuestion";
import { FillBlankQuestion } from "./FillBlankQuestion";
import { FreeExplainQuestion } from "./FreeExplainQuestion";
import { LinePickQuestion } from "./LinePickQuestion";
import { MultiChoiceQuestion } from "./MultiChoiceQuestion";
import { PositionJudgementQuestion } from "./PositionJudgementQuestion";
import { ReviewCommentQuestion } from "./ReviewCommentQuestion";
import { SingleChoiceQuestion } from "./SingleChoiceQuestion";
import { SortQuestion } from "./SortQuestion";
import { TrueFalseQuestion } from "./TrueFalseQuestion";
import type { QuestionComponentProps, QuestionFeedback } from "./types";

const RENDERERS: Record<QuestionType, ComponentType<QuestionComponentProps>> = {
  single_choice: SingleChoiceQuestion,
  multi_choice: MultiChoiceQuestion,
  sort: SortQuestion,
  fill_blank: FillBlankQuestion,
  debug: DebugQuestion,
  branch_trace: BranchTraceQuestion,
  position_judgement: PositionJudgementQuestion,
  ai_review: AiReviewQuestion,
  true_false: TrueFalseQuestion,
  line_pick: LinePickQuestion,
  code_fix: CodeFixQuestion,
  diff_review: DiffReviewQuestion,
  review_comment: ReviewCommentQuestion,
  free_explain: FreeExplainQuestion,
};

type QuestionRendererProps = {
  question: Question;
  value: UserAnswer | null;
  onChange: (answer: UserAnswer) => void;
  disabled?: boolean;
  feedback?: QuestionFeedback;
};

export function QuestionRenderer({
  question,
  value,
  onChange,
  disabled,
  feedback,
}: QuestionRendererProps) {
  const Component = RENDERERS[question.type];
  if (!Component) {
    return <p className="text-red-600">未知题型：{question.type}</p>;
  }
  return (
    <Component
      question={question}
      value={value}
      onChange={onChange}
      disabled={disabled}
      feedback={feedback}
    />
  );
}
