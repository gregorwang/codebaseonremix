/** Bump to invalidate all learn public KV snapshots without wildcard delete. */
export const LEARN_CACHE_VERSION = "v15";

export const PUBLIC_CACHE_TTL_SECONDS = 60 * 10;

export function learnCacheKey(...parts: string[]): string {
  return `learn:${LEARN_CACHE_VERSION}:${parts.join(":")}`;
}

export const LEARN_CACHE_KEYS = {
  publicCoursesOverview: () => learnCacheKey("public", "courses-overview"),
  publicExams: () => learnCacheKey("public", "exams"),
  publicAbilityTags: () => learnCacheKey("public", "ability-tags"),
  publicRemixModuleMap: () => learnCacheKey("public", "remix-module-map"),
  courseStructure: (courseSlug: string) =>
    learnCacheKey("course", courseSlug, "structure"),
  lessonQuestionList: (lessonId: string) =>
    learnCacheKey("lesson", lessonId, "question-list"),
  /** 课级 AI 讲解: 第一次有用户点 "AI 讲解" 后写入, 全局共享, 7 天 TTL。 */
  lessonAiTeaching: (lessonId: string) =>
    learnCacheKey("lesson", lessonId, "ai-teaching"),
  /** 课级 AI 思维导图 (Mermaid 源码): 与 lessonAiTeaching 并行, 共用同一个 TTL。 */
  lessonAiDiagram: (lessonId: string) =>
    learnCacheKey("lesson", lessonId, "ai-diagram"),
  /** 文件级"读前导读"(行锚定 JSON, 中性不剧透): 按源码文件路径缓存, 全局共享。 */
  codeOrientation: (filePath: string) =>
    learnCacheKey("orientation", filePath),
} as const;

export const AI_TEACHING_TTL_SECONDS = 60 * 60 * 24 * 7;
