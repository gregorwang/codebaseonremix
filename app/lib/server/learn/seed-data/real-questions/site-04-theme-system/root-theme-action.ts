/**
 * Real questions for site-04-theme-system / root-theme-action.
 *
 * Anchor: remix/app/root.tsx L59-75 (action) + remix/app/utils/theme.server.ts setTheme.
 * 学习目标: root action 处理 theme 切换 form 提交, Set-Cookie 写回.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: remixDropForwardLoaderCacheControl (§18.3-4) — 涉及 Set-Cookie 头
 * 与 response 头传播.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { remixDropForwardLoaderCacheControl } from "../recipes";

const PRIMARY = "app/root.tsx";
const THEME = "app/utils/theme.server.ts";
const TOUCHED = [PRIMARY, THEME];

export const rootThemeActionQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 root action 角色",
    prompt: "root.tsx 的 action 与 loader 的核心区别?",
    options: [
      { id: "A", text: "action 处理 POST/写操作, loader 处理 GET/读操作, RR 7 按 HTTP method 分发" },
      { id: "B", text: "action 更快" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无区别" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "action 写, loader 读, RR 7 按 method 分发.",
      detail: "RR 7 数据模式: action 负责 POST/PUT/DELETE 等写, loader 负责 GET 读. 同名路由可以同时有 loader / action, 框架按 method 路由.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 formData().get('theme')",
    prompt: "const formData = await request.formData(); const theme = formData.get('theme') as Theme; 这一步的语义?",
    options: [
      { id: "A", text: "从 POST body 读 theme 字段, 类型断言成 Theme union" },
      { id: "B", text: "URL query" },
      { id: "C", text: "Cookie" },
      { id: "D", text: "Header" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "formData 解析 application/x-www-form-urlencoded 或 multipart/form-data body.",
      detail: "Remix action 接到的 formData 是 Request body 解析结果, .get(key) 返回 FormDataEntryValue | null, as Theme 强转.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 400 触发条件",
    prompt: "if (theme !== 'light' && theme !== 'dark') return json({ error: 'Invalid theme' }, { status: 400 }); 何时返回 400?",
    options: [
      { id: "A", text: "theme 字段不是 'light' 也不是 'dark' (如 null / 'pink' / 空字符串)" },
      { id: "B", text: "always" },
      { id: "C", text: "never" },
      { id: "D", text: "server error" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "theme 字段非法返回 400, 不写 cookie.",
      detail: "as Theme 后类型撒谎, 实际值可能是 null / 'rainbow' / '', 走 if 兜底返回 400, 不进 setTheme, 保持 cookie 不动.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 Set-Cookie header 写法",
    prompt: "return json({...}, { headers: { _____ : await setTheme(theme, request) } });",
    options: [],
    correctAnswer: { values: { h: "Set-Cookie" } },
    blanks: [{ id: "h", placeholder: "header 名", acceptedAnswers: ["Set-Cookie", "set-cookie", "Set-cookie"] }],
    explanation: {
      short: "Set-Cookie 是标准 HTTP header, 把 cookie 写入浏览器.",
      detail: "Remix 的 json() 接受 headers 选项, 透传 Set-Cookie 让浏览器存 theme cookie. 注意大小写 HTTP/2 不敏感, HTTP/1.1 大小写敏感, 标准是 Set-Cookie.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 action 成功响应",
    prompt: "theme 合法时 action 返回什么? (多选)",
    options: [
      { id: "A", text: "json({ success: true }, { headers: { Set-Cookie: ... } })" },
      { id: "B", text: "Set-Cookie 来自 setTheme(theme, request) serialize" },
      { id: "C", text: "返回 HTML" },
      { id: "D", text: "redirect" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "json + Set-Cookie 头, 不 redirect 不返回 HTML.",
      detail: "action 通常返回结构化 JSON 给前端处理, 不 redirect (让前端决定). Set-Cookie 头让浏览器存新 theme.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 setTheme serialize 含义",
    prompt: "setTheme(theme, request) 的 serialize 调用返回?",
    options: [
      { id: "A", text: "Set-Cookie header 字符串, 包含 theme=...; Max-Age=...; Path=/; ... 等属性" },
      { id: "B", text: "boolean" },
      { id: "C", text: "void" },
      { id: "D", text: "object" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "serialize 返回完整 Set-Cookie header value, 含全部属性.",
      detail: "@remix-run/cloudflare 的 createCookie.serialize 输出 'theme=dark; Max-Age=31536000; Path=/; SameSite=Lax' 这种字符串, 直接塞 Set-Cookie header.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: 400 兜底",
    prompt: "if (theme !== 'light' && theme !== 'dark') 出现在 root action 哪一行?",
    code: `1 export const action = async ({ request }: ActionFunctionArgs) => {
2   const formData = await request.formData();
3   const theme = formData.get("theme") as Theme;
4
5   if (theme !== "light" && theme !== "dark") {
6     return json({ error: "Invalid theme" }, { status: 400 });
7   }
8
9   return json(
10    { success: true },`,
    options: [],
    linePickLines: [
      { id: "L3", lineNumber: 3, text: "const theme = formData.get('theme') as Theme;" },
      { id: "L5", lineNumber: 5, text: "if (theme !== 'light' && theme !== 'dark') {" },
      { id: "L6", lineNumber: 6, text: "return json({ error: 'Invalid theme' }, { status: 400 });" },
      { id: "L9", lineNumber: 9, text: "return json(" },
    ],
    correctAnswer: { lineId: "L5" },
    explanation: {
      short: "第 5 行 显式收窄 theme union, 拒绝任何非 'light' / 'dark'.",
      detail: "as Theme 不做运行期校验, 第 5 行 if 是必要的运行期安全网, null / 'rainbow' 都拒绝, 返回 400 不写 cookie.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 ActionFunctionArgs 类型",
    prompt: "ActionFunctionArgs 与 LoaderFunctionArgs 的区别?",
    options: [
      { id: "A", text: "都来自 @remix-run/cloudflare, action / loader 的 args 类型, 内部都是 { request, params, context }" },
      { id: "B", text: "action 多 body" },
      { id: "C", text: "loader 多 cookie" },
      { id: "D", text: "无区别" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "两个类型结构相同, 内部都是 { request, params, context }.",
      detail: "RR 7 设计: loader / action 拿到的 args 一致, request.headers 包含 method / cookie / body, 业务代码按 method 区分即可.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 setTheme request 参数",
    prompt: "setTheme(theme, request) 为什么需要传 request?",
    options: [
      { id: "A", text: "用来判断 protocol 是 http 还是 https, 决定 secure 标志" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "request 用于动态判断 secure, dev http 不设 Secure, prod https 设.",
      detail: "getThemeCookie(request) 内部 new URL(request.url).protocol === 'https:', 决定 secure 标志, dev / prod 同代码不同行为.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [THEME, PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 action 没有 redirect",
    prompt: "action 写完 cookie 后没 redirect, 直接 return json({ success: true }), 好处? (多选)",
    options: [
      { id: "A", text: "前端拿到 success 状态后自己决定 UI 行为 (重新拉数据 / 显示 toast)" },
      { id: "B", text: "避免整页 reload, 体验更顺" },
      { id: "C", text: "保留 fetcher state 上下文" },
      { id: "D", text: "action 性能更好" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "json 响应让前端灵活处理, redirect 会强制整页跳转.",
      detail: "fetcher / Form submit 拿到 actionData 即可, redirect 会让 RR 重新跑 loader, 整页 reload 体验差. 项目选择 json 是更现代的 SPA 模式.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 await setTheme 是异步",
    prompt: "为什么 setTheme(theme, request) 要 await?",
    options: [
      { id: "A", text: "因为 setTheme 内部 await themeCookie.serialize, serialize 可能是 async (签名 cookie 用 Web Crypto)" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "serialize 可能用 Web Crypto API 签名, 异步.",
      detail: "RR 7 的 createCookie 在传入 secrets 时用 Web Crypto 做 HMAC 签名, 签名是异步. 即使不传 secrets 类型签名也允许 async, 项目用 await 是统一约定.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [THEME, PRIMARY],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 light → dark 切换",
    prompt: "用户当前 light, 提交 theme=dark, 完整链路?",
    options: [
      { id: "form", text: "前端 Form submit, RR 路由到 root action" },
      { id: "parse", text: "action formData.get('theme') === 'dark'" },
      { id: "pass", text: "'dark' === 'dark' 守卫通过" },
      { id: "cookie", text: "setTheme serialize 返回 Set-Cookie, 浏览器更新 cookie 为 dark" },
    ],
    correctAnswer: { pathIds: ["form", "parse", "pass", "cookie"] },
    explanation: {
      short: "Form → action 收 → 守卫通过 → Set-Cookie 写新 theme.",
      detail: "用户切主题, 浏览器发 POST, action 校验通过, Set-Cookie header 写入, 浏览器更新 cookie. 下次请求 loader getTheme 拿到 dark.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "branch_trace",
    title: "Q13 攻击者提交 theme=rainbow",
    prompt: "恶意用户 POST theme=rainbow, 后果?",
    options: [
      { id: "submit", text: "action 收到 formData.theme='rainbow'" },
      { id: "guard", text: "if 守卫 'rainbow' !== 'light' && !== 'dark' 命中" },
      { id: "reject", text: "return json({ error: 'Invalid theme' }, { status: 400 })" },
      { id: "no-write", text: "setTheme 不调用, 浏览器 cookie 不变" },
    ],
    correctAnswer: { pathIds: ["submit", "guard", "reject", "no-write"] },
    explanation: {
      short: "守卫拒绝, 400 + 不写 cookie.",
      detail: "as Theme 让 'rainbow' 也能传过来, 但 if 守卫做运行期校验, 拒绝任何非 union 值, 攻击者无法污染 cookie.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q14 重复提交同一 theme",
    prompt: "用户已经 dark, 再次提交 theme=dark, 行为?",
    options: [
      { id: "A", text: "正常处理, 重新写 cookie (Set-Cookie 头), 浏览器刷新 Max-Age 倒计时" },
      { id: "B", text: "no-op" },
      { id: "C", text: "报错" },
      { id: "D", text: "清空 cookie" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "重复提交仍正常处理, 重新写 cookie 刷新过期时间.",
      detail: "action 不做幂等检查, 每次都重写 Set-Cookie, Max-Age 重新倒计时. 用户体验上无副作用, 但让用户的 theme 偏好永远 fresh.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "single_choice",
    title: "Q15 formData 缺失 theme 字段",
    prompt: "用户提交空 form, formData.get('theme') 是?",
    options: [
      { id: "A", text: "null, 守卫 null !== 'light' 命中, 返回 400" },
      { id: "B", text: "'' (空串), 守卫拒绝" },
      { id: "C", text: "undefined" },
      { id: "D", text: "抛错" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "FormData.get 找不到 key 返回 null, 守卫拒绝, 400.",
      detail: "FormDataEntryValue | null, 缺失字段 null, null !== 'light' 命中, 不会调用 setTheme, 浏览器 cookie 不动.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 if 守卫直接 setTheme",
    prompt: "AI 改坏: AI 觉得 'Theme 已经是 union' 删掉 if 守卫, 直接 await setTheme(theme as Theme, request). 后果是? [root-theme-action]",
    options: [
      { id: "A", text: "恶意 'rainbow' 写进 cookie, 浏览器主题错乱, getTheme 三元兜底到 'light' 但中间态渲染异常" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "as 不做运行期校验, 删守卫让非法值写入 cookie.",
      detail: "as Theme 是 type cast, 'rainbow' 也能传, setTheme serialize 写入 'rainbow'. 用户浏览器收到 cookie 后, 后续请求 getTheme 解析出 'rainbow', 三元 'rainbow' !== 'dark' 退到 'light'. 中间态用户可能看到 1 次 'rainbow' 渲染错乱.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
    realWorldImpact: "恶意 / 错误客户端提交 'rainbow' 写进 cookie, 跨页面渲染时 theme 解析异常, 用户看到 1 次错误主题, 然后回退 'light'.",
    aiReviewRisk: "把'类型 union'当成'自动校验', 忽略 as 不做运行期校验的事实.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, as 强转.",
      C: "删守卫不是简洁是漏洞.",
      D: "有中间态风险.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 用 GET 切 theme",
    prompt: "AI 改坏: AI 把 action 改成 loader, 用 GET ?theme=dark 切主题. 后果是? [root-theme-action]",
    options: [
      { id: "A", text: "GET 是只读, RR 7 路由对 GET 走 loader 不走 action, 用户分享 URL 会污染他人 cookie / CSRF 攻击面" },
      { id: "B", text: "更兼容" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "GET 写操作违反 HTTP 语义 + 触发 CSRF / 浏览器预取污染 cookie.",
      detail: "GET 应该是幂等只读, 写操作必须 POST/PUT. 用 GET 切 theme, 浏览器预取 / 链接预览 / 用户分享 URL 都会触发, 攻击者用 <img src='/?theme=dark'> 就能强制切主题.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "恶意页面 <img src='https://site/?theme=dark'> 强制用户切主题, 反复骚扰. 浏览器预取器也会触发, 浪费资源.",
    aiReviewRisk: "为'兼容性'把写操作搬到 GET, 违反 HTTP 语义 + 引入 CSRF.",
    wrongAnswerFeedback: {
      B: "GET 不更兼容, 反而引入新攻击面.",
      C: "TS 不会报错.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 漏 await setTheme",
    prompt: "AI 改坏: AI 漏 await, headers.Set-Cookie = setTheme(theme, request) 拿到 Promise. 后果是? [root-theme-action]",
    options: [
      { id: "A", text: "Set-Cookie 头变成 '[object Promise]', 浏览器不存 cookie, 主题切换失败" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "无影响" },
      { id: "D", text: "更简洁" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Promise toString 是 '[object Promise]', Set-Cookie 头变垃圾.",
      detail: "createCookie.serialize 是 async, 必须 await. 漏 await 把 Promise 对象塞 header, 浏览器看到 'theme=[object Promise]; ...' 这种废值, 不存 cookie, 用户点切换无反应.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
    realWorldImpact: "用户点切换按钮, 主题不变化, 调试时浏览器 DevTools 看到 Set-Cookie 值是 '[object Promise]', 排查耗时.",
    aiReviewRisk: "把 async/await 当成可省略的 'await', Promise toString 是经典 bug.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, serialize 返回 Promise<string>.",
      C: "有严重功能影响.",
      D: "漏 await 是 bug, 不是简洁.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §18.3-4 删除 forwardLoaderCacheControl",
    prompt: remixDropForwardLoaderCacheControl({
      lessonSlug: "root-theme-action",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).prompt,
    options: remixDropForwardLoaderCacheControl({
      lessonSlug: "root-theme-action",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).options,
    correctAnswer: remixDropForwardLoaderCacheControl({
      lessonSlug: "root-theme-action",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: remixDropForwardLoaderCacheControl({
      lessonSlug: "root-theme-action",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: "app/entry.server.tsx",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/entry.server.tsx", "app/lib/cache-headers.server.ts"],
    realWorldImpact: "action 返回的 Set-Cookie 不透传到 SSR 响应, 浏览器不存 cookie, 主题切换无反应.",
    aiReviewRisk: "把 header 透传当成可有可无, 实际是 cookie 写入的链路.",
    wrongAnswerFeedback: remixDropForwardLoaderCacheControl({
      lessonSlug: "root-theme-action",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 删 SameSite Lax",
    prompt: "AI 改坏: AI 把 sameSite: 'lax' 改成不设 (默认 'strict'). 后果是?",
    options: [
      { id: "A", text: "用户从外部链接点进来 theme cookie 不带, 主题回退 light, 体验不一致" },
      { id: "B", text: "更安全" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "strict 让外部链接进入也不带 cookie, 主题体验回退.",
      detail: "lax 已经是 CSRF 防护 + 顶部导航带 cookie 的平衡点, 改成 strict 后用户从外部链接 (例如 Google 搜索结果) 点进来时 theme cookie 不带, SSR 用 'light' 默认, 体验不一致.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: THEME,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
    realWorldImpact: "暗色模式用户从外部链接进入站点, 看到一次白闪 + light 主题, 必须切一次才回 dark.",
    aiReviewRisk: "为'更安全'把 sameSite 调严, 牺牲顶部导航的体验.",
    wrongAnswerFeedback: {
      B: "lax 已经够安全, 过度严格反而损失 UX.",
      C: "TS 不会报错.",
      D: "有体验影响.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 root action 写 cookie 的安全设计",
    prompt: "用自己的话解释 root action 为什么必须 (1) 显式 if 守卫 union (2) 走 action 不走 loader (3) 写 Set-Cookie 而不写 localStorage.",
    options: [],
    correctAnswer: {
      text: "(1) as Theme 是编译期谎言, 必须 if 守卫做运行期校验, 拒绝 'rainbow' 等非法值, 防止 cookie 污染. (2) GET 是只读, 写 cookie 必须 POST, 走 action. GET 切主题会触发浏览器预取 + 分享 URL 攻击 + <img> 强制切换. (3) Set-Cookie 让浏览器自动管理 cookie 过期与同步, 跨标签页生效, 防闪烁 inline script 能读到. localStorage 是 client-only, SSR 拿不到, 闪屏回归, 跨标签页也不同步.",
    },
    explanation: {
      short: "三道安全网: union 校验 + HTTP method + Set-Cookie 头.",
      detail: "三道防护围绕 'cookie 写入是写操作' 与 '防闪烁需要 SSR + CSR 都能读' 设计, 任何一项改动都破坏安全或体验.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 root action 改成 GET loader 切 theme, 写一条 review comment (1-2 句). [root-theme-action]",
    options: [],
    correctAnswer: {
      comment: "写操作必须 POST, 用 GET 切 theme 会让 <img src='/?theme=light'> 强制用户切主题 (CSRF), 浏览器预取器也会意外触发. 请保留 action 走 POST, 通过 fetcher / Form 提交, 与 HTTP 语义对齐.",
    },
    explanation: {
      short: "审查点: 写操作走 POST, 防止 CSRF 与意外触发.",
      detail: "好的 review 指出 (1) HTTP method 与操作类型 (2) <img> 攻击路径 (3) 浏览器预取副作用 (4) 给出明确改法.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
];
