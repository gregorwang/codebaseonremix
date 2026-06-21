import type { CreateQuestionInput } from "~/lib/learn/types";
import { SNIPPETS } from "../snippets";
import { q } from "../types";
import type { LessonSpec } from "./factory";

type Q = Omit<CreateQuestionInput, "lessonId">;

function base(lesson: LessonSpec, orderIndex: number) {
  return {
    abilityTags: lesson.abilityTags,
    sourceFilePath: lesson.path,
    sourceNote: lesson.summary,
    orderIndex,
  };
}

function isBackendLesson(lesson: LessonSpec): boolean {
  return /loader|action|api\.|auth|guard|nemesis|db\.server|migrations/i.test(
    `${lesson.path} ${lesson.slug}`,
  );
}

const AI_RISK = [
  { id: "local_patch", label: "局部补丁冒充全局方案" },
  { id: "architecture_boundary", label: "破坏现有架构边界" },
  { id: "loader_action_mix", label: "loader/action 职责混淆" },
];

/** Rich lesson pack: 8 mixed questions with real code patterns */
export function packRich(lesson: LessonSpec, courseSlug: string): Q[] {
  const b = (i: number) => base(lesson, i);
  const path = lesson.path;
  const useBranch = isBackendLesson(lesson);
  const codeSnippet = `// remix/${path}\n// ${lesson.summary}\nexport async function handler() {\n  return {{ret}}({ ok: true });\n}`;

  const sixth: Q = useBranch
    ? q({
        ...b(5),
        type: "branch_trace",
        title: `${lesson.title} · 请求分支`,
        prompt: `在 remix/${path} 流程中，校验失败时应如何分支？`,
        branchScenario: `调用 remix/${path} 但参数不合法`,
        options: [
          { id: "enter", text: "进入 handler/action" },
          { id: "validate", text: "执行字段/权限校验" },
          { id: "fail", text: "校验失败，立即 return 4xx" },
        ],
        correctAnswer: { pathIds: ["enter", "validate", "fail"] },
        explanation: {
          short: "fail fast，不要带着坏数据继续执行。",
          realProjectNote: `remix/${path}`,
        },
        abilityTags: lesson.abilityTags,
      })
    : q({
        ...b(5),
        type: "position_judgement",
        title: `${lesson.title} · 代码位置`,
        prompt: `实现「${lesson.focus}」时，代码应主要落在哪？`,
        options: [
          {
            id: "anchor",
            text: `${path} 及同模块邻接文件`,
            locationHint: `remix/${path}`,
          },
          { id: "random", text: "随意新建无关 utils", locationHint: "lib/" },
          { id: "public", text: "public/ 静态资源", locationHint: "public/" },
          { id: "pkg", text: "仅改 package.json", locationHint: "root" },
        ],
        correctAnswer: { positionId: "anchor" },
        explanation: { short: "改功能先找锚点文件。", realProjectNote: `remix/${path}` },
        abilityTags: ["code.position.handler", ...lesson.abilityTags],
      });

  return [
    q({
      ...b(0),
      type: "single_choice",
      title: `${lesson.title} · 核心概念`,
      prompt: `关于 remix/${path}，哪项最准确？`,
      code: `// remix/${path}\n// ${lesson.focus}`,
      options: [
        { id: "a", text: lesson.focus },
        { id: "b", text: "仅负责静态资源 CDN 配置" },
        { id: "c", text: "只在开发环境存在" },
        { id: "d", text: "与 Worker 无关" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: { short: lesson.summary, realProjectNote: `remix/${path}` },
      abilityTags: lesson.abilityTags,
    }),
    q({
      ...b(1),
      type: "multi_choice",
      title: `${lesson.title} · 影响范围`,
      prompt: `修改 remix/${path} 时，通常还要留意哪些关联？（多选）`,
      options: [
        { id: "caller", text: "调用方/导入方路由或组件" },
        { id: "types", text: "同目录类型定义与导出" },
        { id: "unrelated", text: "完全无关的 migrations SQL" },
        { id: "tests", text: "同功能链上的 server util" },
      ],
      correctAnswer: { choiceIds: ["caller", "types", "tests"] },
      explanation: { short: "全栈改动看上下游。", realProjectNote: lesson.summary },
      abilityTags: ["project.modify.fullstack", ...lesson.abilityTags],
    }),
    q({
      ...b(2),
      type: "sort",
      title: `${lesson.title} · 阅读顺序`,
      prompt: `理解 remix/${path} 的推荐步骤：`,
      sortItems: [
        { id: "1", text: `打开 remix/${path}`, title: "定位", category: "frontend" },
        { id: "2", text: "阅读导出符号", title: "读签名", category: "frontend" },
        { id: "3", text: lesson.focus, title: "抓重点", category: "frontend" },
        { id: "4", text: "对照调用方验证", title: "验证", category: "frontend" },
      ],
      correctAnswer: { itemIds: ["1", "2", "3", "4"] },
      explanation: { short: "先读后关联。", realProjectNote: `remix/${path}` },
      abilityTags: lesson.abilityTags,
    }),
    q({
      ...b(3),
      type: "fill_blank",
      title: `${lesson.title} · 代码填空`,
      prompt: `补全 remix/${path} 中的返回语句：`,
      code: codeSnippet,
      blanks: [{ id: "ret", placeholder: "函数", acceptedAnswers: ["json", "Response"] }],
      correctAnswer: { values: { ret: "json" } },
      explanation: {
        short: "React Router 常用 json() 返回数据。",
        realProjectNote: `课程 ${courseSlug}`,
      },
      abilityTags: ["bridge.reactRouter.loader", ...lesson.abilityTags],
    }),
    q({
      ...b(4),
      type: "debug",
      title: `${lesson.title} · 纠错`,
      prompt: `以下改法可能导致「${lesson.title}」异常，原因是？`,
      code: `// 错误：在错误层级实现\n// 应在 remix/${path}\n// 实际改到了无关组件`,
      debugMeta: { suspiciousLineStart: 1, suspiciousLineEnd: 3, scenario: "代码审查" },
      options: [
        { id: "logic", text: `职责放错文件，应回到 remix/${path}` },
        { id: "css", text: "Tailwind 拼写错误" },
        { id: "dns", text: "DNS 失败" },
        { id: "gpu", text: "WebGL 丢失" },
      ],
      correctAnswer: { issueId: "logic" },
      explanation: { short: "先核对锚点文件。", realProjectNote: lesson.summary },
      abilityTags: lesson.abilityTags,
    }),
    sixth,
    q({
      ...b(6),
      type: "ai_review",
      title: `${lesson.title} · 改造评审`,
      prompt: `若要改「${lesson.focus}」，哪种改法更靠谱？`,
      code: SNIPPETS.mainPanelWrongDark,
      options: [
        { id: "a", text: `${path} + 同链路邻接文件，并补守门/错误处理` },
        { id: "b", text: "只改 README" },
        { id: "c", text: "仅改 CSS 颜色" },
        { id: "d", text: "删除 api.nemesis" },
      ],
      correctAnswer: { choiceId: "a", riskIds: ["architecture_boundary"] },
      aiReviewMeta: { riskTypeOptions: AI_RISK },
      explanation: {
        short: "全栈改造从锚点扩散。",
        aiReviewNote: "只改局部文件看似快，但容易漏掉守门与全局影响。",
        realProjectNote: `课程 ${courseSlug} · remix/${path}`,
      },
      abilityTags: ["ai.review.architecture", "project.modify.fullstack"],
    }),
    q({
      ...b(7),
      type: "single_choice",
      title: `${lesson.title} · 迁移思考`,
      prompt: `如果以后要扩展「${lesson.focus}」，第一步应该做什么？`,
      options: [
        { id: "read", text: `重读 remix/${path} 及调用链，确认影响范围` },
        { id: "ai", text: "直接让 AI 改 CSS" },
        { id: "db", text: "先改 D1 schema" },
        { id: "skip", text: "跳过阅读，靠猜" },
      ],
      correctAnswer: { choiceId: "read" },
      explanation: {
        short: "真实项目接管从读代码开始。",
        realProjectNote: `remix/${path}`,
      },
      abilityTags: ["project.modify.fullstack"],
    }),
  ];
}

export function ensureEightQuestions(questions: Q[], lesson?: LessonSpec): Q[] {
  const normalized = questions.map((question, orderIndex) => ({ ...question, orderIndex }));
  if (normalized.length >= 8 || !lesson) return normalized;

  return [
    ...normalized,
    q({
      sourceFilePath: lesson.path,
      sourceNote: lesson.summary,
      orderIndex: normalized.length,
      type: "single_choice",
      title: `${lesson.title} · 迁移思考`,
      prompt: `扩展「${lesson.focus}」前，第一步应该？`,
      options: [
        { id: "read", text: `重读 remix/${lesson.path} 及调用链` },
        { id: "ai", text: "直接让 AI 改 CSS" },
        { id: "skip", text: "跳过阅读靠猜" },
        { id: "db", text: "先改 D1 schema" },
      ],
      correctAnswer: { choiceId: "read" },
      explanation: {
        short: "真实项目接管从读代码开始。",
        realProjectNote: `remix/${lesson.path}`,
      },
      abilityTags: ["project.modify.fullstack", ...lesson.abilityTags],
    }),
  ];
}
