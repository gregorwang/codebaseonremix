import { aiChatRequestChainCourse } from "./ai-chat-request-chain";
import { authProtectedTokenFlowCourse } from "./auth-protected-token-flow";
import { enrichSampleCourses } from "./sampleEnrichment";
import { themeGlobalStateCourse } from "./theme-global-state";
import { PROJECT_COURSES_FROM_UNITS } from "./units";
import type { SeedCourseData } from "./types";

export const PROJECT_COURSES: SeedCourseData[] = PROJECT_COURSES_FROM_UNITS;

export const SAMPLE_COURSES: SeedCourseData[] = enrichSampleCourses([
  themeGlobalStateCourse,
  aiChatRequestChainCourse,
  authProtectedTokenFlowCourse,
]);

export const ALL_SEED_COURSES: SeedCourseData[] = [
  ...PROJECT_COURSES,
  ...SAMPLE_COURSES,
];
