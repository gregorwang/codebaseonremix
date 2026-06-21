import { SNIPPETS } from "./snippets";
import type { SeedCourseData } from "./types";
import { q } from "./types";

/**
 * 阶段考试题库（内部）
 *
 * 设计原则（修复版）:
 *   1. **每条 prompt 只在一个 lesson 出现一次**——题目是真实考试题, 不应该跨 lesson 复制.
 *      原版本里 4 个大考 lesson 都会调用 `extendMajorExam` 追加同样的两道题,
 *      8 个小考 lesson 又把对应大考的整个 pack 复制进去, 再加 3 个"示例考试" lesson
 *      又复制一遍——结果同一个 prompt 在 D1 里出现 4 次, 题库被严重稀释.
 *
 *   2. **小考 (exam-unit-N) 不再持有自己的题目**: 它的 lesson 是空的容器,
 *      `examDefinitions.ts` 里的 taskRefs 应该跨 lesson 引用对应大考 (exam-units-X-Y) 的题.
 *      这样 D1 里同一题只存一份, 不同小考 / 大考通过 exam.tasks_json 的 questionId 引用.
 *
 *   3. **示例考试 lesson 移除**: 它们 100% 复制大考 pack, 没有独立内容,
 *      `exams.ts` 的 SAMPLE_EXAMS 也跟着删除 (见 exams.ts 注释).
 */

const examTags = {
  theme: ["frontend.state.global", "bridge.reactRouter.action", "ai.review.architecture"] as const,
  nemesis: ["backend.auth.required", "backend.rateLimit", "bridge.reactRouter.action"] as const,
  auth: ["backend.session.cookie", "backend.auth.required", "backend.rateLimit"] as const,
};

/**
 * Each unit pack now adds two unit-specific extras (originally 4 dupes via
 * `extendMajorExam`). The extras still cover "改造方法论" + "AI 审查",
 * but the prompt mentions the unit range explicitly so they never collide.
 */
function unitSpecificExtras(unitRange: string): ReturnType<typeof q>[] {
  return [
    q({
      type: "single_choice",
      title: `改造第一步 · ${unitRange}`,
      prompt: `接手 ${unitRange} 范围内的真实改造任务时，第一步应该？`,
      options: [
        { id: "read", text: `定位 ${unitRange} 涉及的锚点文件并阅读调用链` },
        { id: "ai", text: "直接让 AI 改 CSS" },
        { id: "skip", text: "跳过阅读" },
        { id: "db", text: "先改数据库" },
      ],
      correctAnswer: { choiceId: "read" },
      explanation: { short: "先读后改。", realProjectNote: "Code Coach 训练方法" },
      abilityTags: ["project.modify.fullstack"],
      orderIndex: 8,
    }),
    q({
      type: "ai_review",
      title: `终检：AI 改法 · ${unitRange}`,
      prompt: `针对 ${unitRange} 的改造任务，AI 只改一个文件、无守门、无错误码映射，是否可合并？`,
      options: [
        { id: "bad", text: "不可：缺守门、影响面未评估" },
        { id: "ok", text: "可以：能跑就行" },
      ],
      correctAnswer: { choiceId: "bad", riskIds: ["architecture_boundary"] },
      aiReviewMeta: {
        riskTypeOptions: [
          { id: "architecture_boundary", label: "破坏现有架构边界" },
          { id: "missing_session", label: "漏掉 session" },
        ],
      },
      explanation: { short: "改造要可审查。", aiReviewNote: "能跑≠可上线。" },
      abilityTags: ["ai.review.architecture"],
      orderIndex: 9,
    }),
  ];
}

function majorExamUnits12(): ReturnType<typeof q>[] {
  return [
    q({
      type: "single_choice",
      title: "黑夜模式状态归类",
      prompt: "个人网站黑夜模式应属于哪种状态？",
      options: [
        { id: "a", text: "全局主题，root loader + cookie 驱动" },
        { id: "b", text: "MainPanel 局部 useState" },
        { id: "c", text: "仅 CSS 文件" },
        { id: "d", text: "D1 字段" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: { short: "全站 shell 级状态。", realProjectNote: "root.tsx + theme.server.ts" },
      abilityTags: [...examTags.theme],
      orderIndex: 0,
      sourceFilePath: "app/root.tsx",
    }),
    q({
      type: "multi_choice",
      title: "主题改动影响面",
      prompt: "修改主题系统会影响哪些部分？（多选）",
      options: [
        { id: "html", text: "<html className>" },
        { id: "action", text: "root action 写 cookie" },
        { id: "header", text: "Header 切换按钮" },
        { id: "ai", text: "Nemesis 模型路由" },
      ],
      correctAnswer: { choiceIds: ["html", "action", "header"] },
      explanation: { short: "主题链三处联动。", realProjectNote: "remix/app/root.tsx" },
      abilityTags: ["frontend.state.global", "project.modify.fullstack"],
      orderIndex: 1,
    }),
    q({
      type: "sort",
      title: "主题按钮点击链",
      prompt: "排序：用户点击主题切换后的正确流转",
      sortItems: [
        { id: "1", text: "POST root action" },
        { id: "2", text: "setTheme 写 cookie" },
        { id: "3", text: "loader 读到新 theme" },
        { id: "4", text: "html class 更新" },
      ],
      correctAnswer: { itemIds: ["1", "2", "3", "4"] },
      explanation: { short: "写后读再渲染。", realProjectNote: SNIPPETS.rootThemeAction },
      abilityTags: ["bridge.reactRouter.action"],
      orderIndex: 2,
    }),
    q({
      type: "fill_blank",
      title: "Layout 接 theme",
      prompt: "补全 Layout 中 html 的 class：",
      code: SNIPPETS.fillThemeClass.replace("_____", "{{c}}"),
      blanks: [{ id: "c", placeholder: "className", acceptedAnswers: ["theme", "{theme}"] }],
      correctAnswer: { values: { c: "theme" } },
      explanation: { short: "theme 来自 loader。", realProjectNote: SNIPPETS.rootLayoutTheme },
      abilityTags: ["frontend.state.global"],
      orderIndex: 3,
    }),
    q({
      type: "debug",
      title: "只改 MainPanel",
      prompt: "为何只改 MainPanel dark class 不合格？",
      code: SNIPPETS.mainPanelWrongDark,
      options: [
        { id: "scope", text: "局部补丁，侧边栏不跟随" },
        { id: "ok", text: "完全正确" },
        { id: "tw", text: "缺少 dark:" },
        { id: "db", text: "D1 未迁移" },
      ],
      correctAnswer: { issueId: "scope" },
      explanation: { short: "全局主题不能局部化。", realProjectNote: "theme-global-state 课" },
      abilityTags: ["frontend.state.scope"],
      orderIndex: 4,
    }),
    q({
      type: "branch_trace",
      title: "匿名 root loader",
      prompt: "无 auth cookie 访问时 root loader session 分支：",
      options: [
        { id: "1", text: "getTheme" },
        { id: "2", text: "requestHasAuthSessionCookie? 为 false" },
        { id: "3", text: "session=null，跳过 getSessionCached" },
      ],
      correctAnswer: { pathIds: ["1", "2", "3"] },
      explanation: { short: "匿名不读 D1 session。", realProjectNote: SNIPPETS.rootLoader },
      abilityTags: ["bridge.reactRouter.loader"],
      orderIndex: 5,
    }),
    q({
      type: "position_judgement",
      title: "theme 放哪",
      prompt: "持久化 theme 的核心代码应在哪？",
      options: [
        { id: "root", text: "theme.server + root loader/action" },
        { id: "panel", text: "任意内容组件" },
        { id: "pub", text: "public/" },
        { id: "api", text: "api.nemesis" },
      ],
      correctAnswer: { positionId: "root" },
      explanation: { short: "全局在 root 链。", realProjectNote: "utils/theme.server.ts" },
      abilityTags: ["code.position.handler"],
      orderIndex: 6,
    }),
    q({
      type: "ai_review",
      title: "综合：主题改造方案",
      prompt: "新增「跟随系统」主题选项，合格方案应包含？",
      options: [
        { id: "a", text: "theme.server cookie 枚举 + root action/loader + Header UI + 防闪烁脚本" },
        { id: "b", text: "只改 MainPanel CSS" },
        { id: "c", text: "只改 README" },
        { id: "d", text: "删除 root action" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: { short: "全链路改造。", realProjectNote: "单元1-2 毕业题" },
      abilityTags: ["project.modify.fullstack", "ai.review.architecture"],
      orderIndex: 7,
    }),
  ];
}

function majorExamUnits34(): ReturnType<typeof q>[] {
  return [
    q({
      type: "single_choice",
      title: "chat 客户端边界",
      prompt: "NemesisChatPage 为何使用 .client.tsx？",
      options: [
        { id: "a", text: "依赖浏览器 API，避免 SSR 打包" },
        { id: "b", text: "SEO 需要" },
        { id: "c", text: "D1 限制" },
        { id: "d", text: "仅美观" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: { short: "客户端边界。", realProjectNote: "NemesisChatPage.client.tsx" },
      abilityTags: ["code.position.handler"],
      orderIndex: 0,
      sourceFilePath: "app/routes/chat.tsx",
    }),
    q({
      type: "multi_choice",
      title: "文件路由影响",
      prompt: "新增 /updates 页面需要动哪些？（多选）",
      options: [
        { id: "route", text: "app/routes/updates.tsx" },
        { id: "nav", text: "Header NavLink" },
        { id: "nemesis", text: "nemesis guard 规则" },
        { id: "unrelated", text: "game.$platform 动态段" },
      ],
      correctAnswer: { choiceIds: ["route", "nav"] },
      explanation: { short: "路由+导航。", realProjectNote: "routes 目录" },
      abilityTags: ["code.position.handler"],
      orderIndex: 1,
    }),
    q({
      type: "sort",
      title: "URL 到文件",
      prompt: "排查 /game/ps5 渲染来源的顺序：",
      sortItems: [
        { id: "1", text: "找 routes/game.tsx layout" },
        { id: "2", text: "找 game.$platform.tsx" },
        { id: "3", text: "读 params.platform" },
        { id: "4", text: "看 Outlet 子组件" },
      ],
      correctAnswer: { itemIds: ["1", "2", "3", "4"] },
      explanation: { short: "嵌套路由。", realProjectNote: "game 路由组" },
      abilityTags: ["bridge.reactRouter.loader"],
      orderIndex: 2,
    }),
    q({
      type: "fill_blank",
      title: "ClientOnly 门闩",
      prompt: "补全 ClientOnly 挂载判断状态名：",
      code: SNIPPETS.clientOnly,
      blanks: [{ id: "s", placeholder: "state", acceptedAnswers: ["hasMounted"] }],
      correctAnswer: { values: { s: "hasMounted" } },
      explanation: { short: "挂载后再渲染。", realProjectNote: "ClientOnly.tsx" },
      abilityTags: ["frontend.effect.useEffect"],
      orderIndex: 3,
    }),
    q({
      type: "debug",
      title: "顶层 localStorage",
      prompt: "在 SSR 组件顶层读 localStorage 的问题？",
      code: `const x = localStorage.getItem("sessions");`,
      options: [
        { id: "ssr", text: "SSR/水合错误，应放 client" },
        { id: "ok", text: "无问题" },
        { id: "ai", text: "AI 限流" },
        { id: "theme", text: "主题闪烁" },
      ],
      correctAnswer: { issueId: "ssr" },
      explanation: { short: "浏览器 API 边界。", realProjectNote: "chat client 组件" },
      abilityTags: ["code.position.handler"],
      orderIndex: 4,
    }),
    q({
      type: "branch_trace",
      title: "未登录访问 chat",
      prompt: "未登录用户打开 /chat（若 loader 守门）：",
      options: [
        { id: "1", text: "chat loader 检查 session" },
        { id: "2", text: "无 session" },
        { id: "3", text: "redirect 登录或展示提示" },
      ],
      correctAnswer: { pathIds: ["1", "2", "3"] },
      explanation: { short: "路由级守门。", realProjectNote: "chat.tsx loader" },
      abilityTags: ["backend.auth.required"],
      orderIndex: 5,
    }),
    q({
      type: "position_judgement",
      title: "首页新区块",
      prompt: "首页新增视频区块，代码应主要加在哪？",
      options: [
        { id: "home", text: "components/home/* + _index 组装" },
        { id: "api", text: "api.nemesis" },
        { id: "mig", text: "migrations only" },
        { id: "root", text: "仅 root action" },
      ],
      correctAnswer: { positionId: "home" },
      explanation: { short: "路由薄组件厚。", realProjectNote: "_index.tsx" },
      abilityTags: ["code.position.handler"],
      orderIndex: 6,
    }),
    q({
      type: "ai_review",
      title: "综合：新内容栏目",
      prompt: "AI 建议把 gallery 图片全塞进 root loader。问题？",
      options: [
        { id: "bad", text: "污染全局 loader；应独立 route/loader 或静态数据" },
        { id: "ok", text: "最佳实践" },
        { id: "ok2", text: "更快" },
        { id: "ok3", text: "更安全" },
      ],
      correctAnswer: { choiceId: "bad" },
      explanation: { short: "关注点分离。", realProjectNote: "gallery.tsx" },
      abilityTags: ["ai.review.architecture"],
      orderIndex: 7,
    }),
  ];
}

function majorExamUnits56(): ReturnType<typeof q>[] {
  return [
    q({
      type: "single_choice",
      title: "loader 职责",
      prompt: "React Router loader 的首要约定是？",
      options: [
        { id: "a", text: "服务端读取数据，避免在 loader 写副作用" },
        { id: "b", text: "任意写 cookie" },
        { id: "c", text: "调用 AI" },
        { id: "d", text: "仅客户端执行" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: { short: "读用 loader，写用 action。", realProjectNote: "root.tsx" },
      abilityTags: ["bridge.reactRouter.loader"],
      orderIndex: 0,
    }),
    q({
      type: "multi_choice",
      title: "POST api.nemesis 前检查",
      prompt: "POST api.nemesis 前必须完成哪些守门？（多选）",
      options: [
        { id: "auth", text: "登录" },
        { id: "valid", text: "字段校验" },
        { id: "rate", text: "限流" },
        { id: "theme", text: "主题 cookie" },
      ],
      correctAnswer: { choiceIds: ["auth", "valid", "rate"] },
      explanation: { short: "守门三件套。", realProjectNote: SNIPPETS.apiNemesisChain },
      abilityTags: [...examTags.nemesis],
      orderIndex: 1,
    }),
    q({
      type: "sort",
      title: "输入到 Gateway",
      prompt: "前端发送到 AI Gateway 的顺序：",
      sortItems: [
        { id: "1", text: "读 inputMessage" },
        { id: "2", text: "POST /api/nemesis" },
        { id: "3", text: "服务端守门链" },
        { id: "4", text: "SSE 流式解析" },
        { id: "5", text: "更新 messages UI" },
      ],
      correctAnswer: { itemIds: ["1", "2", "3", "4", "5"] },
      explanation: { short: "端到端链。", realProjectNote: "useNemesisChat + api.nemesis" },
      abilityTags: ["frontend.event.submit"],
      orderIndex: 2,
    }),
    q({
      type: "fill_blank",
      title: "root 条件 session",
      prompt: "补全条件读取 session 的函数名：",
      code: SNIPPETS.authSessionSkip,
      blanks: [{ id: "fn", placeholder: "fn", acceptedAnswers: ["getSessionCached"] }],
      correctAnswer: { values: { fn: "getSessionCached" } },
      explanation: { short: "有 cookie 才读。", realProjectNote: "auth.server.ts" },
      abilityTags: ["backend.session.cookie"],
      orderIndex: 3,
    }),
    q({
      type: "debug",
      title: "loader 写 cookie",
      prompt: "在 root loader 里 setTheme 的问题？",
      code: `export const loader = async ({ request }) => {
  await setTheme("dark", request); // 写 cookie
  return json({ theme: "dark" });
};`,
      options: [
        { id: "bad", text: "loader 应只读；写应用 action" },
        { id: "ok", text: "推荐写法" },
        { id: "sse", text: "SSE 错误" },
        { id: "db", text: "D1 锁" },
      ],
      correctAnswer: { issueId: "bad" },
      explanation: { short: "读写分离。", realProjectNote: "root action 写 theme" },
      abilityTags: ["bridge.reactRouter.loader"],
      orderIndex: 4,
    }),
    q({
      type: "branch_trace",
      title: "限流分支",
      prompt: "触发 Nemesis 日限额时：",
      options: [
        { id: "1", text: "checkNemesisRateLimit 返回 allowed=false" },
        { id: "2", text: "返回 429 JSON" },
        { id: "3", text: "不调用模型" },
      ],
      correctAnswer: { pathIds: ["1", "2", "3"] },
      explanation: { short: "限流早于模型。", realProjectNote: "api.nemesis.ts" },
      abilityTags: ["backend.rateLimit"],
      orderIndex: 5,
    }),
    q({
      type: "position_judgement",
      title: "资格校验放哪",
      prompt: "领取 token 资格校验应放哪一层？",
      options: [
        { id: "svc", text: "server service/action，在写 DB 前" },
        { id: "ui", text: "仅前端 disable 按钮" },
        { id: "css", text: "CSS" },
        { id: "meta", text: "meta 标签" },
      ],
      correctAnswer: { positionId: "svc" },
      explanation: { short: "服务端权威。", realProjectNote: "auth-protected-token-flow" },
      abilityTags: ["backend.auth.required"],
      orderIndex: 6,
    }),
    q({
      type: "ai_review",
      title: "综合：聊天+主题联动",
      prompt: "AI 建议在 root loader 同步等待 Nemesis 回复。评审：",
      options: [
        { id: "bad", text: "阻塞 loader；聊天应 client POST + SSE" },
        { id: "ok", text: "优秀" },
        { id: "ok2", text: "更 SEO" },
        { id: "ok3", text: "更简单" },
      ],
      correctAnswer: { choiceId: "bad" },
      explanation: { short: "架构分层。", realProjectNote: "chat + root 分工" },
      abilityTags: ["ai.review.architecture"],
      orderIndex: 7,
    }),
  ];
}

function majorExamUnits78(): ReturnType<typeof q>[] {
  return [
    q({
      type: "single_choice",
      title: "Nemesis 必须登录",
      prompt: "未登录调用 api.nemesis 会怎样？",
      options: [
        { id: "a", text: "返回请先登录，不进入模型" },
        { id: "b", text: "匿名可用" },
        { id: "c", text: "自动注册" },
        { id: "d", text: "仅警告" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: { short: "requireNemesisUser。", realProjectNote: SNIPPETS.apiNemesisAuth },
      abilityTags: ["backend.auth.required"],
      orderIndex: 0,
    }),
    q({
      type: "multi_choice",
      title: "Gateway 安全",
      prompt: "AI Gateway 集成必须注意？（多选）",
      options: [
        { id: "key", text: "API key 不暴露客户端" },
        { id: "guard", text: "服务端守门后再调用" },
        { id: "err", text: "错误映射给用户" },
        { id: "theme", text: "必须 dark 模式" },
      ],
      correctAnswer: { choiceIds: ["key", "guard", "err"] },
      explanation: { short: "密钥与守门。", realProjectNote: "nemesis-ai-gateway.server.ts" },
      abilityTags: ["ai.review.architecture"],
      orderIndex: 1,
    }),
    q({
      type: "sort",
      title: "Nemesis 全链",
      prompt: "排序 api.nemesis 关键步骤：",
      sortItems: [
        { id: "1", text: "requireNemesisUser" },
        { id: "2", text: "validateNemesisRequest" },
        { id: "3", text: "checkNemesisRateLimit" },
        { id: "4", text: "guardNemesisMessage" },
        { id: "5", text: "callNemesisModel + SSE" },
      ],
      correctAnswer: { itemIds: ["1", "2", "3", "4", "5"] },
      explanation: { short: "完整链。", realProjectNote: "api.nemesis.ts" },
      abilityTags: ["bridge.reactRouter.action"],
      orderIndex: 2,
    }),
    q({
      type: "fill_blank",
      title: "D1 访问",
      prompt: "D1 只能在哪访问？",
      code: `// remix/app/lib/db.server.ts\n// 在 _____ 中 prepare/bind`,
      blanks: [{ id: "where", placeholder: "环境", acceptedAnswers: ["Worker", "服务端", "server", "loader", "action"] }],
      correctAnswer: { values: { where: "Worker" } },
      explanation: { short: "D1 绑定在 Worker。", realProjectNote: "db.server.ts" },
      abilityTags: ["project.modify.fullstack"],
      orderIndex: 3,
    }),
    q({
      type: "debug",
      title: "先模型后 guard",
      prompt: "先 callNemesisModel 再 guardNemesisMessage 的问题？",
      code: `const model = await callNemesisModel(...);
const guard = await guardNemesisMessage(...);`,
      options: [
        { id: "order", text: "guard 应在模型前，避免浪费算力" },
        { id: "ok", text: "无问题" },
        { id: "db", text: "D1" },
        { id: "css", text: "CSS" },
      ],
      correctAnswer: { issueId: "order" },
      explanation: { short: "守门顺序。", realProjectNote: "api.nemesis.ts" },
      abilityTags: ["backend.rateLimit"],
      orderIndex: 4,
    }),
    q({
      type: "branch_trace",
      title: "字段校验失败",
      prompt: "message 字段非法时：",
      options: [
        { id: "1", text: "validateNemesisRequest 失败" },
        { id: "2", text: "返回 4xx JSON" },
        { id: "3", text: "不进入限流与模型" },
      ],
      correctAnswer: { pathIds: ["1", "2", "3"] },
      explanation: { short: "校验在限流前。", realProjectNote: "nemesis-guard" },
      abilityTags: ["backend.validation.field"],
      orderIndex: 5,
    }),
    q({
      type: "position_judgement",
      title: "guard 位置",
      prompt: "nemesis 安全分类逻辑应主要在哪？",
      options: [
        { id: "svc", text: "nemesis-guard.server.ts + api.nemesis 编排" },
        { id: "client", text: "聊天组件 JSX" },
        { id: "css", text: "tailwind" },
        { id: "public", text: "public/" },
      ],
      correctAnswer: { positionId: "svc" },
      explanation: { short: "服务端守卫。", realProjectNote: "services/nemesis-guard.server.ts" },
      abilityTags: ["code.position.handler"],
      orderIndex: 6,
    }),
    q({
      type: "ai_review",
      title: "综合：读懂 remix 毕业",
      prompt: "新增需登录反馈功能，合格方案？",
      options: [
        { id: "a", text: "route + action + migration + hook 错误展示 + auth/限流" },
        { id: "b", text: "只改 CSS" },
        { id: "c", text: "仅前端 localStorage" },
        { id: "d", text: "删除 guard" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: { short: "全栈毕业改造。", realProjectNote: "site-20 capstone" },
      abilityTags: ["project.modify.fullstack"],
      orderIndex: 7,
    }),
  ];
}

/**
 * Major exam = 8 unit-specific questions + 2 unit-tagged extras = 10 total.
 * 4 major lessons × 10 = 40 unique prompts (no overlap, since extras are
 * suffixed with the unit range).
 */
function majorExam(unitRange: "1-2" | "3-4" | "5-6" | "7-8"): ReturnType<typeof q>[] {
  const builders = {
    "1-2": majorExamUnits12,
    "3-4": majorExamUnits34,
    "5-6": majorExamUnits56,
    "7-8": majorExamUnits78,
  };
  const base = builders[unitRange]();
  const extras = unitSpecificExtras(`单元${unitRange}`).map((extra, i) => ({
    ...extra,
    orderIndex: base.length + i,
  }));
  return [...base, ...extras];
}

/**
 * The exam pool no longer holds questions in the small-unit / sample lessons.
 * Those lessons are EMPTY containers — `examDefinitions.ts` taskRefs cross-
 * reference the major-exam lessons via questionIndex, so a single question
 * is stored once and referenced many times via `exams.tasks_json`.
 */
export const EXAM_BANK_COURSE: SeedCourseData = {
  slug: "site-exam-bank",
  title: "阶段考试题库（内部）",
  subtitle: "考试专用",
  description: "仅供阶段考试引用，不在课程列表展示。",
  projectContext: "混合题型的阶段考试题库。",
  difficulty: "advanced",
  abilityTags: ["project.modify.fullstack", "ai.review.architecture"],
  orderIndex: 9999,
  unitIndex: 7,
  lessons: [
    { slug: "exam-units-1-2", title: "大考 单元1-2", description: "", learningGoal: "", orderIndex: 0, questions: majorExam("1-2") },
    { slug: "exam-units-3-4", title: "大考 单元3-4", description: "", learningGoal: "", orderIndex: 1, questions: majorExam("3-4") },
    { slug: "exam-units-5-6", title: "大考 单元5-6", description: "", learningGoal: "", orderIndex: 2, questions: majorExam("5-6") },
    { slug: "exam-units-7-8", title: "大考 单元7-8", description: "", learningGoal: "", orderIndex: 3, questions: majorExam("7-8") },
  ],
};
