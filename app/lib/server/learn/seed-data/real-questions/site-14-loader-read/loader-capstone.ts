/**
 * Real questions for site-14-loader-read / loader-capstone.
 *
 * Anchor: remix/app/root.tsx L32-46 (loader 整体).
 * 学习目标: 改 loader 时的影响面分析 — 加字段 / 改逻辑 / 加守门.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: remixPublicCacheOnMessages (§18.3-1) — 涉及 loader / cache 边界.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { remixPublicCacheOnMessages } from "../recipes";

const PRIMARY = "app/root.tsx";
const TOUCHED = [PRIMARY, "app/utils/theme.server.ts", "app/lib/auth.server.ts", "app/utils/cloudflare-env.server.ts"];

export const loaderCapstoneQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 改 loader 的常见场景",
    prompt: "以下哪些场景需要改 root loader? (单选最常见)",
    options: [
      { id: "A", text: "加全站共享数据 (如未读消息数 / 通知), 所有页面都用到" },
      { id: "B", text: "改特定页面的数据 (如 chat 历史)" },
      { id: "C", text: "改 CSS 样式" },
      { id: "D", text: "改 Footer 链接" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "全站共享数据加 root loader, 特定页面的改子 loader.",
      detail: "root loader 适合 '全站都用' 的数据, 改 root 影响所有路由. 改特定页面的数据应该改子路由 loader, 避免浪费全站资源.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 加字段后的影响面",
    prompt: "loader 加字段 data.unreadCount, 哪些位置需要更新?",
    options: [
      { id: "A", text: "Layout / App / 子路由可能用到 unreadCount 的地方, TS 自动推导" },
      { id: "B", text: "只有 Layout" },
      { id: "C", text: "无" },
      { id: "D", text: "只有 App" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "加字段后, 任何访问 data.unreadCount 的地方 TS 强类型保护, 自动可用.",
      detail: "typeof loader 自动推导, 加字段后 data.unreadCount 立即可用. 不需要修改 type 定义, 但业务代码访问新字段要补.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 删除字段的风险",
    prompt: "loader 删字段 data.appUrl, 哪些位置会受影响?",
    options: [
      { id: "A", text: "GoogleOneTap 的 expectedOrigin 校验, Layout 的 window.ENV 注入, TS 立即报错" },
      { id: "B", text: "无" },
      { id: "C", text: "loader 不会跑" },
      { id: "D", text: "TS 报错但运行时没事" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "删字段, 任何 access 都会 TS 报 'Property appUrl does not exist'.",
      detail: "typeof loader 推导跟随实现, 删字段后所有引用 data.appUrl 的地方 TS 立即报错. GoogleOneTap 的 expectedOrigin 校验会拿 undefined, Layout 的 window.ENV 注入会丢失 appUrl 字段.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "fill_blank",
    title: "Q4 加守门的判断",
    prompt: "loader 加 expensive 操作 (调 AI Gateway) 之前, 必须先 _____ .",
    options: [],
    correctAnswer: { values: { v: "守门" } },
    blanks: [{ id: "v", placeholder: "动作", acceptedAnswers: ["守门", "守卫", "auth 守门", "判断", "收窄"] }],
    explanation: {
      short: "expensive 操作前先守门, 防止滥用与浪费.",
      detail: "AI Gateway 调一次可能 $0.01-$0.10, 必须先 auth 守门, 防止未登录 / 限流 / 重复请求触发昂贵操作. 是 backend.rateLimit 与 backend.auth.required 的核心应用.",
    },
    abilityTags: ["backend.rateLimit"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 loader 修改测试关注",
    prompt: "改 root loader 后, 必须测试? (多选)",
    options: [
      { id: "A", text: "匿名访客路径 (theme 默认 + session null)" },
      { id: "B", text: "已登录用户路径 (theme + session 完整)" },
      { id: "C", text: "边界: cookie 缺失 / 损坏 / null" },
      { id: "D", text: "D1 QPS / 性能" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "匿名 + 登录 + 边界 + 性能四类必须测.",
      detail: "root loader 是全站入口, 任何 bug 影响所有页面. 必须覆盖 (1) 匿名 / 登录主路径 (2) cookie 边界 (3) 性能 (D1 QPS / cache 命中). 这是 cap-stone 的全面考量.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 改 cookie 配置影响",
    prompt: "改 theme cookie maxAge 从 1 年到 30 天, 影响?",
    options: [
      { id: "A", text: "已设置 cookie 的用户 30 天后过期, 重新走默认 'light'" },
      { id: "B", text: "无" },
      { id: "C", text: "loader 报错" },
      { id: "D", text: "CSS 崩" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "maxAge 是 cookie 过期时间, 30 天后浏览器清掉, 默认值回退.",
      detail: "改 maxAge 不影响存量 cookie (浏览器已存的 cookie 仍按原 maxAge). 但 setTheme 重新写 cookie 用新 maxAge, 30 天后过期, 走默认 'light'.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/utils/theme.server.ts"],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: json 返回",
    prompt: "return json({ ... }); 出现在 root loader 哪一行?",
    code: `1 export const loader = async ({ request }: LoaderFunctionArgs) => {
2   // 获取主题
3   const theme = await getTheme(request);
4   // Anonymous requests often only carry theme/visitor cookies; avoid a Better Auth/D1 read until an auth cookie exists.
5   const session = requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null;
6   return json({`,
    options: [],
    linePickLines: [
      { id: "L3", lineNumber: 3, text: "const theme = await getTheme(request);" },
      { id: "L5", lineNumber: 5, text: "const session = requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null;" },
      { id: "L6", lineNumber: 6, text: "return json({" },
    ],
    correctAnswer: { lineId: "L6" },
    explanation: {
      short: "第 6 行 json 返回, 暴露给客户端.",
      detail: "loader 内部数据准备完毕, json 包装返回. 字段加在 json 内即可, 客户端 useLoaderData<typeof loader> 自动拿到.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 改字段后 typeof loader 行为",
    prompt: "loader 改字段 data.foo = 'bar', Layout / App 看到 data.foo?",
    options: [
      { id: "A", text: "立即可用, typeof loader 自动推导, 字段拼写错 TS 报" },
      { id: "B", text: "无" },
      { id: "C", text: "需重启" },
      { id: "D", text: "需 reload" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "typeof loader 实时推导, 新字段立即可用, 字段拼错 TS 报.",
      detail: "TS 推导基于 AST, 改 loader 立即更新 typeof loader, Layout / App 访问 data.foo 立即有强类型, 拼错 data.fooo 立即红线.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "shared",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 加 await 链的影响",
    prompt: "loader 加 await callAiGateway() 之前, 哪些是必须做的?",
    options: [
      { id: "A", text: "先 auth 守门 + 限流 + 字段校验, 避免 expensive 操作被滥用" },
      { id: "B", text: "无" },
      { id: "C", text: "直接 await 即可" },
      { id: "D", text: "用 useEffect" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "expensive 操作前必须三道守门: auth + 限流 + 校验.",
      detail: "AI Gateway 调一次 $0.01-$0.10, 不守门等于送钱. auth 防止未登录调用, 限流防止刷量, 校验防止错误请求. 三道守门是后端核心契约.",
    },
    abilityTags: ["backend.rateLimit"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 改 loader 的部署注意",
    prompt: "改 root loader 后部署, 注意事项? (多选)",
    options: [
      { id: "A", text: "LEARN_CACHE_VERSION bump (公共读缓存会失效)" },
      { id: "B", text: "Worker bundle 重新部署" },
      { id: "C", text: "D1 schema 不变则不需要 migration" },
      { id: "D", text: "TS 编译过" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "bump cache + 重部署 + schema 不变 + TS 干净, 都必须.",
      detail: "loader 返回字段变化, KV 缓存的旧数据形状不一致, 必须 bump LEARN_CACHE_VERSION. 部署 + TS 干净是基本. D1 schema 不变不需要 migration.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 删守门的影响",
    prompt: "删 requestHasAuthSessionCookie 守门, 性能影响?",
    options: [
      { id: "A", text: "匿名访客也查 D1, QPS 翻 N 倍, 隐私边界破坏, 部署后 D1 账单暴涨" },
      { id: "B", text: "无" },
      { id: "C", text: "性能更好" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "删守门导致 D1 QPS 暴涨, 账单 + 延迟 + 隐私三重崩.",
      detail: "项目注释明确警告: 'Anonymous requests often only carry theme/visitor cookies; avoid a Better Auth/D1 read until an auth cookie exists.' 删了守门等于让每个匿名访客都查 D1, 性能与隐私双崩.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 加 unreadCount 字段完整路径",
    prompt: "加 data.unreadCount 字段, 改完部署, 用户访问?",
    options: [
      { id: "loader", text: "loader 读 unreadCount (查 D1 / KV), 加进 json 返回" },
      { id: "ssr", text: "SSR 渲染 <Header /> 读 data.unreadCount 显示数字" },
      { id: "hydrate", text: "hydrate 后 useLoaderData 拿到 unreadCount 强类型" },
      { id: "interact", text: "用户点未读消息列表, fetcher 重新跑 loader 拿最新 unreadCount" },
    ],
    correctAnswer: { pathIds: ["loader", "ssr", "hydrate", "interact"] },
    explanation: {
      short: "loader 读 → SSR 渲染 → hydrate 强类型 → fetcher 实时更新.",
      detail: "加字段后, 全链路: loader 内查 unreadCount, SSR 渲染 <Header /> 显示, hydrate 强类型, 用户点未读列表 fetcher 重新跑拿最新值. 整个数据流是 RR 7 的标准模式.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "branch_trace",
    title: "Q13 删 appUrl 字段完整影响",
    prompt: "删 data.appUrl 字段, 改完部署, 用户访问?",
    options: [
      { id: "compile", text: "Layout 访问 data.appUrl TS 报红线, 开发者修复" },
      { id: "deploy", text: "部署" },
      { id: "google-one-tap", text: "GoogleOneTap 拿 undefined, expectedOrigin 校验失败, One Tap 跳过" },
      { id: "user", text: "用户登录后看不到 One Tap 弹窗, 必须走 LoginDialog" },
    ],
    correctAnswer: { pathIds: ["compile", "deploy", "google-one-tap", "user"] },
    explanation: {
      short: "TS 报红线 → 修复 / 删用法 → One Tap 跳过 → 用户走 LoginDialog.",
      detail: "删 appUrl 字段的连锁反应: TS 编译期红线 (typeof loader 推导), 开发者必须删 Layout 内的 data.appUrl 用法, 部署后 GoogleOneTap expectedOrigin 失败, One Tap 跳过, 用户只能走 LoginDialog 登录.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "mixed-risk",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 加 expensive 操作到 root loader",
    prompt: "需求: root loader 加 await callAiGateway(...). 后果?",
    options: [
      { id: "A", text: "所有路由 navigation 都跑 AI Gateway, 费用 + 延迟灾难, 违反 root loader 性能契约" },
      { id: "B", text: "更丰富" },
      { id: "C", text: "更智能" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "root loader 不该跑 AI Gateway, 应该放子路由 loader 配合守门.",
      detail: "AI Gateway 调一次 $0.01-$0.10, 放 root loader 等于每个 navigation 都调一次, 费用 + 延迟灾难. 应该放 chat loader, 配合 auth 守门 + 限流, 只在用户主动进入 chat 时跑.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 加守门的影响",
    prompt: "需求: loader 加 request.url.startsWith('/admin') 守门, 区别于普通 user 视图. 行为?",
    options: [
      { id: "A", text: "普通用户访问时 admin 数据不返回, isAdmin 字段 false, UI 不显示 admin 入口" },
      { id: "B", text: "无" },
      { id: "C", text: "loader 报错" },
      { id: "D", text: "越界访问" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "加 admin 守门, 普通用户看不到 admin 数据, UI 隐藏入口.",
      detail: "在 loader 内根据 pathname 守门, 普通用户拿不到 admin 数据, 客户端 useLoaderData 也拿不到. UI 根据 isAdmin 字段隐藏 admin 入口. 这是分层权限控制的标准模式.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 在 root loader 加 AI Gateway 调用",
    prompt: "AI 改坏: AI 在 root loader 加 await callNemesisModel() 拿 AI 摘要. 后果?",
    options: [
      { id: "A", text: "所有路由 navigation 都触发 AI Gateway, 每次访问消耗 $0.05+, 费用 + 延迟灾难" },
      { id: "B", text: "更智能" },
      { id: "C", text: "更友好" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "root loader 不该跑 AI, 应该放子路由 loader 配合守门.",
      detail: "AI Gateway 调用昂贵且有 latency (500-2000ms), 放 root loader 等于每个 navigation 都跑一次. 必须放 chat loader, 配合 auth + 限流 + 字段校验, 用户主动进入 chat 才调.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis.server.ts"],
    realWorldImpact: "D1 账单暴涨, 用户每次 navigation 延迟 1-2s, 体验灾难.",
    aiReviewRisk: "为'统一 AI'把 expensive 操作放 root loader, 违反后端性能契约.",
    wrongAnswerFeedback: {
      B: "智能不是浪费的理由.",
      C: "友好不是延迟的理由.",
      D: "有严重性能影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把 requestHasAuthSessionCookie 改成检查 IP",
    prompt: "AI 改坏: AI 觉得 'IP 更稳', 把守门改成 checkRateLimitByIP(request). 后果是?",
    options: [
      { id: "A", text: "IP 共享 (公司 / 学校) 下, 一台机器多个用户都跳过 session 守门, 逻辑错乱" },
      { id: "B", text: "更稳定" },
      { id: "C", text: "更安全" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "IP 守门不是 auth 守门, 公司共享 IP 下所有用户都跳过 session 读取.",
      detail: "IP 守门是限流, 不是身份验证. 公司 / 学校 / VPN 下 IP 共享, 多用户共用 IP 守门失败 = 都跳过 session 读取, 失去 auth 语义. 守门必须看 auth session cookie.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
    realWorldImpact: "公司 / 学校用户全部 session=null, 永久看到 GoogleOneTap 弹窗, 体验错乱.",
    aiReviewRisk: "把限流与 auth 守门混淆, 失去语义.",
    wrongAnswerFeedback: {
      B: "IP 守门不是 auth 守门.",
      C: "混淆守门更不安全.",
      D: "有严重语义错乱.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 session 公开字段加 isAdmin",
    prompt: "AI 改坏: AI 在 toPublicSession 内部加 isAdmin: session.user.isAdmin, 让客户端 UI 显隐 admin 入口. 后果?",
    options: [
      { id: "A", text: "客户端拿到 isAdmin, 用户手动改 cookie 拿不到 admin 权限, 但 UI 暴露 admin 入口, 攻击者知道哪些 URL 是 admin" },
      { id: "B", text: "更灵活" },
      { id: "C", text: "更安全" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "isAdmin 是公开字段, 但暴露 admin 入口信息给攻击者, 配合其他漏洞可利用.",
      detail: "isAdmin 本来是公开字段, 客户端可以判断. 但暴露 admin 入口给所有用户, 攻击者知道哪些 URL 是 admin, 配合 admin 路由漏洞可利用. 应该 server-side 检查后只暴露 admin 入口, 不暴露所有 admin URL.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
    realWorldImpact: "攻击者看到 admin URL 列表, 配合其他漏洞可尝试未授权访问.",
    aiReviewRisk: "为'灵活'把权限判断搬到 client, 暴露攻击面.",
    wrongAnswerFeedback: {
      B: "灵活不是暴露攻击面.",
      C: "client 判断权限不安全.",
      D: "有攻击面增加.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §18.3-1 messages loader 错设 public cache",
    prompt: remixPublicCacheOnMessages({
      lessonSlug: "loader-capstone",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).prompt,
    options: remixPublicCacheOnMessages({
      lessonSlug: "loader-capstone",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).options,
    correctAnswer: remixPublicCacheOnMessages({
      lessonSlug: "loader-capstone",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: remixPublicCacheOnMessages({
      lessonSlug: "loader-capstone",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: "app/routes/api.messages.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/routes/api.messages.ts", "app/lib/cache-headers.server.ts"],
    realWorldImpact: "user-specific loader 错设 public cache, 用户 A 私密消息缓存到 CDN, 用户 B 打开相同 URL 直接看到 A 的内容, 严重隐私事故.",
    aiReviewRisk: "把公共资源 cache header 套到 user-specific loader, 没有区分数据 user 维度.",
    wrongAnswerFeedback: remixPublicCacheOnMessages({
      lessonSlug: "loader-capstone",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 改 theme 默认值 'light' 改 'rainbow'",
    prompt: "AI 改坏: AI 觉得 'rainbow 更好看' 把 getTheme 默认值 'light' 改成 'rainbow'. 后果是?",
    options: [
      { id: "A", text: "首次访问用户看到 'rainbow' 主题, 但 CSS 变量没匹配, 渲染无样式" },
      { id: "B", text: "更丰富" },
      { id: "C", text: "更友好" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "默认 'rainbow' 不在 CSS 变量内, 渲染无样式.",
      detail: "CSS @theme reference 定义 'light' / 'dark' 变量, 'rainbow' 不在白名单, html className='rainbow' 没有 CSS 匹配, 用户看到无样式页面. Theme union 'light' | 'dark' 是受控的, 不能扩展.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: "app/utils/theme.server.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/utils/theme.server.ts", "app/styles/theme.css"],
    realWorldImpact: "首次访问用户看到无样式页面, 投诉 'CSS 坏了'.",
    aiReviewRisk: "改默认值不联动 CSS 系统, 破坏 Theme union 与 CSS 变量同步.",
    wrongAnswerFeedback: {
      B: "丰富不是 CSS 不匹配的理由.",
      C: "友好不是默认坏值的理由.",
      D: "有严重样式影响.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 root loader 修改影响面分析",
    prompt: "用自己的话解释改 root loader 时的影响面: 加字段 / 改逻辑 / 加守门 / 删字段 / 改 cookie 配置, 各自需要注意什么.",
    options: [],
    correctAnswer: {
      text: "加字段: 客户端 useLoaderData<typeof loader> 自动可用, 不需要改 type, 但业务代码访问新字段要补; 改完 bump LEARN_CACHE_VERSION 让 KV 失效. 改逻辑: 改动如果影响 SSR 与 CSR 一致性, 触发 hydration warning, 必须测两端; 影响性能时跑 D1 QPS / cache 命中率. 加守门: 守门必须 cheap (同步, 不查 D1), 否则抵消守门收益; 守门要配合 cache 与 toPublicSession. 删字段: TS 编译期红线, 业务代码访问的地方立即报, 必须在删之前先删访问. 改 cookie 配置: maxAge 改不影响存量 cookie, 部署后浏览器按新 maxAge 走; secure 改 dev / prod 不一致时浏览器拒绝.",
    },
    explanation: {
      short: "5 类修改各有检查清单: 加字段 / 改逻辑 / 加守门 / 删字段 / 改 cookie.",
      detail: "root loader 是全站入口, 修改影响所有路由. 每类修改都有专属检查项, 不能漏.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 在 root loader 加 await callAiGateway() 拿 AI 摘要, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "AI Gateway 调用昂贵且延迟 500-2000ms, 放 root loader 等于每个 navigation 都跑一次, 性能 + 费用双重灾难. 应该把 AI 摘要搬到 chat loader, 配合 auth 守门 + 限流 + 字段校验, 用户主动进入 chat 才调. root loader 只放全站共享的 cheap 数据.",
    },
    explanation: {
      short: "审查点: root loader 性能契约, expensive 操作必须搬走.",
      detail: "好的 review 指出 (1) AI Gateway 性能与费用 (2) root loader 设计契约 (3) 给出明确改法 (子 loader + 守门).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis.server.ts"],
  }),
];
