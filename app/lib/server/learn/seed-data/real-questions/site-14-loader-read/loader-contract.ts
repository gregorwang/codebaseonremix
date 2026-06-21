/**
 * Real questions for site-14-loader-read / loader-contract.
 *
 * Anchor: remix/app/root.tsx L32-46 (root loader contract).
 * 学习目标: 理解 loader 返回的公开契约, 与 session / theme / googleClientId / appUrl
 * / authPreviewEnabled 五个字段各自的作用.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: tsModelJsonDirectCast (§12.2-TS-1) — 涉及 as / unknown 收窄.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { tsModelJsonDirectCast } from "../recipes";

const PRIMARY = "app/root.tsx";
const TOUCHED = [PRIMARY, "app/utils/theme.server.ts", "app/lib/auth.server.ts", "app/utils/cloudflare-env.server.ts"];

export const loaderContractQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 root loader 返回字段",
    prompt: "root loader 的 json() 调用返回 5 个字段, 哪 5 个?",
    options: [
      { id: "A", text: "theme, session, googleClientId, appUrl, authPreviewEnabled" },
      { id: "B", text: "theme, user, csrf, ip, ua" },
      { id: "C", text: "session, messages, theme, locale, userAgent" },
      { id: "D", text: "loader, action, error, headers, status" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "root loader 返回 5 个公开字段, 全部给客户端使用.",
      detail: "theme 用于 <html> className, session 用于登录 UI, googleClientId / appUrl 用于 GoogleOneTap, authPreviewEnabled 是 dev 预览开关.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 json() 来源",
    prompt: "loader 末尾 return json({ ... }) 来自?",
    options: [
      { id: "A", text: "@remix-run/react, 把对象包装成 Remix Response" },
      { id: "B", text: "node" },
      { id: "C", text: "react" },
      { id: "D", text: "vite" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "json() 来自 @remix-run/react, 与 fetch Response 兼容.",
      detail: "RR 7 的 json() 是 Response.json() 的轻量包装, 内部 Content-Type: application/json, 浏览器 / RR fetcher 都能解析.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 getEnvVar 来自",
    prompt: "getEnvVar('GOOGLE_CLIENT_ID') 来自哪个模块?",
    options: [
      { id: "A", text: "app/utils/cloudflare-env.server.ts" },
      { id: "B", text: "process.env" },
      { id: "C", text: "app/lib/env.ts" },
      { id: "D", text: "global" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "getEnvVar 来自 app/utils/cloudflare-env.server.ts, 封装 Cloudflare env.",
      detail: "Cloudflare Workers 没有 process.env, env 通过 getCloudflareContext() 拿. getEnvVar 封装了访问逻辑 + 默认值 + 类型保护.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/utils/cloudflare-env.server.ts"],
  }),
  q({
    type: "fill_blank",
    title: "Q4 authPreviewEnabled 计算",
    prompt: "authPreviewEnabled = getEnvVar('APP_URL')?.startsWith('http://localhost') || request.url.startsWith('http://localhost'); 计算方式?",
    options: [],
    correctAnswer: { values: { v: "APP_URL 是 localhost 或当前请求 URL 是 localhost" } },
    blanks: [{ id: "v", placeholder: "条件", acceptedAnswers: ["APP_URL 是 localhost 或当前请求 URL 是 localhost", "APP_URL localhost 或 request.url localhost", "APP_URL 是 localhost 或 request.url 是 localhost"] }],
    explanation: {
      short: "APP_URL 配 localhost 或当前请求 localhost, 都算 dev 预览模式.",
      detail: "两个 OR 条件: 配置上 APP_URL 是 localhost, 或者当前请求 URL 是 localhost. 任意一个为真就开 authPreviewEnabled, 用于 dev 环境的 GoogleOneTap 调试.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 toPublicSession 作用",
    prompt: "toPublicSession(session) 把 session 过滤成什么? (多选)",
    options: [
      { id: "A", text: "过滤敏感字段, 只保留 user / email / avatar / isAdmin 等公开信息" },
      { id: "B", text: "脱敏" },
      { id: "C", text: "性能优化" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "toPublicSession 是敏感字段过滤, 脱敏 + 类型收窄.",
      detail: "session 内部可能有 internalUserId / sessionSecret / csrfToken, 全部走 json() 暴露会泄露. toPublicSession 是 type-level 过滤, 只留公开字段.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q6 requestHasAuthSessionCookie 守门",
    prompt: "const session = requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null; 守门的好处?",
    options: [
      { id: "A", text: "匿名访客只携带 theme/visitor cookie, 避免一次 Better Auth/D1 读, 减少首屏延迟与 D1 负载" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "未登录用户跳过 D1 / session 存储读取, 大幅降低 QPS 与延迟.",
      detail: "项目注释明确写: 'Anonymous requests often only carry theme/visitor cookies; avoid a Better Auth/D1 read until an auth cookie exists.' 这是核心性能优化, 也是隐私边界 (匿名访客不接触数据库).",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: session 守门",
    prompt: "const session = requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null; 出现在 root loader 哪一行?",
    code: `1 export const loader = async ({ request }: LoaderFunctionArgs) => {
2   // 获取主题
3   const theme = await getTheme(request);
4
5   // Anonymous requests often only carry theme/visitor cookies; avoid a Better Auth/D1 read until an auth cookie exists.
6   const session = requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null;
7
8   return json({`,
    options: [],
    linePickLines: [
      { id: "L3", lineNumber: 3, text: "const theme = await getTheme(request);" },
      { id: "L6", lineNumber: 6, text: "const session = requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null;" },
      { id: "L8", lineNumber: 8, text: "return json({" },
    ],
    correctAnswer: { lineId: "L6" },
    explanation: {
      short: "第 6 行三元守门, 跳过匿名访客的 session 读取.",
      detail: "requestHasAuthSessionCookie 是 cookie 检查函数, 有 auth cookie 才读 session, 否则 null. 大幅减少 D1 / KV / 存储查询.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q8 || 短路 vs ??",
    prompt: "getEnvVar('GOOGLE_CLIENT_ID') || '' 用 || 不用 ??'?",
    options: [
      { id: "A", text: "|| 兜底空串, 兼容 undefined / null / '' 多种 falsy 值; getEnvVar 可能返回 undefined" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "|| 兜底, 兼容 falsy 值, 适合 env 默认值场景.",
      detail: "?? 只兜底 null/undefined, 遇到 '' 仍然返回 ''. || 把 '' / 0 / false 都兜底. env 默认值场景用 || 更稳妥.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 toPublicSession 类型",
    prompt: "toPublicSession(session) 的输入输出类型?",
    options: [
      { id: "A", text: "输入 Session | null, 输出 PublicSession | null (null 透传)" },
      { id: "B", text: "输入 string" },
      { id: "C", text: "输入 Session, 输出 void" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "toPublicSession 接受 Session | null, 返回 PublicSession | null, null 透传.",
      detail: "函数签名 toPublicSession(s: Session | null): PublicSession | null. null 时返回 null, 不抛错. 方便匿名用户场景.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
  }),
  q({
    type: "multi_choice",
    title: "Q10 loader 抛出 vs 返回",
    prompt: "root loader 为什么不 throw, 而用 return json({ session: null, ... })? (多选)",
    options: [
      { id: "A", text: "匿名访客是合法状态, 不应该 500 错误" },
      { id: "B", text: "返回 null 让 Layout 渲染无 session UI (GoogleOneTap 弹窗)" },
      { id: "C", text: "避免 ErrorBoundary 接管" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "匿名是合法状态, 返回 null 让 App / Layout 渲染无登录 UI, 避免 ErrorBoundary 接管.",
      detail: "如果 throw, 走 ErrorBoundary 渲染 NotFound404 / RouteErrorBoundary, 体验错乱. 返回 null 是正常空状态, App 根据 session 渲染登录提示.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 googleClientId 公开性",
    prompt: "GOOGLE_CLIENT_ID 公开暴露给前端, 安全风险?",
    options: [
      { id: "A", text: "无风险, Google OAuth Client ID 设计上是 public, 配合 domain 限制与 allowed redirect URIs 防滥用" },
      { id: "B", text: "高风险" },
      { id: "C", text: "应保密" },
      { id: "D", text: "应加密" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Google OAuth Client ID 是 public, 安全性靠 allowed redirect URIs + origin 校验.",
      detail: "OAuth Client ID 暴露在 window.ENV / HTML / JS 是设计预期, 实际安全靠 allowed JS origins / redirect URIs 配置, 不是 secret.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 匿名访客完整 loader 路径",
    prompt: "匿名访客访问 /, root loader 完整路径?",
    options: [
      { id: "theme", text: "getTheme 读 theme cookie, 返回 'light' 或 'dark'" },
      { id: "auth", text: "requestHasAuthSessionCookie 返回 false, session=null" },
      { id: "env", text: "getEnvVar 读 GOOGLE_CLIENT_ID / APP_URL, || '' 兜底" },
      { id: "json", text: "json({ theme, session: null, googleClientId, appUrl, authPreviewEnabled })" },
    ],
    correctAnswer: { pathIds: ["theme", "auth", "env", "json"] },
    explanation: {
      short: "theme → auth 守门 → env → json 返回, 匿名不读 D1.",
      detail: "完整路径: getTheme 读 cookie, auth 守门跳过 D1, env 读配置 (Worker env 缓存), json 包装返回. 匿名访客零 D1 读取, 极快.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "branch_trace",
    title: "Q13 登录用户完整路径",
    prompt: "登录用户访问 /, root loader 路径?",
    options: [
      { id: "theme", text: "getTheme 拿 theme" },
      { id: "auth", text: "requestHasAuthSessionCookie 返回 true" },
      { id: "session", text: "getSessionCached 读 session (可能 cache 命中 / D1 fallback)" },
      { id: "json", text: "toPublicSession 过滤, json 返回完整数据" },
    ],
    correctAnswer: { pathIds: ["theme", "auth", "session", "json"] },
    explanation: {
      short: "登录用户走完整 session 读取链, toPublicSession 脱敏后返回.",
      detail: "getSessionCached 内部先查 Better Auth / D1 缓存, hit 命中 cache, miss 查 D1. toPublicSession 过滤掉 sessionSecret 等敏感字段.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q14 dev 环境特殊值",
    prompt: "dev 环境 (localhost) 启动时, authPreviewEnabled 总是 true 吗?",
    options: [
      { id: "A", text: "是, APP_URL 配 localhost 或当前请求 localhost, 任意一个就 true" },
      { id: "B", text: "否" },
      { id: "C", text: "随机" },
      { id: "D", text: "看时间" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "dev 环境总为 true, 用于 GoogleOneTap 调试.",
      detail: "两个 OR 条件: APP_URL 配 localhost (生产 .env 不会) 或当前 request.url 是 localhost (dev 服务器总是). dev 启动两者都满足, authPreviewEnabled=true.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 session 失败时",
    prompt: "getSessionCached 抛错 (D1 不可用) 时, root loader 行为?",
    options: [
      { id: "A", text: "ErrorBoundary 接管, 渲染 RouteErrorBoundary, 整站 500" },
      { id: "B", text: "返回 session=null, 继续渲染" },
      { id: "C", text: "重试" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "session 抛错走 ErrorBoundary, 整站 500, 不静默吞错.",
      detail: "loader 抛错被 ErrorBoundary 捕获, 这正是边界的作用. 不应该 catch 后返回 null, 因为 D1 不可用是真实错误, 用户应该知道. 这是 'fail fast' 原则.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 toPublicSession",
    prompt: "AI 改坏: AI 觉得 toPublicSession '多此一举' 直接 json({ session, ... }). 后果是?",
    options: [
      { id: "A", text: "session 内部字段 (sessionSecret / csrfToken / internalUserId) 全部进 JSON 响应, 客户端 JS 可读, 严重泄露" },
      { id: "B", text: "更简洁" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "session 内部敏感字段被全量返回, 客户端 JS 可读, 严重安全泄露.",
      detail: "Session 类型有 sessionSecret / csrfToken / internalUserId 等不该公开的字段, toPublicSession 是 type-level 过滤. 删了直接 json(session) 把这些都暴露给 window.__remixContext, 任何浏览器扩展 / 用户脚本都能读.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
    realWorldImpact: "sessionSecret / csrfToken 泄露, 攻击者构造伪造请求绕过 CSRF 防护, 严重安全事件.",
    aiReviewRisk: "为'简洁'删 toPublicSession, 破坏 session 公开契约.",
    wrongAnswerFeedback: {
      B: "删 toPublicSession 是删安全, 不是简洁.",
      C: "TS 不会报错.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 删 requestHasAuthSessionCookie 守门",
    prompt: "AI 改坏: AI 把 const session = requestHasAuthSessionCookie(request) ? ... : null; 改成 const session = await getSessionCached(request);. 后果是?",
    options: [
      { id: "A", text: "匿名访客也跑 getSessionCached, D1 QPS 翻 N 倍, 隐私边界破坏, 性能灾难" },
      { id: "B", text: "更对称" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "匿名访客也读 session, D1 QPS 大涨, 隐私与性能双重问题.",
      detail: "requestHasAuthSessionCookie 是性能与隐私守门, 匿名用户不接触数据库. 删了以后每个匿名请求都查 D1, 项目注释明确警告. D1 账单 + 延迟 + 隐私边界都崩.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
    realWorldImpact: "D1 账单翻倍, 匿名用户每次访问都触发 D1 read, 性能 + 隐私双重事故.",
    aiReviewRisk: "为'对称'删守门, 破坏性能与隐私边界.",
    wrongAnswerFeedback: {
      B: "对称不是目标, 性能 + 隐私才是.",
      C: "TS 不会报错.",
      D: "有严重性能影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 session 整个给前端",
    prompt: "AI 改坏: AI 把 json({ session: toPublicSession(session), sessionSecret: session?.sessionSecret }) 增加 sessionSecret 字段. 后果是?",
    options: [
      { id: "A", text: "sessionSecret 进 JSON 响应, 客户端可读, CSRF 绕过, 严重安全泄露" },
      { id: "B", text: "更灵活" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "sessionSecret 是 server-only 字段, 暴露到 JSON 等于把钥匙给前端.",
      detail: "sessionSecret 用于服务端签名 session cookie, 暴露后攻击者伪造任意 session, 登录任意账号. 是 OAuth 经典 secret 泄露漏洞.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
    realWorldImpact: "sessionSecret 泄露, 攻击者伪造 admin session, 直接接管账号.",
    aiReviewRisk: "为'调试方便'把 secret 暴露, 经典 secret 泄露反模式.",
    wrongAnswerFeedback: {
      B: "灵活不是暴露 secret 的理由.",
      C: "TS 不会报错.",
      D: "有灾难性安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §12.2-TS-1 模型 JSON 直接 as",
    prompt: tsModelJsonDirectCast({
      lessonSlug: "loader-contract",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).prompt,
    options: tsModelJsonDirectCast({
      lessonSlug: "loader-contract",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).options,
    correctAnswer: tsModelJsonDirectCast({
      lessonSlug: "loader-contract",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).correctAnswer as { patchedCode: string },
    explanation: tsModelJsonDirectCast({
      lessonSlug: "loader-contract",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: "app/services/nemesis.server.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/services/nemesis.server.ts"],
    realWorldImpact: "loader's session / theme 字段如果被错改成 as Session, 任何错误字段都能通过编译, 运行时崩.",
    typeSafetyRisk: "as 跳过运行期校验, session 字段伪造数据流到客户端, 安全边界模糊.",
    wrongAnswerFeedback: tsModelJsonDirectCast({
      lessonSlug: "loader-contract",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 改 cookie 守门用 typeof",
    prompt: "AI 改坏: AI 把 const theme = data?.theme || 'light' 改成 const theme = (data?.theme as Theme) || 'light' (loader 已返回正确 theme, 多此一举). 后果是?",
    options: [
      { id: "A", text: "as Theme 是 type cast, 不做运行期校验, 但 loader 已经收窄过, 这里没新增风险, 只是冗余" },
      { id: "B", text: "更稳健" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "as 在 loader 已收窄后是冗余, 不引入风险, 但增加代码噪音.",
      detail: "loader 端 getTheme 已经是 (theme === 'dark' ? 'dark' : 'light') 收窄, 返回值类型 Theme. Layout 这边再 as 是冗余, 不破坏类型, 但让代码不必要地 verbose. 这是 'AI 防御性编程过度' 案例.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "不影响功能, 增加代码噪音, 让维护者怀疑 loader 端是否真的收窄.",
    aiReviewRisk: "为'防御'重复 as, 实际是冗余, 反而掩盖 loader 端的契约.",
    wrongAnswerFeedback: {
      B: "防御性过度不是稳健.",
      C: "TS 不会报错.",
      D: "有可读性影响.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 root loader 公开契约的安全设计",
    prompt: "用自己的话解释 root loader 5 个返回字段各自为什么能 / 不能公开, 以及 toPublicSession 与 requestHasAuthSessionCookie 守门如何配合.",
    options: [],
    correctAnswer: {
      text: "theme 不是 secret, 公开用于 <html> className. session 走 toPublicSession 脱敏, 只留 user / email / avatar / isAdmin, 过滤 sessionSecret / csrfToken / internalUserId. googleClientId 是 OAuth 公开 ID, 安全性靠 allowed origins. appUrl 用于回跳校验. authPreviewEnabled 是 dev 开关. requestHasAuthSessionCookie 守门让匿名访客不读 D1 / session 存储, 减少 QPS + 隐私边界. 两个守门 (匿名跳过 + 公开过滤) 配合, 实现 '不读不需要的数据 + 不暴露不需要的字段'.",
    },
    explanation: {
      short: "匿名跳过读 + 公开过滤字段 = loader 双重安全设计.",
      detail: "两个守门职责正交: 一个控制读, 一个控制暴露. 任何一项被删都破坏安全或性能.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 root loader 的 toPublicSession(session) 删掉, 直接 json({ session, ... }), 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "toPublicSession 是 loader 公开契约的脱敏层, 删了直接 json({ session }) 会把 sessionSecret / csrfToken / internalUserId 等敏感字段暴露到 window.__remixContext, 任何浏览器扩展 / 用户脚本可读, 严重安全泄露. 必须保留 toPublicSession 过滤, 公开 sessionSecret 是经典 OAuth 漏洞.",
    },
    explanation: {
      short: "审查点: toPublicSession 是 loader 公开契约的脱敏层, 不可删.",
      detail: "好的 review 指出 (1) 脱敏的设计意图 (2) 删了暴露的具体字段 (3) 真实可观察的漏洞 (4) 严重性 (CSRF 绕过).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/auth.server.ts"],
  }),
];
