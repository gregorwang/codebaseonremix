/**
 * Real questions for site-16-auth-session / google-oauth.
 *
 * Anchor: remix/app/components/auth/GoogleOneTap.client.tsx (1-71) +
 *          remix/app/root.tsx Layout L107 (window.ENV 注入).
 * 学习目标: Google One Tap 客户端 OAuth 流程 + env 注入 + origin 校验.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: reactGsapCleanupDropped (§19.2-2) — One Tap useEffect cleanup 关键.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { reactGsapCleanupDropped } from "../recipes";

const PRIMARY = "app/components/auth/GoogleOneTap.client.tsx";
const TOUCHED = [PRIMARY, "app/root.tsx", "app/lib/auth-client.client.ts", "app/lib/auth-return.ts"];

export const googleOauthQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 GoogleOneTap 后缀 .client",
    prompt: "GoogleOneTap.client.tsx 后缀含义?",
    options: [
      { id: "A", text: ".client 强制 vite / RR 7 不进 SSR, 只在浏览器加载, 依赖 window.google" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: ".client 强制 client-only, 防止 SSR 抛 ReferenceError.",
      detail: "GoogleOneTap 内部用 authClient.oneTap 调用 window.google, SSR 阶段 window 不存在. .client 后缀让 vite 不进 server bundle, 仅浏览器加载.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 authClient 来源",
    prompt: "authClient 来自?",
    options: [
      { id: "A", text: "app/lib/auth-client.client.ts (better-auth 浏览器 SDK 封装)" },
      { id: "B", text: "node" },
      { id: "C", text: "global" },
      { id: "D", text: "react" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "authClient 来自 app/lib/auth-client.client.ts, better-auth 浏览器 SDK 封装.",
      detail: "auth-client.client 是 client-only 模块, 内部调用 better-auth 浏览器 SDK, 依赖 window/localStorage. .client 后缀让 vite 不进 server bundle.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, "app/lib/auth-client.client.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q3 DISMISSED_KEY 含义",
    prompt: "const DISMISSED_KEY = 'google-one-tap-dismissed-at' 含义?",
    options: [
      { id: "A", text: "localStorage key, 存用户关闭 One Tap 的时间戳, 12 小时内不再弹" },
      { id: "B", text: "cookie 名" },
      { id: "C", text: "header" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "localStorage key, 存关闭时间戳, 12 小时内不再弹.",
      detail: "用户主动关闭 One Tap 后, 存时间戳到 localStorage, 后续访问时检查 'Date.now() - dismissedAt < 12h', 12 小时内不弹, 避免反复骚扰.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 DISMISS_TTL 含义",
    prompt: "const DISMISS_TTL = 1000 * 60 * 60 * 12 含义? (毫秒 / 秒 / 分 / 时?)",
    options: [],
    correctAnswer: { values: { v: "12 小时" } },
    blanks: [{ id: "v", placeholder: "时长", acceptedAnswers: ["12 小时", "12h", "12 hours", "12 时"] }],
    explanation: {
      short: "1000 * 60 * 60 * 12 = 12 小时, 12 小时内不弹 One Tap.",
      detail: "毫秒数: 1000 (ms) * 60 (s) * 60 (min) * 12 (h) = 12 小时. 用户关闭后 12 小时内不骚扰, 12 小时后才重置.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 useEffect 依赖数组",
    prompt: "GoogleOneTap useEffect 依赖数组包含? (多选)",
    options: [
      { id: "A", text: "appUrl (env 配置)" },
      { id: "B", text: "debug (日志开关)" },
      { id: "C", text: "enabled (Client ID 是否配置)" },
      { id: "D", text: "returnTo (登录后回跳路径)" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "4 个依赖: appUrl / debug / enabled / returnTo.",
      detail: "依赖数组完整, 任意 prop 变化都重跑 useEffect. useEffect 内部引用了所有 props, 漏依赖会触发 stale closure.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 setTimeout 900ms 作用",
    prompt: "window.setTimeout(() => authClient.oneTap(...), 900) 900ms 延迟的作用?",
    options: [
      { id: "A", text: "延迟 One Tap 弹窗, 让页面先渲染, 用户先看到内容再弹窗, 减少首屏干扰" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "延迟 900ms 让页面先渲染, 用户先看到内容再弹 One Tap, 减少首屏干扰.",
      detail: "GoogleOneTap 是个'被动'登录提示, 不该抢首屏内容焦点. 900ms 后用户已经看到页面, 弹 One Tap 是补充, 不打扰. 这与某些站直接弹 One Tap 体验差异很大.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: enabled 守门",
    prompt: "if (!enabled) { debugOneTap(debug, 'missing-google-client-id'); return; } 出现在 GoogleOneTap 哪一行?",
    code: `1 export default function GoogleOneTap({ enabled, returnTo, appUrl, debug = false }: GoogleOneTapProps) {
2   useEffect(() => {
3     if (!enabled) {
4       debugOneTap(debug, "missing-google-client-id");
5       return;
6     }`,
    options: [],
    linePickLines: [
      { id: "L3", lineNumber: 3, text: "if (!enabled) {" },
      { id: "L4", lineNumber: 4, text: "debugOneTap(debug, 'missing-google-client-id');" },
      { id: "L5", lineNumber: 5, text: "return;" },
    ],
    correctAnswer: { lineId: "L3" },
    explanation: {
      short: "第 3 行 enabled 守门, 没有 Client ID 跳过.",
      detail: "GoogleOneTap 必须有 GOOGLE_CLIENT_ID 才能跑, 守门避免在没配置时抛错或乱弹. debug 日志记录跳过原因, 调试方便.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 origin mismatch 守门",
    prompt: "if (expectedOrigin !== window.location.origin) 时跳过 One Tap, 原因?",
    options: [
      { id: "A", text: "Google One Tap 严格要求 origin match, 否则 OAuth 失败或 token 跳错域" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Google One Tap 强制 origin match, 否则 OAuth 失败 / token 错发.",
      detail: "Google Identity Services 要求 client_id 注册的 origin 与当前 origin 一致, 否则 OAuth 跳转拒绝. origin mismatch 时直接跳过, debug 日志记录原因.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 recently-dismissed 守门",
    prompt: "if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL) 跳过 One Tap, 作用?",
    options: [
      { id: "A", text: "用户最近 12 小时内关闭过 One Tap, 跳过避免反复骚扰" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "用户主动关闭后 12 小时内不弹, 减少骚扰.",
      detail: "localStorage 存关闭时间戳, 12 小时内跳过. 这是 Google One Tap UX 最佳实践, 不然用户每次访问都看到弹窗.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 cancelled + clearTimeout cleanup",
    prompt: "useEffect cleanup 做了? (多选)",
    options: [
      { id: "A", text: "cancelled = true, 防止 setTimeout 回调执行 authClient.oneTap" },
      { id: "B", text: "window.clearTimeout(timer), 取消未触发的 setTimeout" },
      { id: "C", text: "组件 unmount 后不弹 One Tap" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "cleanup 设 cancelled + clearTimeout, 防止 unmount 后弹 One Tap.",
      detail: "用户切走路由时, One Tap 还在 900ms 等待期, cleanup 必须取消. cancelled = true 让回调立即 return, clearTimeout 取消 timer 引用. 双重保险.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 onPromptNotification 作用",
    prompt: "authClient.oneTap({ onPromptNotification(notification) { ... } }) 回调作用?",
    options: [
      { id: "A", text: "Google 通知用户关闭 / 跳过 One Tap 时, 写 localStorage 时间戳, 12 小时内不弹" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "用户主动关闭 / 跳过 One Tap 时, 记录时间戳用于 12 小时不弹.",
      detail: "onPromptNotification 是 better-auth 包装的 GIS 回调, 关闭 / 跳过 / 不显示都触发, 写 localStorage DISMISSED_KEY. 与最初进入时检查 DISMISS_TTL 配合形成完整 UX.",
    },
    abilityTags: ["frontend.event.click"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 匿名访客首次访问",
    prompt: "匿名访客首次访问, 完整 One Tap 流程?",
    options: [
      { id: "loader", text: "loader 拿 googleClientId / appUrl, App 渲染 <GoogleOneTap enabled={Boolean(googleClientId)} />" },
      { id: "hydrate", text: "hydrate 后 useEffect 跑, enabled=true 通过" },
      { id: "origin", text: "appUrl origin 匹配, 通过" },
      { id: "fresh", text: "localStorage 没 dismissedAt, 通过" },
      { id: "delay", text: "900ms 后 setTimeout 触发, authClient.oneTap(callbackURL: withLoginSuccessMarker(returnTo))" },
    ],
    correctAnswer: { pathIds: ["loader", "hydrate", "origin", "fresh", "delay"] },
    explanation: {
      short: "loader 拿 config → hydrate 跑 useEffect → origin 守门 → dismissedAt 守门 → 900ms 弹 One Tap.",
      detail: "完整链路: loader 准备 config, hydrate 后 useEffect 跑, 三个守门 (enabled / origin / dismissed) 全部通过, 900ms 后才弹 One Tap. callbackURL 用 withLoginSuccessMarker 加 login=success 标记, 登录后 Veil 触发.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 用户关闭 One Tap",
    prompt: "用户点击 One Tap 右上角 X 关闭, 后续 12 小时内访问?",
    options: [
      { id: "close", text: "onPromptNotification 触发, localStorage.setItem(DISMISSED_KEY, Date.now())" },
      { id: "next", text: "下次访问, useEffect 跑" },
      { id: "check", text: "dismissedAt 有值, Date.now() - dismissedAt < 12h" },
      { id: "skip", text: "debug 日志 'recently-dismissed', return 不弹" },
    ],
    correctAnswer: { pathIds: ["close", "next", "check", "skip"] },
    explanation: {
      short: "关闭 → 存时间戳 → 12h 内访问 → 检查 → 跳过.",
      detail: "完整流程: 用户关闭 → onPromptNotification 写 localStorage → 后续访问 useEffect 读 dismissedAt → 检查 12h 内 → 跳过 One Tap.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q14 跨域访问时",
    prompt: "appUrl 是 https://staging.example.com 但 window.location.origin 是 https://localhost, 行为?",
    options: [
      { id: "A", text: "expectedOrigin !== window.location.origin 命中, debug 日志 'origin-mismatch', return 跳过" },
      { id: "B", text: "弹 One Tap" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "origin 不匹配, debug 日志 + return 跳过, 不弹 One Tap.",
      detail: "origin mismatch 是 OAuth 安全要求, 不能跳过. 用户在 localhost 看 staging 配置, 显然配置错, 跳过 + debug 日志, 部署时排查.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 路由切换时",
    prompt: "用户在 /, One Tap 还在 900ms 等待, 切到 /music, 行为?",
    options: [
      { id: "A", text: "useEffect cleanup 跑, cancelled=true + clearTimeout, One Tap 不弹" },
      { id: "B", text: "继续弹" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "cleanup 双重保险, cancelled + clearTimeout 防止 unmount 后弹.",
      detail: "cleanup 是 useEffect 配对契约, 路由切换组件 unmount 时跑. cancelled 防止 setTimeout 回调执行 oneTap, clearTimeout 取消 timer 引用. 双重保险.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 origin 校验",
    prompt: "AI 改坏: AI 觉得 'appUrl 肯定对' 删除 expectedOrigin !== window.location.origin 校验. 后果是?",
    options: [
      { id: "A", text: "One Tap 在跨域场景发起 OAuth, token 跳到错域, 安全 / 体验双重风险" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "无影响" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "origin 校验是 OAuth 安全要求, 删了跨域 token 错发.",
      detail: "Google One Tap 严格要求 origin match, 否则 token 不发. 删了校验看似'更兼容', 实际把 OAuth 跳到错域, token 走错回调, 既不安全也无法登录.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户从错域访问时, One Tap 弹窗发起 OAuth, token 跳到错域, 登录失败或 token 错发到攻击者控制域.",
    aiReviewRisk: "把 OAuth 强制校验当成'可省略'.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 是行为级风险.",
      C: "有安全影响.",
      D: "loader 与 origin 校验无关.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 删 useEffect cleanup",
    prompt: "AI 改坏: AI 觉得 '反正组件会 unmount' 删掉 useEffect cleanup. 后果是?",
    options: [
      { id: "A", text: "路由切换后 setTimeout 还在跑, 900ms 后弹 One Tap 在新页面上, 体验错乱" },
      { id: "B", text: "setTimeout 自动停止" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "cleanup 缺失, setTimeout 持续跑, 路由切换后还在新页面弹 One Tap.",
      detail: "cleanup 是 useEffect 配对契约, 删了以后 setTimeout 持续跑, 900ms 后在新页面上弹 One Tap. cancelled + clearTimeout 双重保护, 删了任何一项都破坏.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户从 / 切到 /music, 在 music 页面看到 One Tap 弹窗, 体验错乱. 严重时 /music 没有 login 上下文, One Tap 弹窗错位.",
    aiReviewRisk: "把 cleanup 当成'可选优化', 实际上 useEffect 副作用管理核心.",
    wrongAnswerFeedback: {
      B: "setTimeout 不会自动停止.",
      C: "TS 不会报错, cleanup 是 void 返回.",
      D: "有严重体验影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 900ms 改 0ms",
    prompt: "AI 改坏: AI 觉得 '越快越好' 把 setTimeout 延迟改 0ms. 后果是?",
    options: [
      { id: "A", text: "One Tap 立即弹, 抢首屏内容焦点, 用户没看到内容就被打扰" },
      { id: "B", text: "更高效" },
      { id: "C", text: "更友好" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "0ms 延迟抢首屏焦点, 用户没看到内容就被打扰.",
      detail: "900ms 延迟是 UX 设计, 让用户先看到页面再被动提示. 0ms 立即弹 One Tap, 抢焦点, 用户必须先关闭才能看内容, 体验退步. 900ms 是反复测试的最佳值.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户访问首页立即看到 One Tap 弹窗, 必须关闭才能看内容, 体验糟.",
    aiReviewRisk: "为'快'破坏 UX 设计, 不理解延迟是被动登录的精髓.",
    wrongAnswerFeedback: {
      B: "快不是被动登录的目标.",
      C: "立即弹不友好.",
      D: "有体验影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §19.2-2 GSAP cleanup 删",
    prompt: reactGsapCleanupDropped({
      lessonSlug: "google-oauth",
      courseSlug: "site-16-auth-session",
      orderIndex: 18,
    }).prompt,
    options: reactGsapCleanupDropped({
      lessonSlug: "google-oauth",
      courseSlug: "site-16-auth-session",
      orderIndex: 18,
    }).options,
    correctAnswer: reactGsapCleanupDropped({
      lessonSlug: "google-oauth",
      courseSlug: "site-16-auth-session",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: reactGsapCleanupDropped({
      lessonSlug: "google-oauth",
      courseSlug: "site-16-auth-session",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "GoogleOneTap 的 setTimeout 不 cleanup, 用户切走路由 900ms 后在新页面弹 One Tap, 体验错乱.",
    aiReviewRisk: "把 React unmount 等同于所有副作用清理, 忽略 setTimeout 独立生命周期.",
    wrongAnswerFeedback: reactGsapCleanupDropped({
      lessonSlug: "google-oauth",
      courseSlug: "site-16-auth-session",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 DISMISS_TTL 改 0",
    prompt: "AI 改坏: AI 觉得 'TTL 是负担' 把 DISMISS_TTL 改成 0. 后果是?",
    options: [
      { id: "A", text: "用户每次访问都被弹 One Tap, 反复骚扰, 体验灾难" },
      { id: "B", text: "每次都弹" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "更友好" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "DISMISS_TTL=0 让用户每次都看到 One Tap, 反复骚扰, 体验灾难.",
      detail: "Date.now() - dismissedAt < 0 永远 false, 但 'if (dismissedAt && ...)' 守卫 dismissedAt 是否存在, 0 时 still truthy (DISMISS_TTL=0 让条件永真, 永远跳). 用户每次访问都看到 One Tap, 必须每次都关闭.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户每次访问都被 One Tap 骚扰, 必须每次手动关闭, 12 小时不骚扰的设计失效.",
    aiReviewRisk: "把 TTL 设计当成'负担'删掉, 失去 UX 防骚扰机制.",
    wrongAnswerFeedback: {
      B: "每次都弹是反模式.",
      C: "TS 不会报错.",
      D: "反复骚扰不友好.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 GoogleOneTap 的安全与 UX 设计",
    prompt: "用自己的话解释 GoogleOneTap 组件为什么必须 (1) .client 后缀 (2) origin 校验 (3) DISMISS_TTL (4) useEffect cleanup, 各自保护什么.",
    options: [],
    correctAnswer: {
      text: "(1) .client 后缀: 强制 client-only, 防止 SSR 抛 ReferenceError (window.google 不存在). (2) origin 校验: Google OAuth 强制 origin match, 防止 token 跨域错发, 错配配置时不发起 OAuth 失败. (3) DISMISS_TTL: 12 小时不弹, 避免反复骚扰, 用户主动关闭时间戳存 localStorage. (4) useEffect cleanup: 路由切换 / 组件 unmount 时取消 setTimeout + cancelled, 防止新页面被旧 One Tap 弹窗. 四件套围绕 'OAuth 安全 + UX 防骚扰 + 副作用清理' 设计.",
    },
    explanation: {
      short: "四件套: client 边界 + OAuth 安全 + UX 防骚扰 + 副作用清理.",
      detail: "四件套职责正交, 任何一项被破坏都引发 SSR crash / OAuth 失败 / 用户骚扰 / 体验错乱.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 GoogleOneTap 的 useEffect cleanup 删了, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "useEffect cleanup 是 setTimeout 副作用清理的契约, 删了以后路由切换 900ms 后 One Tap 会在新页面上弹, 体验错乱. cancelled + clearTimeout 双重保险是必要的, 删任何一项都破坏 UX. 这条 PR 必须保留 cleanup.",
    },
    explanation: {
      short: "审查点: useEffect cleanup 是 setTimeout / 副作用清理的契约, 不可删.",
      detail: "好的 review 指出 (1) cleanup 的设计意图 (2) 删了具体后果 (3) 双重保险的设计.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
];
