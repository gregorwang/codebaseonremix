/**
 * Real questions for site-14-loader-read / cookie-read.
 *
 * Anchor: remix/app/root.tsx L34-37 (theme / session 读取) + remix/app/utils/theme.server.ts +
 *          remix/app/lib/auth.server.ts (requestHasAuthSessionCookie, getSessionCached).
 * 学习目标: loader 读 cookie 的流程, theme 走 getTheme, session 走 requestHasAuthSessionCookie 守门
 * + getSessionCached.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: tsChatAttachmentFlatten (§12.2-TS-2) — 涉及 discriminated union 退化.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { tsChatAttachmentFlatten } from "../recipes";

const PRIMARY = "app/root.tsx";
const THEME = "app/utils/theme.server.ts";
const AUTH = "app/lib/auth.server.ts";
const TOUCHED = [PRIMARY, THEME, AUTH];

export const cookieReadQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 request.headers.get('Cookie')",
    prompt: "request.headers.get('Cookie') 返回什么?",
    options: [
      { id: "A", text: "请求头里的 Cookie 字符串, 例如 'theme=dark; auth_session=abc'" },
      { id: "B", text: "JSON" },
      { id: "C", text: "object" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Cookie header 是 string, 多个 cookie 用 '; ' 分隔.",
      detail: "HTTP Cookie header 是字符串, 多个 cookie 用 '; ' (分号空格) 分隔. createCookie.parse 接受这个 string 解析出指定 cookie.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q2 createCookie.parse 异常",
    prompt: "themeCookie.parse(cookieHeader) 找不到 theme 时返回?",
    options: [
      { id: "A", text: "null" },
      { id: "B", text: "undefined" },
      { id: "C", text: "空串" },
      { id: "D", text: "抛错" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "parse 找不到 cookie 返回 null, 项目用 nullish 兜底.",
      detail: "createCookie.parse 类型签名 Promise<string | null>, 找不到返回 null. 项目 'dark' ? 'dark' : 'light' 三元处理 null.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q3 getSessionCached 缓存",
    prompt: "getSessionCached(request) 的 'Cached' 含义?",
    options: [
      { id: "A", text: "内部用 better-auth cache, 命中时直接返回不查 D1, miss 才查" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Cached 表示内部有缓存层, 命中时免 D1 read.",
      detail: "better-auth 提供 cache API, getSessionCached 内部先查 cache, hit 返回, miss 才查 D1. 这是性能优化关键, 配合 requestHasAuthSessionCookie 守门, 减少 D1 QPS.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: AUTH,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [AUTH],
  }),
  q({
    type: "fill_blank",
    title: "Q4 auth session cookie 名字",
    prompt: "requestHasAuthSessionCookie 检查名为 _____ 的 cookie.",
    options: [],
    correctAnswer: { values: { k: "better-auth.session_token" } },
    blanks: [{ id: "k", placeholder: "cookie 名", acceptedAnswers: ["better-auth.session_token", "session_token", "auth-session", "session"] }],
    explanation: {
      short: "better-auth 默认 session cookie 名是 better-auth.session_token.",
      detail: "requestHasAuthSessionCookie 检查 better-auth.session_token 是否存在, 这是 better-auth 默认命名约定. 也可能因配置而变.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: AUTH,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [AUTH],
  }),
  q({
    type: "multi_choice",
    title: "Q5 getTheme 涉及文件",
    prompt: "getTheme 间接涉及? (多选)",
    options: [
      { id: "A", text: "createCookie from @remix-run/cloudflare" },
      { id: "B", text: "Theme union type" },
      { id: "C", text: "request.headers" },
      { id: "D", text: "localStorage" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "createCookie + Theme type + request.headers 都涉及, localStorage 不涉及.",
      detail: "getTheme 内部 createCookie 包装 + Theme 收窄 + request 读 Cookie header. localStorage 是 client-only, 服务端不可用.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q6 getSessionCached 返回类型",
    prompt: "getSessionCached(request) 返回?",
    options: [
      { id: "A", text: "Promise<Session | null>, 找不到或失败返回 null" },
      { id: "B", text: "Promise<Session>" },
      { id: "C", text: "Session" },
      { id: "D", text: "void" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Promise<Session | null>, 失败或找不到都 null.",
      detail: "better-auth 的 getSession 返回 Session | null, 失败时 null. 配合 requestHasAuthSessionCookie 守门, 大部分匿名场景不会调 getSessionCached, 性能 + 隐私双赢.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: AUTH,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [AUTH],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: getTheme 调用",
    prompt: "const theme = await getTheme(request); 出现在 root loader 哪一行?",
    code: `1 export const loader = async ({ request }: LoaderFunctionArgs) => {
2   // 获取主题
3   const theme = await getTheme(request);
4
5   // Anonymous requests often only carry theme/visitor cookies; avoid a Better Auth/D1 read until an auth cookie exists.
6   const session = requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null;`,
    options: [],
    linePickLines: [
      { id: "L3", lineNumber: 3, text: "const theme = await getTheme(request);" },
      { id: "L6", lineNumber: 6, text: "const session = requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null;" },
    ],
    correctAnswer: { lineId: "L3" },
    explanation: {
      short: "第 3 行 await getTheme, 必跑, 拿到当前用户 theme.",
      detail: "getTheme 是同步 cheap 操作 (cookie parse, 不查 D1), 任何用户都要拿到 theme 用于 <html> className. session 才有守门, theme 不需要.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "single_choice",
    title: "Q8 requestHasAuthSessionCookie 是 boolean 还是 async?",
    prompt: "requestHasAuthSessionCookie(request) 是不是 async?",
    options: [
      { id: "A", text: "同步, 返回 boolean, 只查 request headers, 不读 D1" },
      { id: "B", text: "async" },
      { id: "C", text: "无" },
      { id: "D", text: "随机" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "requestHasAuthSessionCookie 是同步, 只查 request.headers.get('Cookie').",
      detail: "守门目的是'避免 D1 read', 必须是同步, 只查 Cookie header 里是否有 auth session cookie. 同步判断后再决定是否 await getSessionCached.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: AUTH,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [AUTH],
  }),
  q({
    type: "single_choice",
    title: "Q9 toPublicSession 性能",
    prompt: "toPublicSession(session) 性能开销?",
    options: [
      { id: "A", text: "极低, 只是字段过滤, 没有 D1 / 网络 / 加密" },
      { id: "B", text: "高" },
      { id: "C", text: "中" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "toPublicSession 是纯字段 pick / omit, 复杂度 O(字段数), 不查数据库.",
      detail: "toPublicSession 内部用 pick / omit / 浅拷贝, 一次遍历 session 字段, 输出新对象. 微秒级, 不影响性能. 把它当 cheap 操作.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: AUTH,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [AUTH],
  }),
  q({
    type: "multi_choice",
    title: "Q10 loader 内的 await 数量",
    prompt: "root loader 内部 await 几次? (多选相关)",
    options: [
      { id: "A", text: "getTheme (Theme union 收窄)" },
      { id: "B", text: "getSessionCached (匿名时跳过)" },
      { id: "C", text: "getEnvVar (env 读)" },
      { id: "D", text: "AI Gateway" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "getTheme + getSessionCached (条件) + getEnvVar 都 await, AI Gateway 不在 root loader.",
      detail: "匿名场景下 getSessionCached 跳过, 只 await 1 次 getTheme. 登录场景下 await 2-3 次. getEnvVar 在 Worker env 缓存命中时几乎无开销.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME, AUTH, "app/utils/cloudflare-env.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q11 getSessionCached 内部缓存",
    prompt: "getSessionCached 命中缓存时, 还走 D1 吗?",
    options: [
      { id: "A", text: "不, 命中时直接返回, 零 D1 read" },
      { id: "B", text: "是" },
      { id: "C", text: "看情况" },
      { id: "D", text: "随机" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "命中时直接返回 cached session, 不查 D1.",
      detail: "better-auth 的 cache API 内部维护 session cache, 命中时省去 D1 read. 配合 requestHasAuthSessionCookie 守门, 缓存命中率高 (登录用户频繁访问), D1 QPS 大幅降低.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: AUTH,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [AUTH],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 首次访问 cookie 缺失",
    prompt: "用户首次访问, 没 theme / auth cookie, loader 完整路径?",
    options: [
      { id: "theme", text: "getTheme parse(null) 返回 null, 兜底 'light'" },
      { id: "auth", text: "requestHasAuthSessionCookie 检查, 找不到 auth cookie, 返回 false" },
      { id: "session", text: "session = null" },
      { id: "json", text: "json({ theme: 'light', session: null, ... })" },
    ],
    correctAnswer: { pathIds: ["theme", "auth", "session", "json"] },
    explanation: {
      short: "无 cookie → theme 兜底 → auth 守门 false → session null → json.",
      detail: "首次访问, 两段读取都拿不到值, 但都正常处理, 不抛错. 用户拿到 theme='light' session=null 的合法响应, 不需要任何 user education.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 缓存命中登录用户",
    prompt: "已登录用户重复访问, 缓存命中时?",
    options: [
      { id: "auth", text: "requestHasAuthSessionCookie true" },
      { id: "cache", text: "getSessionCached 命中 cache, 0 D1 read" },
      { id: "public", text: "toPublicSession 过滤敏感字段" },
      { id: "json", text: "json 返回完整数据" },
    ],
    correctAnswer: { pathIds: ["auth", "cache", "public", "json"] },
    explanation: {
      short: "auth 守门 true → cache 命中 → 过滤 → json, 极快.",
      detail: "已登录用户高频访问, cache 命中率高, D1 QPS 几乎为零. 这就是 cache 层存在的意义, 守门 + 缓存双重优化.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 theme 缓存层",
    prompt: "theme 读取有没有缓存层?",
    options: [
      { id: "A", text: "没有, 每次都 parse Cookie header, 但 parse 是 O(1) 字符串操作, 不需要缓存" },
      { id: "B", text: "有" },
      { id: "C", text: "随机" },
      { id: "D", text: "看情况" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "theme parse 是 O(1) 字符串操作, 不需要缓存.",
      detail: "Cookie header 解析是字符串正则匹配, 微秒级, 不查任何外部存储, 缓存没有收益. session 不同, 需要查 D1, 必须缓存.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q15 cookie header 损坏",
    prompt: "用户请求的 Cookie header 被恶意改成 'theme=rainbow; malformed=%%', getTheme 行为?",
    options: [
      { id: "A", text: "parse 容错处理, theme=rainbow 不等于 'dark', 兜底 'light', 整个流程不抛错" },
      { id: "B", text: "抛错" },
      { id: "C", text: "崩溃" },
      { id: "D", text: "返回 rainbow" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "parse 容错, theme=rainbow 被兜底, 损坏 cookie 不影响流程.",
      detail: "createCookie.parse 用正则匹配 theme=xxx, 损坏 cookie 不影响正确字段匹配. 拿到 'rainbow' 走 'dark' ? 'dark' : 'light' 三元, 兜底 'light'. 整段代码容错性极强.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把 getTheme 改同步",
    prompt: "AI 改坏: AI 觉得 await 多余, 删掉 await 直接 getTheme(request). 后果是?",
    options: [
      { id: "A", text: "getTheme 返回 Promise, 不 await 拿到 Promise 对象, theme 变量是 Promise, 后续 theme === 'dark' 永远 false" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "不 await 拿到 Promise 对象, theme === 'dark' 永远 false, 全部走 light 兜底.",
      detail: "createCookie.parse 是 async, getTheme 也是 async. 不 await 拿到 Promise<Theme>, 后续 theme === 'dark' 是 Promise === 'dark' 永远 false. 用户永远看到 light 主题, 暗色模式失效.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
    realWorldImpact: "暗色用户全部看到 light 主题, 必须清 cookie 才能恢复, 体验灾难.",
    aiReviewRisk: "为'简洁'漏 await, async 函数的常见 bug.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, Promise<Theme> 也是合法 Theme 引用.",
      C: "漏 await 是 bug 不是简洁.",
      D: "有严重功能影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把 getTheme 改成读 localStorage",
    prompt: "AI 改坏: AI 觉得 'localStorage 更快', 把 getTheme 改成 typeof document !== 'undefined' ? localStorage.getItem('theme') : null. 后果是?",
    options: [
      { id: "A", text: "loader 在 Worker 跑, document / localStorage 不存在, 永远返回 null, 全部走 light 兜底" },
      { id: "B", text: "更高效" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "loader 跑在 Worker, 没有 localStorage, 全部走 light 兜底.",
      detail: "Cloudflare Workers 跑 loader, 完全没有 document / localStorage. typeof 守卫返回 null, 三元兜底 light, 暗色用户全失效. AI 错把 server 当 client.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, THEME],
    realWorldImpact: "所有用户都看到 light 主题, 暗色功能完全失效, 整个主题系统被破坏.",
    aiReviewRisk: "把 server / client 边界混淆, 用 client API 实现 server 逻辑.",
    wrongAnswerFeedback: {
      B: "localStorage 在 server 不可用, 反而更慢 (typeof 判断 + 错误路径).",
      C: "TS 不会报错.",
      D: "有严重功能影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 getSessionCached 改直接 query D1",
    prompt: "AI 改坏: AI 觉得 cache '不可靠' 改成 db.selectFrom('session').where(...).execute(). 后果是?",
    options: [
      { id: "A", text: "D1 QPS 暴涨, 每次 loader 都查 D1, 性能灾难, 偏离 better-auth 缓存设计" },
      { id: "B", text: "更可靠" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "D1 QPS 暴涨, 每次都查, 性能与费用双重问题.",
      detail: "cache 是 better-auth 的设计, 命中率高, 免 D1 read. 改直查 D1 之后每个请求都打 D1, QPS 大涨, 账单 + 延迟双重问题. cache '不可靠' 是 AI 幻觉, 实际上 better-auth cache 已经过测试.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: AUTH,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [AUTH],
    realWorldImpact: "D1 账单 + 延迟双重上升, 高频登录用户体验变慢.",
    aiReviewRisk: "为'可靠'绕过成熟库的缓存层, 重复造轮子.",
    wrongAnswerFeedback: {
      B: "绕过 cache 不可靠.",
      C: "TS 不会报错.",
      D: "有性能影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §12.2-TS-2 附件大对象丢 union",
    prompt: tsChatAttachmentFlatten({
      lessonSlug: "cookie-read",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).prompt,
    options: tsChatAttachmentFlatten({
      lessonSlug: "cookie-read",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).options,
    correctAnswer: tsChatAttachmentFlatten({
      lessonSlug: "cookie-read",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: tsChatAttachmentFlatten({
      lessonSlug: "cookie-read",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: "app/types/chat.ts",
    layer: "ai-review",
    serverClientBoundary: "shared",
    touchedFiles: ["app/types/chat.ts"],
    typeSafetyRisk: "Session 类型也是 discriminated union (provider / expires / role), 退化成可选字段大对象后, 字段组合非法状态编译期不报.",
    realWorldImpact: "session 字段组合错误 (例如 user 存在但 isAdmin 缺失), 渲染 admin UI 时 null pointer.",
    wrongAnswerFeedback: tsChatAttachmentFlatten({
      lessonSlug: "cookie-read",
      courseSlug: "site-14-loader-read",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 cookie header 写错大小写",
    prompt: "AI 改坏: AI 觉得 headers.get('cookie') 一样能跑, 改成小写. 后果是?",
    options: [
      { id: "A", text: "HTTP/1.1 header 名字大小写不敏感, 但 request.headers.get 接受小写也行, 实际不报错" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "cookie 永远为空" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "HTTP/1.1 header 名字大小写不敏感, 小写也能跑.",
      detail: "fetch API 的 Headers 对象大小写不敏感, 'cookie' 'Cookie' 'COOKIE' 都返回同一值. 改小写不会破坏功能, 但与项目约定风格不一致. 改不改都可以.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "无功能影响, 但与项目其他文件风格不一致, 增加认知负担.",
    aiReviewRisk: "过度警告大小写, 实际 fetch API 容忍小写.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, Headers.get 接受任意大小写.",
      C: "不会为空, Headers 是 case-insensitive.",
      D: "有风格影响, 无功能影响.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 root loader 的两段读 cookie 流",
    prompt: "用自己的话解释 root loader 为什么 theme 直接 getTheme 但 session 要先 requestHasAuthSessionCookie 守门再 getSessionCached, 两个守门各自的目的.",
    options: [],
    correctAnswer: {
      text: "theme 是 'cheap 操作', 只 parse Cookie header (O(1) 字符串), 不查 D1, 没有隐私问题, 任何用户都跑. session 是 'expensive + sensitive 操作', 涉及 D1 / Better Auth, 还涉及用户身份. 必须先 requestHasAuthSessionCookie 同步守门, 没 auth cookie 就跳过, 实现 (1) 性能: 匿名访客不查 D1 (2) 隐私: 匿名访客不接触数据库 (3) 简化: getSessionCached 假定一定有 cookie, 内部不重复检查. 两个守门一个控制是否读, 一个控制读后如何过滤 (toPublicSession), 完整形成 loader 的'少读 + 不暴露'双重设计.",
    },
    explanation: {
      short: "theme cheap 直接读, session expensive + sensitive 必须守门.",
      detail: "读取操作的成本 + 敏感度决定要不要守门. theme 不守门没损失, session 不守门性能与隐私都崩.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 requestHasAuthSessionCookie 守门删掉, 直接 await getSessionCached(request), 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "requestHasAuthSessionCookie 是性能 + 隐私双重守门, 删了以后匿名访客也查 D1, QPS 翻 N 倍, 隐私边界破坏, 项目注释明确警告. 任何改动必须保留该守门, 这是 root loader 的核心设计契约.",
    },
    explanation: {
      short: "审查点: requestHasAuthSessionCookie 是双重守门, 不可删.",
      detail: "好的 review 指出 (1) 守门的设计意图 (2) 删了性能 + 隐私双重后果 (3) 项目注释明确警告 (4) 必须保留.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, AUTH],
  }),
];
