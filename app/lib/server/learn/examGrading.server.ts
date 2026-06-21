import type { AbilityTag } from "~/lib/learn/abilityTags";
import { checkAnswer } from "~/lib/learn/questionCheck";
import type {
  Exam,
  ExamTask,
  Question,
  UserAnswer,
} from "~/lib/learn/types";
import type { AbilityTag as AbilityTagType } from "~/lib/learn/abilityTags";

export type ExamTaskFeedback = {
  taskId: string;
  questionId?: string;
  isCorrect: boolean;
  mistakeType?: string;
};

export type ExamGradeFeedback = {
  tasks: ExamTaskFeedback[];
  summary: string;
};

export type ExamGradeResult = {
  score: number;
  isPassed: boolean;
  weakAbilities: AbilityTagType[];
  feedback: ExamGradeFeedback;
};

export function gradeExamSubmission(params: {
  exam: Exam;
  questions: Question[];
  answers: Record<string, UserAnswer | undefined>;
}): ExamGradeResult {
  const { exam, questions, answers } = params;
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const taskFeedbacks: ExamTaskFeedback[] = [];
  const weakAbilitySet = new Set<AbilityTagType>();

  let earnedWeight = 0;
  let totalWeight = 0;

  for (const task of exam.tasks) {
    const weight = task.weight > 0 ? task.weight : 1;
    totalWeight += weight;

    const question = task.questionId
      ? questionById.get(task.questionId)
      : undefined;

    if (!question) {
      taskFeedbacks.push({
        taskId: task.id,
        questionId: task.questionId,
        isCorrect: false,
      });
      continue;
    }

    const userAnswer = answers[task.id];
    if (!userAnswer) {
      taskFeedbacks.push({
        taskId: task.id,
        questionId: task.questionId,
        isCorrect: false,
      });
      for (const tag of question.abilityTags) {
        weakAbilitySet.add(tag);
      }
      continue;
    }

    const result = checkAnswer(question, userAnswer);
    if (result.isCorrect) {
      earnedWeight += weight;
    } else {
      for (const tag of question.abilityTags) {
        weakAbilitySet.add(tag);
      }
    }

    taskFeedbacks.push({
      taskId: task.id,
      questionId: task.questionId,
      isCorrect: result.isCorrect,
      mistakeType: result.mistakeType,
    });
  }

  const score =
    totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 1000) / 10 : 0;
  const correctCount = taskFeedbacks.filter((t) => t.isCorrect).length;
  const isPassed = score >= exam.passingScore;

  return {
    score,
    isPassed,
    weakAbilities: [...weakAbilitySet],
    feedback: {
      tasks: taskFeedbacks,
      summary: `答对 ${correctCount}/${exam.tasks.length} 题，得分 ${score}（及格线 ${exam.passingScore}）`,
    },
  };
}

export function buildExamTasksFromQuestions(
  tasks: ExamTask[],
  questions: Question[],
): Array<ExamTask & { question?: Question }> {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  return tasks.map((task) => ({
    ...task,
    question: task.questionId ? questionById.get(task.questionId) : undefined,
  }));
}
