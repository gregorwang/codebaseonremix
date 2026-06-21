import type { CreateQuestionInput, TeachingBlock } from "~/lib/learn/types";
import { SNIPPETS } from "../../snippets";
import { q } from "../../types";

type Q = Omit<CreateQuestionInput, "lessonId">;

const AI_RISK_OPTIONS = [
  { id: "local_patch", label: "局部补丁冒充全局方案" },
  { id: "missing_session", label: "漏掉 session" },
  { id: "client_server_mix", label: "客户端/服务端状态混淆" },
  { id: "architecture_boundary", label: "破坏现有架构边界" },
];

export const ROOT_LOADER_TEACHING: TeachingBlock[] = [
  {
    type: "concept",
    title: "为什么 root loader 是全局状态入口？",
    content:
      "root.tsx 的 loader 在每次文档请求时运行，负责把全站都要用的数据注入 React 树。主题、公开 session 信息都属于「读一次、全站用」的数据。",
    keyPoints: [
      "root 是 Remix/React Router 应用的外壳，侧边栏、主内容区、弹窗都挂在它下面。",
      "黑夜模式影响全站，因此不能只在 MainPanel 里 useState。",
      "如果 AI 只改右侧容器，说明它把全局需求误判成局部补丁。",
    ],
  },
  {
    type: "code_walkthrough",
    title: "root loader 如何读取 theme 与 session",
    sourceFilePath: "app/root.tsx",
    code: SNIPPETS.rootLoader,
    highlights: [
      {
        lineStart: 2,
        lineEnd: 2,
        label: "theme cookie",
        explanation: "getTheme 从 cookie 读取全站主题，供 Layout 挂到 <html>。",
      },
      {
        lineStart: 3,
        lineEnd: 5,
        label: "session 守门",
        explanation: "只有存在 auth cookie 时才读 session，避免匿名请求打 D1。",
      },
    ],
  },
  {
    type: "flow",
    title: "root loader 数据流",
    steps: [
      { id: "1", title: "请求进入 root loader", description: "每次页面导航/刷新都会执行" },
      { id: "2", title: "读取 theme cookie", description: "getTheme(request)" },
      { id: "3", title: "条件读取 session", description: "有 auth cookie 才 getSessionCached" },
      { id: "4", title: "返回 json", description: "Layout 与子路由通过 useLoaderData 消费" },
    ],
  },
  {
    type: "checkpoint",
    title: "主动回忆",
    prompt: "匿名访客访问首页时，root loader 会不会读 D1 session？为什么？",
  },
];

export function rootLoaderQuestions(): Q[] {
  return [
    q({
      type: "single_choice",
      title: "root loader 的职责",
      prompt: "root loader 最主要负责什么？",
      options: [
        { id: "a", text: "为全站注入 theme、session 等 shell 级数据" },
        { id: "b", text: "只负责 Nemesis 聊天 API" },
        { id: "c", text: "只渲染 CSS" },
        { id: "d", text: "写 D1 迁移" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: {
        short: "root loader 提供全站 shell 数据。",
        detail: "子路由 loader 只应关心页面局部数据，全局主题/session 在 root。",
        realProjectNote: "remix/app/root.tsx loader",
      },
      abilityTags: ["bridge.reactRouter.loader", "frontend.state.global"],
      orderIndex: 0,
    }),
    q({
      type: "multi_choice",
      title: "修改 root loader 的影响",
      prompt: "改动 root loader 返回字段，可能影响哪些区域？（多选）",
      options: [
        { id: "layout", text: "Layout / <html> theme class" },
        { id: "header", text: "Header 登录态展示" },
        { id: "nemesis", text: "Nemesis 模型列表选择逻辑" },
        { id: "child", text: "所有 useRouteLoaderData('root') 的子组件" },
      ],
      correctAnswer: { choiceIds: ["layout", "header", "child"] },
      explanation: {
        short: "root 数据是全局广播。",
        realProjectNote: "改 loader 字段要同步检查 Layout 与消费方。",
      },
      abilityTags: ["frontend.state.global", "project.modify.fullstack"],
      orderIndex: 1,
    }),
    q({
      type: "sort",
      title: "root loader 执行链",
      prompt: "排列 root loader 读取数据的合理顺序：",
      code: SNIPPETS.rootLoader,
      sortItems: [
        { id: "1", text: "getTheme(request)", title: "读主题", category: "backend", description: "从 cookie 解析 theme" },
        { id: "2", text: "检查 auth cookie", title: "守门", category: "backend", description: "requestHasAuthSessionCookie" },
        { id: "3", text: "getSessionCached(request)", title: "读 session", category: "database", description: "仅有 cookie 时读 D1" },
        { id: "4", text: "return json({ theme, session })", title: "返回", category: "backend", description: "注入 React 树" },
      ],
      correctAnswer: { itemIds: ["1", "2", "3", "4"] },
      explanation: { short: "先廉价读取，再条件访问 D1。", realProjectNote: "remix/app/root.tsx" },
      abilityTags: ["bridge.reactRouter.loader"],
      orderIndex: 2,
    }),
    q({
      type: "fill_blank",
      title: "session 条件读取",
      prompt: "补全 root loader 中的 session 读取：",
      code: `const session = requestHasAuthSessionCookie(request)
  ? await {{sessionFn}}(request)
  : null`,
      blanks: [{ id: "sessionFn", placeholder: "函数名", acceptedAnswers: ["getSessionCached"] }],
      correctAnswer: { values: { sessionFn: "getSessionCached" } },
      explanation: {
        short: "有 cookie 才读 session。",
        detail: "避免匿名流量触发无意义的 Better Auth / D1 查询。",
        realProjectNote: SNIPPETS.authSessionSkip,
      },
      abilityTags: ["backend.session.cookie"],
      orderIndex: 3,
    }),
    q({
      type: "debug",
      title: "匿名也读 session 的性能问题",
      prompt: "AI 建议在 root loader 里无条件 await getSessionCached(request)。问题？",
      code: `export const loader = async ({ request }) => {
  const theme = await getTheme(request);
  const session = await getSessionCached(request); // 每个匿名请求都读 D1
  return json({ theme, session });
}`,
      debugMeta: { suspiciousLineStart: 3, suspiciousLineEnd: 3, scenario: "性能优化审查" },
      options: [
        { id: "perf", text: "匿名请求不应触发 session 读取，应先检查 auth cookie" },
        { id: "ok", text: "完全正确，越读越安全" },
        { id: "theme", text: "应该先读 theme" },
        { id: "css", text: "Tailwind 冲突" },
      ],
      correctAnswer: { issueId: "perf" },
      explanation: {
        short: "session 读取要有守门。",
        commonMistake: "把「安全」理解成每个请求都查数据库。",
        realProjectNote: "真实项目在 requestHasAuthSessionCookie 后才读 session。",
      },
      abilityTags: ["backend.session.cookie"],
      orderIndex: 4,
    }),
    q({
      type: "position_judgement",
      title: "theme 状态应放在哪",
      prompt: "持久化 theme 并供全站使用，核心逻辑应主要在哪？",
      options: [
        { id: "root", text: "root loader/action + theme.server.ts", locationHint: "app/root.tsx" },
        { id: "panel", text: "MainPanel useState", locationHint: "components/" },
        { id: "css", text: "public/theme.css", locationHint: "static/" },
        { id: "api", text: "api.nemesis.ts", locationHint: "routes/" },
      ],
      correctAnswer: { positionId: "root" },
      explanation: {
        short: "全局主题在 root + theme.server。",
        realProjectNote: "remix/app/utils/theme.server.ts",
      },
      abilityTags: ["code.position.handler", "frontend.state.global"],
      orderIndex: 5,
    }),
    q({
      type: "branch_trace",
      title: "匿名访客分支",
      prompt: "匿名用户首次打开首页，root loader 路径：",
      branchScenario: "GET / 无 auth cookie",
      options: [
        { id: "enter", text: "进入 root loader" },
        { id: "theme", text: "getTheme 返回 light/dark" },
        { id: "skip", text: "跳过 getSessionCached，session=null" },
        { id: "json", text: "return json({ theme, session: null })" },
      ],
      correctAnswer: { pathIds: ["enter", "theme", "skip", "json"] },
      explanation: { short: "匿名不读 session。", realProjectNote: "root.tsx loader" },
      abilityTags: ["backend.session.cookie", "bridge.reactRouter.loader"],
      orderIndex: 6,
    }),
    q({
      type: "ai_review",
      title: "AI 只改 MainPanel 黑夜模式",
      prompt: "AI 建议仅在 MainPanel 加 dark:bg-gray-900，不碰 root。合格吗？",
      code: SNIPPETS.mainPanelWrongDark,
      options: [
        { id: "bad", text: "不合格：漏掉全站 shell，侧边栏不会同步" },
        { id: "ok", text: "合格：一个容器够用了" },
      ],
      correctAnswer: { choiceId: "bad", riskIds: ["local_patch", "client_server_mix"] },
      aiReviewMeta: { riskTypeOptions: AI_RISK_OPTIONS },
      explanation: {
        short: "全局主题不能局部补丁。",
        aiReviewNote: "看似能变黑，实际只影响一个容器，违背 root shell 设计。",
        realProjectNote: "应改 root Layout + theme cookie。",
      },
      abilityTags: ["ai.review.architecture"],
      orderIndex: 7,
    }),
  ];
}
