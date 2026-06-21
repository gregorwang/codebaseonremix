import type { SeedLessonData } from "../types";
import {
  NEMESIS_CHAIN_TEACHING,
  nemesisChainQuestions,
} from "./pilot/site18-nemesis-chain";
import {
  ROOT_LOADER_TEACHING,
  rootLoaderQuestions,
} from "./pilot/site02-root-loader";

/** Pilot lesson overrides: richer teaching + 8 mixed questions */
export const PILOT_LESSON_OVERRIDES: Record<
  string,
  Pick<SeedLessonData, "teachingBlocks" | "questions" | "learningGoal" | "lessonMeta">
> = {
  "site-02-root-shell/root-loader": {
    learningGoal: "能解释 root loader 为何是 theme/session 的全局入口，并识别 AI 局部补丁风险。",
    teachingBlocks: ROOT_LOADER_TEACHING,
    lessonMeta: {
      estimatedQuestionCount: 8,
      trainingFocus: ["root loader", "theme/session", "匿名优化", "AI 评审"],
    },
    questions: rootLoaderQuestions(),
  },
  "site-18-nemesis-api-chain/api-entry": {
    learningGoal: "能按正确顺序说出 Nemesis action 守门链，并评审 AI 生成的危险改法。",
    teachingBlocks: NEMESIS_CHAIN_TEACHING,
    lessonMeta: {
      estimatedQuestionCount: 8,
      trainingFocus: ["auth", "validate", "rate limit", "AI Gateway"],
    },
    questions: nemesisChainQuestions(),
  },
};
