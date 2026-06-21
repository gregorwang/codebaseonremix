import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { ExamBriefing } from "~/lib/learn/types";
import type { SeedExamTaskRef } from "./examTypes";

export type { SeedExamTaskRef } from "./examTypes";

/**
 * Reference N consecutive questions from a single exam-pool lesson.
 * Used by the 4 major exams below.
 */
export function examRefs(lessonSlug: string, count: number): SeedExamTaskRef[] {
  return Array.from({ length: count }, (_, questionIndex) => ({
    courseSlug: "site-exam-bank",
    lessonSlug,
    questionIndex,
    weight: 1,
  }));
}

/**
 * Build a small-unit (8 题) taskRef that **points into a major-exam lesson**
 * rather than into its own per-unit lesson. The exam pool stops storing
 * duplicate questions; the small unit exams are pure views over the major
 * lesson's question list.
 *
 *   exam-unit-1 → exam-units-1-2 questions [0..7]
 *   exam-unit-2 → exam-units-1-2 questions [2..9]
 *   exam-unit-3 → exam-units-3-4 questions [0..7]
 *   …
 *
 * Even & odd small exams pick disjoint slices so they don't overlap with
 * each other when both shown to the same user.
 */
function unitExamTaskRefs(unit: number): SeedExamTaskRef[] {
  const majorRange =
    unit <= 2 ? "1-2" : unit <= 4 ? "3-4" : unit <= 6 ? "5-6" : "7-8";
  const lessonSlug = `exam-units-${majorRange}`;
  // Each major lesson now has 10 questions (8 base + 2 unit-tagged extras).
  // Even units start at 0; odd-of-pair starts at 2 to give a different slice.
  const startIndex = unit % 2 === 1 ? 0 : 2;
  return Array.from({ length: 8 }, (_, i) => ({
    courseSlug: "site-exam-bank",
    lessonSlug,
    questionIndex: startIndex + i,
    weight: 1,
  }));
}

const briefing12: ExamBriefing = {
  taskBackground:
    "你要在真实 Remix 项目中接管「全站主题 + App Shell」改造。AI 可能只改局部容器，你需要判断影响范围与正确落点。",
  targetOutcome: "能说明 theme 如何从 cookie → root loader → Layout → 全站生效，并识别局部补丁风险。",
  involvedFiles: ["remix/app/root.tsx", "remix/app/utils/theme.server.ts", "remix/app/components/Header.tsx"],
  impactScope: ["<html> theme class", "root action Set-Cookie", "Header 切换按钮", "防闪烁内联脚本"],
  recapPrompt: "画出一次主题切换从点击到全站更新的完整链路。",
};

const briefing34: ExamBriefing = {
  taskBackground: "路由与页面边界决定代码应落在 route 还是 client 组件。",
  targetOutcome: "能根据 URL 定位 routes 文件，并解释 chat 等页面为何需要 client 边界。",
  involvedFiles: ["remix/app/routes/", "remix/app/components/"],
  impactScope: ["文件系统路由", "嵌套 layout", "ClientOnly 边界", "SSR 不可用的浏览器 API"],
  recapPrompt: "说明 chat 页为何不能把 fetch 流式回复写在 loader。",
};

const briefing56: ExamBriefing = {
  taskBackground: "前后端数据桥与事件链：从 Header 点击到 api.nemesis 返回。",
  targetOutcome: "能追踪聊天发送链，并坚持 loader 只读、写入走 action/client。",
  involvedFiles: ["remix/app/routes/api.nemesis.ts", "remix/app/hooks/useNemesisChat.client.ts"],
  impactScope: ["useState 事件链", "fetch POST", "SSE 解析", "loader/action 职责"],
  recapPrompt: "排列用户点击发送到 UI 更新的前端步骤。",
};

const briefing78: ExamBriefing = {
  taskBackground: "认证、Nemesis 守门与 D1 毕业改造——服务端必须独立守门。",
  targetOutcome: "能说出 Nemesis 守门顺序，并评审缺 auth/限流的 AI 改法。",
  involvedFiles: [
    "remix/app/routes/api.nemesis.ts",
    "remix/app/services/nemesis-guard.server.ts",
    "remix/migrations/",
  ],
  impactScope: ["session cookie", "requireNemesisUser", "rate limit", "D1 写入资格"],
  recapPrompt: "未登录 POST /api/nemesis 会走哪些分支？",
};

export const PROJECT_MAJOR_EXAMS = [
  {
    slug: "exam-units-1-2",
    courseSlug: "site-exam-bank",
    title: "大关：项目地图与 App Shell 改造",
    description: "混合题型：主题全局状态、root shell、entry、错误边界、AI 局部补丁识别。",
    scenario: "说明 theme 如何贯穿 root loader/action，并完成一次「项目改造大关」自测。",
    briefing: briefing12,
    passingScore: 80,
    difficulty: "intermediate" as const,
    abilityTags: ["frontend.state.global", "bridge.reactRouter.action", "ai.review.architecture"] as AbilityTag[],
    origin: "project" as const,
    isPublished: true,
    taskRefs: examRefs("exam-units-1-2", 10),
  },
  {
    slug: "exam-units-3-4",
    courseSlug: "site-exam-bank",
    title: "大关：路由结构与页面边界",
    description: "混合题型：文件路由、嵌套 layout、客户端边界、内容页定位。",
    scenario: "根据 URL 定位 routes，并说明 client 组件边界。",
    briefing: briefing34,
    passingScore: 80,
    difficulty: "intermediate" as const,
    abilityTags: ["code.position.handler", "frontend.state.local", "ai.review.architecture"] as AbilityTag[],
    origin: "project" as const,
    isPublished: true,
    taskRefs: examRefs("exam-units-3-4", 10),
  },
  {
    slug: "exam-units-5-6",
    courseSlug: "site-exam-bank",
    title: "大关：组件交互与 loader/action 数据桥",
    description: "混合题型：Header、hook 状态、loader/action 读写链。",
    scenario: "追踪聊天发送到 api.nemesis，并说明 loader 只读约定。",
    briefing: briefing56,
    passingScore: 80,
    difficulty: "intermediate" as const,
    abilityTags: ["frontend.event.submit", "bridge.reactRouter.loader", "bridge.reactRouter.action"] as AbilityTag[],
    origin: "project" as const,
    isPublished: true,
    taskRefs: examRefs("exam-units-5-6", 10),
  },
  {
    slug: "exam-units-7-8",
    courseSlug: "site-exam-bank",
    title: "大关：认证、Nemesis 与 D1 毕业改造",
    description: "混合题型：auth、guard、SSE/Gateway、D1 综合改造。",
    scenario: "描述 Nemesis 守门顺序与 AI Gateway 密钥隔离。",
    briefing: briefing78,
    passingScore: 80,
    difficulty: "advanced" as const,
    abilityTags: ["backend.auth.required", "ai.review.architecture", "project.modify.fullstack"] as AbilityTag[],
    origin: "project" as const,
    isPublished: true,
    taskRefs: examRefs("exam-units-7-8", 10),
  },
];

const UNIT_EXAM_TITLES: Record<number, string> = {
  1: "小考：仓库地图与运行环境",
  2: "小考：Root Shell 与主题链",
  3: "小考：Entry Server 与 SSR",
  4: "小考：主题系统与错误边界",
  5: "小考：文件路由与嵌套布局",
  6: "小考：内容页与客户端边界",
  7: "小考：组件交互与前端状态",
  8: "小考：loader/action 与数据流",
};

/**
 * Small unit exams. They share question pools with their parent major exam
 * via `unitExamTaskRefs(unit)` — the question rows live in the major-exam
 * lesson and are referenced here through `exams.tasks_json`.
 */
export const PROJECT_UNIT_EXAMS = [1, 2, 3, 4, 5, 6, 7, 8].map((unit) => ({
  slug: `exam-unit-${unit}`,
  courseSlug: "site-exam-bank",
  title: UNIT_EXAM_TITLES[unit] ?? `单元 ${unit} 能力小考`,
  description: `单元 ${unit} 混合题型小考（8 题），训练真实代码定位与执行链。`,
  scenario: `快速检验单元 ${unit} 核心代码能力——不是刷选择题，而是模拟项目改造判断。`,
  passingScore: 70,
  difficulty: (unit <= 2 ? "beginner" : unit <= 6 ? "intermediate" : "advanced") as "beginner" | "intermediate" | "advanced",
  abilityTags: ["code.position.handler", "project.modify.fullstack"] as AbilityTag[],
  origin: "project" as const,
  isPublished: true,
  taskRefs: unitExamTaskRefs(unit),
}));
