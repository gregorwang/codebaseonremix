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
  /**
   * 题级 AI 讲解: 按 (questionId, answerHash) 缓存, 与 lessonAiTeaching 同 TTL (7 天)。
   * answerHash 由 routes 里 sha1Hex8(JSON.stringify(userAnswer)+sourcePath) 计算,
   * 不含用户身份 — 相同答案的多个用户共享同一份讲解。
   * 用户在 UI 上点"重新生成"时, 前端会传 force=1 跳过本缓存并重新写入。
   */
  aiExplanation: (questionId: string, answerHash: string) =>
    learnCacheKey("question", questionId, "ai-explanation", answerHash),
  /**
   * 新版「源码精读讲义」缓存 (v6, InlineCodeExplainView 用)。
   * - orientation: 与 questionId 无关, 按文件路径全局共享。
   * - explanation: 按 (questionId, answerHash) 缓存, 不写入用户身份。
   *
   * key path 历史:
   *   - code-explain        v4 卡片版 (废弃)
   *   - code-explain-v5     v5a 行号易飘 (废弃)
   *   - code-explain-v5b    v5b 行号前缀 prompt, 仍依赖 AI 自己锚行 (废弃)
   *   - code-explain-v6     v6 AI 在 lines 数组里同步输出代码 + 注释, 行号天然一致 (当前)
   */
  codeExplainOrientation: (filePath: string) =>
    learnCacheKey("code-explain-v6", "orientation", filePath),
  codeExplainAfterAnswer: (questionId: string, answerHash: string) =>
    learnCacheKey(
      "code-explain-v6",
      "after-answer",
      questionId,
      answerHash,
    ),
} as const;

export const AI_TEACHING_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * 给一段字符串算 SHA-1 hex, 取前 8 位。
 * 用于 ai_explanation 缓存键的 answerHash 部分 — 8 位 (~32 bit) 对单个 questionId
 * 下不同答案的去重已经足够, 同时把 key 长度压住。
 */
export async function sha1Hex8(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-1", data);
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < 4; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
