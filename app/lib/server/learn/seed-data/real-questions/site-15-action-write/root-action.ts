/**
 * Real questions for site-15-action-write / root-action.
 *
 * Anchor: remix/app/root.tsx L59-75 (action) + remix/app/utils/theme.server.ts setTheme.
 * 学习目标: root action 是全站唯一 theme 切换入口, 必须 union 守门 + Set-Cookie 头.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: reactSubmitDomDisabledOnly (§19.2-3) — 涉及 fetcher / Form 提交.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { reactSubmitDomDisabledOnly } from "../recipes";

const PRIMARY = "app/root.tsx";
const THEME = "app/utils/theme.server.ts";
const TOUCHED = [PRIMARY, THEME];

export const rootActionQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 root action 唯一职责",
    prompt: "root action 唯一处理什么?",
    options: [
      { id: "A", text: "主题切换 form 提交, 写 theme cookie, 拒绝非法值" },
      { id: "B", text: "登录" },
      { id: "C", text: "AI Gateway" },
      { id: "D", text: "D1 写" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "root action 只处理 theme 切换, 单一职责.",
      detail: "项目把 theme 切换放 root action 而不是子路由, 任何地方 submit 都能触发 (因为 root.tsx 是 layout, 任何路由都能 reach). 其他写操作放子路由 action.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 formData 字段名",
    prompt: "formData.get('theme') 字段名为什么是 'theme'?",
    options: [
      { id: "A", text: "与 Theme union / cookie / 前端表单一致, 字符串约定" },
      { id: "B", text: "随便" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "'theme' 字段名是前后端字符串约定, 协调 cookie / Type / form.",
      detail: "Theme union / theme cookie / form 字段都用 'theme', 这是三层一致的字符串约定. 任何不匹配都会导致 form 提交后 action 拿不到正确值.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "single_choice",
    title: "Q3 status 400 vs 422",
    prompt: "为什么用 status: 400 而不是 422?",
    options: [
      { id: "A", text: "400 Bad Request 表示客户端提交了非法字段, 422 Unprocessable Entity 更精确, 项目用 400 是简化约定" },
      { id: "B", text: "422 不存在" },
      { id: "C", text: "无区别" },
      { id: "D", text: "看心情" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "400 是更广泛的'客户端错误'状态码, 422 是 RFC 4918 WebDAV 引入, 项目用 400 简化.",
      detail: "400 表示 '请求格式不对或字段非法', 涵盖大多数客户端错误. 422 语义更精确 (请求格式对, 但语义不通过), 但浏览器 / 客户端处理 400 / 422 通常一致, 项目用 400 简化.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 if 守卫两个值",
    prompt: "if (theme !== 'light' && theme !== 'dark') 守卫两个合法值, 分别是 _____ 与 _____.",
    options: [],
    correctAnswer: { values: { v: "light, dark" } },
    blanks: [{ id: "v", placeholder: "两个值", acceptedAnswers: ["light, dark", "light 与 dark", "light/dark"] }],
    explanation: {
      short: "守卫 'light' 与 'dark', 其他值全部 400.",
      detail: "Theme union 是 'light' | 'dark' 字面量联合, if 守卫是必要的运行期校验, 任何 'rainbow' / null / '' 都拒绝.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "multi_choice",
    title: "Q5 setTheme serialize 内容",
    prompt: "setTheme(theme, request) 返回的 Set-Cookie 字符串包含? (多选)",
    options: [
      { id: "A", text: "theme=light 或 theme=dark" },
      { id: "B", text: "Max-Age=31536000" },
      { id: "C", text: "Path=/" },
      { id: "D", text: "SameSite=Lax" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "theme + Max-Age + Path + SameSite 都在 Set-Cookie 字符串里.",
      detail: "createCookie.serialize 输出 'theme=dark; Max-Age=31536000; Path=/; SameSite=Lax' 这种标准字符串, 浏览器解析后存 cookie. secure 标志根据 request.url 动态加.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q6 action 与 loader 共存",
    prompt: "root.tsx 同时有 loader 与 action, RR 7 怎么分发?",
    options: [
      { id: "A", text: "GET 走 loader, POST/PUT/DELETE 走 action, 同一文件多个 export" },
      { id: "B", text: "无" },
      { id: "C", text: "二选一" },
      { id: "D", text: "随机" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "GET 走 loader, POST/PUT/DELETE 走 action, 同一文件共存.",
      detail: "RR 7 路由模块可以同时 export loader / action / default, 框架按 HTTP method 分发. 同一用户访问 / 时跑 loader, 提交 theme 表单时跑 action.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: formData 读取",
    prompt: "const theme = formData.get('theme') as Theme; 出现在 root action 哪一行?",
    code: `1 export const action = async ({ request }: ActionFunctionArgs) => {
2   const formData = await request.formData();
3   const theme = formData.get("theme") as Theme;
4
5   if (theme !== "light" && theme !== "dark") {
6     return json({ error: "Invalid theme" }, { status: 400 });
7   }`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "const formData = await request.formData();" },
      { id: "L3", lineNumber: 3, text: "const theme = formData.get('theme') as Theme;" },
      { id: "L5", lineNumber: 5, text: "if (theme !== 'light' && theme !== 'dark') {" },
      { id: "L6", lineNumber: 6, text: "return json({ error: 'Invalid theme' }, { status: 400 });" },
    ],
    correctAnswer: { lineId: "L3" },
    explanation: {
      short: "第 3 行 formData.get('theme') + as Theme, 编译期谎言 + 必要的 if 守卫.",
      detail: "as Theme 是 type cast, 不做运行期校验. if 守卫是必要的运行期安全网, 任何 'rainbow' / null / '' 都拒绝.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 等待 await formData",
    prompt: "为什么 await request.formData()?",
    options: [
      { id: "A", text: "formData 是异步读取, 解析 application/x-www-form-urlencoded 或 multipart/form-data body" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "formData 是异步, 等 body 解析完才返回 FormData 对象.",
      detail: "Request.formData() 内部 stream body, 解析所有 form fields, 异步返回 FormData. 必须 await 才能拿到 .get(key).",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 headers 选项透传",
    prompt: "json({...}, { headers: { 'Set-Cookie': ... } }) 第二个参数作用?",
    options: [
      { id: "A", text: "ResponseInit 选项, 透传 Set-Cookie / Cache-Control 等 HTTP 头" },
      { id: "B", text: "性能" },
      { id: "C", text: "无" },
      { id: "C", text: "装饰" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "json() 第二个参数是 ResponseInit, 透传 HTTP 头.",
      detail: "json() 接受标准 ResponseInit, 包括 status / statusText / headers. headers 是 Record<string, string>, Set-Cookie 是常见键, 让浏览器存 cookie.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 action 不抛错",
    prompt: "action 不抛错而 return json, 原因? (多选)",
    options: [
      { id: "A", text: "非法 theme 是预期输入, 不该让 ErrorBoundary 接管整站" },
      { id: "B", text: "json 响应让前端拿到 error 信息并显示" },
      { id: "C", text: "性能更好" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "非法 theme 是预期输入, 用 json 响应传递错误信息, 不让 ErrorBoundary 接管.",
      detail: "throw 走 ErrorBoundary 渲染整站错误页, 体验重. json 响应让前端 (fetcher) 拿到 { error: 'Invalid theme' } 在 UI 上提示'主题不合法', 用户继续操作.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 success 字段用途",
    prompt: "action 返回 json({ success: true }, ...) 的 success 字段?",
    options: [
      { id: "A", text: "前端 fetcher.actionData.success 判断是否成功, 决定 UI 行为" },
      { id: "B", text: "TS" },
      { id: "C", text: "性能" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "success 字段让前端判断 action 成功, 配合 Set-Cookie 实际写 cookie.",
      detail: "前端用 useFetcher / Form submit, 拿到 actionData, 看 success=true 决定更新 UI (toast '主题已切换'). success=false 时显示 error 信息.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 light → dark 切换完整路径",
    prompt: "用户在 light 主题下点切换, 提交 theme=dark, 完整路径?",
    options: [
      { id: "submit", text: "前端 Form submit, RR 路由到 root action" },
      { id: "parse", text: "action 解析 formData, theme='dark'" },
      { id: "pass", text: "'dark' 守卫通过" },
      { id: "cookie", text: "setTheme serialize 写 Set-Cookie, 浏览器更新 cookie, 后续 loader 拿到 dark" },
    ],
    correctAnswer: { pathIds: ["submit", "parse", "pass", "cookie"] },
    explanation: {
      short: "Form → action 收 → 守卫 → Set-Cookie 写新 theme.",
      detail: "用户点切换按钮, 浏览器 POST 表单, action 解析, 守卫通过, Set-Cookie 写新 theme, 浏览器更新 cookie. 后续 loader getTheme 拿到 dark, 渲染 dark 主题.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "branch_trace",
    title: "Q13 攻击者 POST theme=rainbow",
    prompt: "恶意用户 POST theme=rainbow, 完整路径?",
    options: [
      { id: "submit", text: "action 收到 formData.theme='rainbow'" },
      { id: "guard", text: "if 'rainbow' !== 'light' && !== 'dark' 命中" },
      { id: "reject", text: "return json({ error: 'Invalid theme' }, { status: 400 })" },
      { id: "no-write", text: "setTheme 不调用, 浏览器 cookie 不变" },
    ],
    correctAnswer: { pathIds: ["submit", "guard", "reject", "no-write"] },
    explanation: {
      short: "守卫拒绝, 400 + 不写 cookie, 攻击面被堵死.",
      detail: "as Theme 让 'rainbow' 也能传过来, if 守卫做运行期校验, 拒绝任何非 union 值, 攻击者无法污染 cookie.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "single_choice",
    title: "Q14 并发切换 race",
    prompt: "用户连点切换按钮两次 (light → dark → light), 行为?",
    options: [
      { id: "A", text: "两次 POST 都会发, 第二次的 Set-Cookie 覆盖第一次, 最终 cookie 是 light, 守卫都通过" },
      { id: "B", text: "第二次被忽略" },
      { id: "C", text: "loader 错误" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "两次请求并发, 浏览器按响应顺序处理 Set-Cookie, 最终 cookie 是最后一次.",
      detail: "RR fetcher 两次 POST 并发, 两次都守卫通过, 两次都 Set-Cookie 写新 theme. 浏览器按响应到达顺序处理, 最终 cookie 是最后一次响应的 Set-Cookie. 用户体验上像快速切换.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "single_choice",
    title: "Q15 Set-Cookie 失败",
    prompt: "action 写 Set-Cookie 时 browser 因为安全策略拒绝 (跨域 / SameSite), 后果?",
    options: [
      { id: "A", text: "浏览器静默丢弃 cookie, 用户主题不切换, action 返回 success=true 但用户感知无变化" },
      { id: "B", text: "action 报错" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "浏览器静默丢弃 cookie, action 不知道, success=true 误导用户.",
      detail: "SameSite / Secure / Domain 策略不符时, 浏览器静默丢弃 Set-Cookie, 不报错. action 返回 success=true 但 cookie 没存, 用户下次访问主题不变. 这种情况调试需要 DevTools 查 Application > Cookies.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [THEME],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 if 守卫",
    prompt: "AI 改坏: AI 觉得 'Theme 已经是 union' 删掉 if 守卫, 直接 await setTheme(theme as Theme, request). 后果是?",
    options: [
      { id: "A", text: "恶意 'rainbow' 写进 cookie, 浏览器主题错乱, getTheme 兜底 'light' 但中间态渲染异常" },
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
    title: "Q17 AI 把 action 改 loader (GET 切主题)",
    prompt: "AI 改坏: AI 把 action 改成 loader, 用 GET ?theme=dark 切主题. 后果是?",
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
    prompt: "AI 改坏: AI 漏 await, headers.Set-Cookie = setTheme(theme, request) 拿到 Promise. 后果是?",
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
    title: "Q19 引用 §19.2-3 submit 状态只看 DOM",
    prompt: reactSubmitDomDisabledOnly({
      lessonSlug: "root-action",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).prompt,
    options: reactSubmitDomDisabledOnly({
      lessonSlug: "root-action",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).options,
    correctAnswer: reactSubmitDomDisabledOnly({
      lessonSlug: "root-action",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: reactSubmitDomDisabledOnly({
      lessonSlug: "root-action",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "主题切换按钮的 disabled 状态如果用 useState 本地维护, 路由切换或 fetcher revalidate 时不会自动重置, 按钮卡死, 用户无法切换.",
    aiReviewRisk: "把 RR fetcher.state 当成装饰品, 自己重造状态机, 必然漂移.",
    wrongAnswerFeedback: reactSubmitDomDisabledOnly({
      lessonSlug: "root-action",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 action 改返回 redirect",
    prompt: "AI 改坏: AI 把 return json({ success: true }, ...) 改成 return redirect('/?theme=' + theme). 后果是?",
    options: [
      { id: "A", text: "整页 reload, RR 重新跑 loader, 切主题延迟 200-500ms, 体验糟" },
      { id: "B", text: "更直观" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "更安全" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "redirect 触发整页 reload, RR 重新跑 loader, 切主题延迟翻倍, 体验糟.",
      detail: "redirect 是浏览器级跳转, 整页 reload, 重新跑 root loader, 重新 SSR, 重新 hydrate. 用户点一次切换 200-500ms 内看到主题切换, 体验退步. 现代 SPA 用 fetcher / json 即可.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户每次切换主题看到一次整页 reload 闪烁, 体验糟, 与项目设计 (fetcher) 背离.",
    aiReviewRisk: "为'直观'用 redirect, 实际上整页 reload 退步.",
    wrongAnswerFeedback: {
      B: "直观不是 reload 的理由.",
      C: "TS 不会报错.",
      D: "更不安全 (整页 reload).",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 root action 的安全设计",
    prompt: "用自己的话解释 root action 为什么必须 (1) 显式 if 守卫 union (2) 走 action 不走 loader (3) 写 Set-Cookie 而不写 localStorage (4) 返回 json 不 redirect.",
    options: [],
    correctAnswer: {
      text: "(1) as Theme 是编译期谎言, 必须 if 守卫做运行期校验, 拒绝 'rainbow' 等非法值, 防止 cookie 污染. (2) GET 是只读, 写 cookie 必须 POST, 走 action. GET 切主题会触发浏览器预取 + 分享 URL 攻击 + <img> 强制切换. (3) Set-Cookie 让浏览器自动管理 cookie 过期与同步, 跨标签页生效, 防闪烁 inline script 能读到. localStorage 是 client-only, SSR 拿不到, 闪屏回归, 跨标签页也不同步. (4) json 响应让前端 fetcher 拿到 actionData 灵活处理 UI (toast), redirect 会强制整页 reload, 体验糟.",
    },
    explanation: {
      short: "四道安全 / 体验门: union 校验 + HTTP method + Set-Cookie 头 + json 响应.",
      detail: "四道设计围绕 'cookie 写入是写操作' 与 'SPA 体验' 设计, 任何一项改动都破坏安全或体验.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, THEME],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 root action 改成 GET loader 切 theme, 写一条 review comment (1-2 句).",
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
