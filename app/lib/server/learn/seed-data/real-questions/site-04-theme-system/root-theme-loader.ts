/**
 * Real questions for site-04-theme-system / root-theme-loader.
 *
 * Anchor: remix/app/root.tsx L32-46 (loader) + remix/app/utils/theme.server.ts.
 * 学习目标: root loader 通过 getTheme(request) 读取 theme cookie, fallback 'light'.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: tsServerImportInClient (§12.2-TS-3) — 涉及 theme.server / 客户端组件边界.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { tsServerImportInClient } from "../recipes";

const PRIMARY = "app/root.tsx";
const THEME = "app/utils/theme.server.ts";
const TOUCHED = [PRIMARY, THEME];

export const rootThemeLoaderQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 getTheme 来源",
    prompt: "root loader 里 getTheme(request) 来自哪个模块?",
    options: [
      { id: "A", text: "app/utils/theme.server.ts" },
      { id: "B", text: "app/lib/theme.server.ts" },
      { id: "C", text: "app/components/theme.ts" },
      { id: "D", text: "React Context" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "getTheme 来自 app/utils/theme.server.ts.",
      detail: "项目把 theme 工具集中放 app/utils/theme.server.ts, .server 后缀强制 server-only, 不会进 client bundle.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 Theme 类型",
    prompt: "type Theme = ?",
    options: [
      { id: "A", text: "'light' | 'dark' (字面量联合)" },
      { id: "B", text: "string" },
      { id: "C", text: "'auto' | 'light' | 'dark'" },
      { id: "D", text: "boolean" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Theme 是字面量联合 'light' | 'dark'.",
      detail: "字面量联合让 setTheme / getTheme 编译期就拒绝非法值, 防止运行时把 'pink' 写进 cookie.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q3 createCookie maxAge 含义",
    prompt: "createCookie('theme', { maxAge: 31_536_000 }) 31_536_000 秒是多久?",
    options: [
      { id: "A", text: "1 年 (60*60*24*365)" },
      { id: "B", text: "1 个月" },
      { id: "C", text: "1 天" },
      { id: "D", text: "10 年" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "60*60*24*365 = 31_536_000 秒 = 1 年, theme cookie 持久化 1 年.",
      detail: "theme 是用户偏好, 持久 1 年避免每次访问重新设置. 注意是 maxAge 不是 expires, 相对时间.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "fill_blank",
    title: "Q4 httpOnly 取值",
    prompt: "createCookie('theme', { httpOnly: _____ }) theme cookie 是否允许 JS 读取?",
    options: [],
    correctAnswer: { values: { v: "false" } },
    blanks: [{ id: "v", placeholder: "布尔", acceptedAnswers: ["false"] }],
    explanation: {
      short: "httpOnly: false, 浏览器 JS 可读 theme, 配合防闪烁 inline script 用.",
      detail: "theme 必须能被 inline script 读出来给 html 加 className, 所以 httpOnly=false. 安全风险低 (theme 不是 secret).",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "multi_choice",
    title: "Q5 createCookie 关键配置",
    prompt: "createCookie('theme', { ... }) 项目里包含哪些配置? (多选)",
    options: [
      { id: "A", text: "maxAge: 31_536_000 (1 年)" },
      { id: "B", text: "httpOnly: false (浏览器 JS 可读)" },
      { id: "C", text: "secure: 自动判断协议" },
      { id: "D", text: "sameSite: 'lax'" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "maxAge + httpOnly + secure (动态) + sameSite: lax 都在配置里.",
      detail: "secure 是动态值, 看 request.url.protocol 是不是 https. sameSite: 'lax' 防止 CSRF 写 theme, 但允许顶部导航带 cookie.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q6 theme cookie parse",
    prompt: "themeCookie.parse(cookieHeader) 做了什么?",
    options: [
      { id: "A", text: "解析 Cookie header, 提取 theme key 的值并校验, 返回 string | null" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "加密" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "createCookie 返回的对象有 parse / serialize / isSigned 等方法.",
      detail: "parse 拿 request headers 的 Cookie 字符串, 找 theme=xxx, 返回 string (没签名时). null 表示 cookie 缺失.",
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
    title: "Q7 关键行: theme 三元判断",
    prompt: "theme === 'dark' ? 'dark' : 'light' 出现在 getTheme 哪一行?",
    code: `1 export async function getTheme(request: Request): Promise<Theme> {
2   const themeCookie = getThemeCookie(request);
3   const cookieHeader = request.headers.get("Cookie");
4   const theme = await themeCookie.parse(cookieHeader);
5   return theme === "dark" ? "dark" : "light";
6 }`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "const themeCookie = getThemeCookie(request);" },
      { id: "L3", lineNumber: 3, text: "const cookieHeader = request.headers.get('Cookie');" },
      { id: "L4", lineNumber: 4, text: "const theme = await themeCookie.parse(cookieHeader);" },
      { id: "L5", lineNumber: 5, text: "return theme === 'dark' ? 'dark' : 'light';" },
    ],
    correctAnswer: { lineId: "L5" },
    explanation: {
      short: "第 5 行把 null / 'light' / 其他值都收窄到 Theme union.",
      detail: "parse 返回 null (cookie 缺失) / 'light' / 'dark' / 其他字符串. 第 5 行用 'dark' ? 'dark' : 'light' 收窄, 任何非 'dark' 都退到 'light'.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q8 secure 动态判断",
    prompt: "const secure = request ? new URL(request.url).protocol === 'https:' : false; 这行 secure 动态设置的目的是?",
    options: [
      { id: "A", text: "dev 环境 (http://localhost) 不能设 Secure 标志, 否则浏览器不存 cookie, 生产 https 时必须设" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "dev / prod 协议不同, secure 标志必须动态匹配.",
      detail: "https 必须 secure: true, 但 http://localhost 设了 secure 浏览器会拒绝存 cookie. 动态判断让同一份代码 dev/prod 都跑.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q9 sameSite lax 含义",
    prompt: "sameSite: 'lax' 的语义?",
    options: [
      { id: "A", text: "第三方跳转 (a 标签 GET) 仍带 cookie, 跨站 POST / iframe 不带, 平衡 UX 与安全" },
      { id: "B", text: "完全禁止跨站" },
      { id: "C", text: "完全允许" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "lax = 顶部导航带, 跨站 POST 不带, 是当前推荐默认.",
      detail: "lax 比 strict 宽松, 用户从外部链接点进来仍能保持登录态; 但跨站 POST / iframe 不会带 cookie, 防止 CSRF 写 theme.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "multi_choice",
    title: "Q10 setTheme 调用方式",
    prompt: "setTheme(theme, request) 返回什么? (多选相关 API)",
    options: [
      { id: "A", text: "cookieHeader = themeCookie.serialize(theme) 的结果, 是 Set-Cookie header 字符串" },
      { id: "B", text: "调用方通常塞进 response headers.Set-Cookie" },
      { id: "C", text: "客户端可直接 setCookie" },
      { id: "D", text: "加密" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "serialize 输出 Set-Cookie 字符串, 调用方塞进 response headers.",
      detail: "Remix 的 createCookie 设计: serialize 返回标准 Set-Cookie 字符串 (含 Max-Age, Path 等), 调用方控制何时塞进响应.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q11 theme parse 异常处理",
    prompt: "cookieHeader = null 时 (用户首次访问, 没 theme cookie), getTheme 返回?",
    options: [
      { id: "A", text: "Promise<'light'>, 兜底 light" },
      { id: "B", text: "抛错" },
      { id: "C", text: "Promise<null>" },
      { id: "D", text: "Promise<undefined>" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "null 走 'dark' ? 'dark' : 'light' 三元, 返回 'light'.",
      detail: "parse 找不到 theme cookie 返回 null, 第 5 行 null !== 'dark' 走 else, 兜底 'light'. 完整链路零抛错.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 首次访问 theme 流程",
    prompt: "首次访问, 没 theme cookie, root loader 经历什么?",
    options: [
      { id: "parse", text: "themeCookie.parse(null) 返回 null" },
      { id: "fallback", text: "null !== 'dark', 兜底 'light'" },
      { id: "json", text: "loader json({ theme: 'light', session, ... })" },
      { id: "html", text: "Layout 渲染 <html className='light'>" },
    ],
    correctAnswer: { pathIds: ["parse", "fallback", "json", "html"] },
    explanation: {
      short: "parse null → 兜底 'light' → loader json → Layout 渲染.",
      detail: "无 cookie 用户也能正确拿到默认 light, 不需要额外处理.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: THEME,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 dark 用户流程",
    prompt: "已选 dark 的用户访问, 流程?",
    options: [
      { id: "cookie", text: "Cookie header 包含 theme=dark" },
      { id: "parse", text: "themeCookie.parse 返回 'dark'" },
      { id: "pass", text: "'dark' === 'dark', 返回 'dark'" },
      { id: "html", text: "<html className='dark'>" },
    ],
    correctAnswer: { pathIds: ["cookie", "parse", "pass", "html"] },
    explanation: {
      short: "cookie 'dark' → parse 'dark' → 直接通过 → html dark.",
      detail: "parse 出来就是 'dark', 第 5 行通过三元, html className='dark', 暗色主题生效.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: THEME,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 theme cookie 被恶意改写",
    prompt: "用户手动 document.cookie = 'theme=pink', 下次访问 getTheme 怎么处理?",
    options: [
      { id: "A", text: "'pink' !== 'dark', 兜底 'light', 恶意值被忽略" },
      { id: "B", text: "渲染 pink" },
      { id: "C", text: "抛错" },
      { id: "D", text: "清空 cookie" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "三元收窄把 'pink' 拒到 'light', 任何非 'dark' 都退到默认.",
      detail: "theme 是 union 类型, 'pink' 编译期就是非法值, 运行时 getTheme 显式收窄到 'light'. 攻击面被堵死.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "single_choice",
    title: "Q15 cookie 签名与 theme",
    prompt: "theme cookie 是签名 cookie 还是普通 cookie?",
    options: [
      { id: "A", text: "普通 cookie, httpOnly=false 允许 JS 读, 无需签名 (theme 不是 secret)" },
      { id: "B", text: "签名 cookie" },
      { id: "C", text: "加密" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "theme 是普通 cookie, 配合 httpOnly=false 允许 inline script 读.",
      detail: "createCookie 不传 secrets 就是普通 cookie. theme 不是 secret, 篡改成 'pink' 也会被 getTheme 兜底到 'light', 没必要签名.",
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
    title: "Q16 AI 把 theme 改成 string",
    prompt: "AI 改坏: AI 把 type Theme = 'light' | 'dark' 改成 type Theme = string. 后果是?",
    options: [
      { id: "A", text: "setTheme('pink') TS 不报, 写进 cookie 后 getTheme 兜底 'light' 但失去类型保护" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "loader 失败" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "string 退化了 union 的保护, setTheme 接受任何字符串.",
      detail: "Theme union 是 setTheme 拒绝非法值的最后一道墙, 改成 string 后 'pink' / 'rainbow' 都能传, 运行时 themeCookie.parse 拿到脏值, 只能靠 getTheme 的三元兜底, 失去了 setTheme 入口的拒绝能力.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: THEME,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
    realWorldImpact: "AI 生成的 form action 误传 theme='rainbow', 写进 cookie, 用户看到 1 次渲染错误, 然后 getTheme 兜底 'light' 但用户能感知到.",
    aiReviewRisk: "为'灵活'退化成 string, 破坏字面量联合的拒绝能力.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, string 是合法类型.",
      C: "loader 不会失败.",
      D: "有类型契约损失.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把 httpOnly 改成 true",
    prompt: "AI 改坏: AI '安全起见' 把 theme cookie 的 httpOnly 改成 true. 后果是?",
    options: [
      { id: "A", text: "防闪烁 inline script 读不到 theme, 主题闪烁回归" },
      { id: "B", text: "更安全" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "httpOnly=true 让 inline script 读不到 cookie, 防闪烁机制失效.",
      detail: "防闪烁 inline script 用 document.cookie.match(/theme=.../) 读, httpOnly=true 阻止 JS 读, 闪屏回归. theme 不是 secret, httpOnly=false 是设计选择.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: THEME,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [THEME, PRIMARY],
    realWorldImpact: "暗色模式用户每次刷新看到一次白闪, 体验退步, 与 AI 改坏的 '安全提升' 相反.",
    aiReviewRisk: "把 httpOnly 当成 '越安全越好', 不考虑实际使用场景.",
    wrongAnswerFeedback: {
      B: "theme 不是 secret, httpOnly=false 不影响安全.",
      C: "TS 不会报错.",
      D: "loader 不会失败.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 sameSite 改成 none",
    prompt: "AI 改坏: AI 把 sameSite: 'lax' 改成 sameSite: 'none' (跨站也带). 后果是?",
    options: [
      { id: "A", text: "iframe 嵌入恶意页面也能写 theme cookie, CSRF 攻击面扩大" },
      { id: "B", text: "更兼容" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "sameSite: 'none' = 跨站都带 cookie, 失去 CSRF 防护.",
      detail: "lax 已经够用户从外部链接跳进来, none 允许 iframe 跨站表单提交也带 cookie, 攻击者构造恶意页面 + 隐藏 form 就能写 theme. theme 不是 secret 风险低, 但 'none' 也不必要.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: THEME,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
    realWorldImpact: "恶意 iframe 页面 POST form action 写 theme cookie, 强制用户切到 light, 体验骚扰, 严重时引导到 phishing.",
    aiReviewRisk: "为'跨站兼容'牺牲 CSRF 防护.",
    wrongAnswerFeedback: {
      B: "none 不带来实际好处, 只扩大攻击面.",
      C: "TS 不会报错.",
      D: "有安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §12.2-TS-3 client 导入 server",
    prompt: tsServerImportInClient({
      lessonSlug: "root-theme-loader",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).prompt,
    options: tsServerImportInClient({
      lessonSlug: "root-theme-loader",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).options,
    correctAnswer: tsServerImportInClient({
      lessonSlug: "root-theme-loader",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: tsServerImportInClient({
      lessonSlug: "root-theme-loader",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: THEME,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [THEME],
    realWorldImpact: "client 组件引入 createCookie / getTheme 等 server 工具, bundle 泄露, 可能暴露 cookie 签名密钥.",
    aiReviewRisk: "把 .server.ts 当成普通工具模块, 忽略 client 边界.",
    wrongAnswerFeedback: tsServerImportInClient({
      lessonSlug: "root-theme-loader",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 删 getTheme 三元兜底",
    prompt: "AI 改坏: AI 觉得 '已经有 Theme union' 直接 return theme as Theme. 后果是?",
    options: [
      { id: "A", text: "cookie 篡改成 'pink' / null 时, 返回值违反 Theme union 契约, Layout className='pink' 渲染异常" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "无影响" },
      { id: "D", text: "更简洁" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "as Theme 是 type cast, 不做运行期校验, 'pink' 也能溜过去.",
      detail: "as Theme 把 any/string 强转 Theme, parse 返回 null 时 'pink' 也能转, Layout 拿到 'pink' 渲染到 <html className>, CSS 变量没匹配, 视觉错乱.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: THEME,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
    realWorldImpact: "恶意用户改 cookie 为 'pink' 或 'rainbow', <html className> 错乱, CSS 变量未匹配, 用户看到无样式页面.",
    aiReviewRisk: "把 'as 联合类型' 当成 '合法', as 不做运行期校验, 三元是必要的运行时安全网.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, as 强制转换.",
      C: "有视觉与安全影响.",
      D: "as 不简洁, 三元才是.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 theme cookie 完整安全设计",
    prompt: "用自己的话解释 theme cookie 为什么用普通 cookie (httpOnly=false) 而非签名 cookie, secure / sameSite 各自的作用.",
    options: [],
    correctAnswer: {
      text: "theme 不是 secret, 篡改成 'pink' / 'rainbow' 也会被 getTheme 三元兜底到 'light', 没必要签名增加复杂度. httpOnly=false 让 inline script 读 cookie 给 html 加 class, 防闪烁机制依赖这一能力. secure 动态匹配协议: dev (http://localhost) 不设 Secure 标志, 否则浏览器不存 cookie; prod (https) 设 Secure 强制 HTTPS. sameSite: 'lax' 让顶部导航 (a 标签 GET) 仍带 cookie 保持主题, 但跨站 POST / iframe 不带, 防 CSRF 强制写 theme.",
    },
    explanation: {
      short: "theme 信任模型: 不是 secret + 必须 JS 可读 + 顶部导航带 + 防 CSRF.",
      detail: "四个配置围绕 'theme 不是 secret 但要被 inline script 读' 设计, 任何一项改动都破坏防闪烁或 CSRF 防护.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: THEME,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [THEME],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 getTheme 改成 return theme as Theme, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "as Theme 不做运行期校验, 恶意 cookie 改 'pink' / 'rainbow' 都能强转 Theme, Layout 渲染 <html className='pink'> 后 CSS 变量未匹配, 用户看到无样式页面. 三元 'dark' ? 'dark' : 'light' 是必要的运行时安全网, 不要为简洁删掉.",
    },
    explanation: {
      short: "审查点: as 不等于运行期校验, union 兜底三元是必要安全网.",
      detail: "好的 review 指出 (1) as 的语义 (2) 真实攻击路径 (cookie 篡改) (3) 后果链 (Layout / CSS 变量).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: THEME,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [THEME, PRIMARY],
  }),
];
