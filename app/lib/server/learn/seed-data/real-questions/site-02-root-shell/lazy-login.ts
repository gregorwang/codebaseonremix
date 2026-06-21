/**
 * Real questions for site-02-root-shell / lazy-login.
 *
 * Anchor: remix/app/components/auth/LoginDialog.tsx +
 *          remix/app/components/auth/GoogleOneTap.client.tsx +
 *          root.tsx L131-152 (Suspense + ClientOnly 包裹).
 * 学习目标: 登录 UI 走 .client 动态 import, 减少首包, 客户端边界.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: reactUseEffectMissingDep (§19.2-1) — LoginDialog 的 useEffect
 * 依赖管理 (Escape / Tab / focus) 是 useEffect 经典漏依赖场景.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { reactUseEffectMissingDep } from "../recipes";

const PRIMARY = "app/components/auth/LoginDialog.tsx";
const ONETAP_PRIMARY = "app/components/auth/GoogleOneTap.client.tsx";
const TOUCHED = ["app/components/auth/LoginDialog.tsx", "app/components/auth/GoogleOneTap.client.tsx", "app/root.tsx"];

export const lazyLoginQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 LoginDialog 文件位置",
    prompt: "LoginDialog 放在哪个目录?",
    options: [
      { id: "A", text: "app/components/auth/ (与 GoogleOneTap 同目录, 都是 auth 类组件)" },
      { id: "B", text: "app/components/ui/" },
      { id: "C", text: "app/lib/" },
      { id: "D", text: "app/nemesis/" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "auth 相关组件统一放 app/components/auth/.",
      detail: "项目按功能分目录, auth 集中放, 与 nemesis 聊天区分开.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 GoogleOneTap 后缀 .client",
    prompt: "GoogleOneTap 文件名带 .client 后缀, 作用?",
    options: [
      { id: "A", text: "RR 7 强制 .client 文件只在浏览器运行, 不会进入 SSR / Worker bundle" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: ".client 是 RR 7 强制 client-only 边界.",
      detail: "Google Identity Services 依赖 window.google, SSR 阶段抛错, .client 后缀告诉 vite / RR 完全跳过 server 渲染, 只在浏览器加载.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q3 LoginDialog 的 focus 行为",
    prompt: "LoginDialog 打开时 closeButtonRef.current?.focus() 的作用?",
    options: [
      { id: "A", text: "聚焦到关闭按钮, 让屏幕阅读器 / 键盘用户立即可用, 也是 a11y 基本要求" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "避免样式错乱" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "弹窗打开时聚焦关闭按钮, 满足 a11y focus trap 起点.",
      detail: "弹窗 / modal 打开时应当把焦点移入弹窗内, 避免用户继续操作背后页面. 关闭按钮是常用首焦点目标.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 Escape 键行为",
    prompt: "LoginDialog 打开时按 _____ 键会触发 onClose().",
    options: [],
    correctAnswer: { values: { key: "Escape" } },
    blanks: [{ id: "key", placeholder: "键名", acceptedAnswers: ["Escape", "Esc", "escape", "esc"] }],
    explanation: {
      short: "Escape 是 modal 类组件的关闭键.",
      detail: "模态对话框行业惯例, Escape 关闭, 也是 a11y 键盘规范.",
    },
    abilityTags: ["frontend.event.click"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 LoginDialog useEffect 副作用",
    prompt: "LoginDialog 的 useEffect 在 open=true 时做了? (多选)",
    options: [
      { id: "A", text: "锁定 body 滚动 (overflow: hidden)" },
      { id: "B", text: "聚焦到关闭按钮" },
      { id: "C", text: "挂全局 keydown listener 处理 Escape / Tab" },
      { id: "D", text: "调用 AI Gateway" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "弹窗副作用: 锁滚 + focus + 键盘监听.",
      detail: "标准 modal 模式, 锁滚防止背后页面滚动, focus 起始键盘可达, keydown 处理 Escape 关闭与 Tab focus trap.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 GoogleOneTap 何时被调用",
    prompt: "GoogleOneTap 组件在哪渲染?",
    options: [
      { id: "A", text: "App 组件在 !session?.user 时, 用 ClientOnly + Suspense 包裹" },
      { id: "B", text: "root loader" },
      { id: "C", text: "global" },
      { id: "D", text: "css 文件" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "App 组件判断 session, 未登录时挂载 GoogleOneTap.",
      detail: "未登录用户想体验一键登录, 已登录用户不再骚扰. ClientOnly 防 SSR, Suspense 防 dynamic import 阻塞.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: body overflow",
    prompt: "document.body.style.overflow = 'hidden' 出现在 LoginDialog useEffect 哪一行?",
    code: `1 useEffect(() => {
2   if (!open) return;
3   const previousOverflow = document.body.style.overflow;
4   document.body.style.overflow = "hidden";
5   closeButtonRef.current?.focus();`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "useEffect(() => {" },
      { id: "L3", lineNumber: 3, text: "const previousOverflow = document.body.style.overflow;" },
      { id: "L4", lineNumber: 4, text: "document.body.style.overflow = 'hidden';" },
      { id: "L5", lineNumber: 5, text: "closeButtonRef.current?.focus();" },
    ],
    correctAnswer: { lineId: "L4" },
    explanation: {
      short: "第 4 行锁定 body 滚动, 第 3 行先存 old value 准备 cleanup 恢复.",
      detail: "锁滚前先读 old value, cleanup 时恢复, 避免污染其他弹窗或后续页面的 overflow 状态.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 DISMISS_TTL 含义",
    prompt: "GoogleOneTap 里 const DISMISS_TTL = 1000 * 60 * 60 * 12 表示?",
    options: [
      { id: "A", text: "用户关闭 One Tap 后 12 小时内不再展示 (毫秒)" },
      { id: "B", text: "12 秒超时" },
      { id: "C", text: "12 分钟" },
      { id: "D", text: "12 天" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "12 小时 = 1000 * 60 * 60 * 12 毫秒, 避免反复骚扰用户.",
      detail: "1000 ms * 60 s * 60 min * 12 h = 12 小时. 用户关闭过 One Tap 后, 12 小时内不主动弹, 用 localStorage 记录时间戳.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [ONETAP_PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 authClient 来自哪",
    prompt: "GoogleOneTap 里 import { authClient } from '~/lib/auth-client.client'; 这个 client 后缀意味着?",
    options: [
      { id: "A", text: "auth-client 是 client-only 模块, 浏览器 SDK 封装, SSR 阶段不导入" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "装饰" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: ".client 后缀 = client-only module, 浏览器 SDK.",
      detail: "auth-client 内部调用 better-auth 浏览器 SDK, 依赖 window/localStorage, 用 .client 后缀强制 vite 不进 server bundle.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [ONETAP_PRIMARY, "app/lib/auth-client.client.ts"],
  }),
  q({
    type: "multi_choice",
    title: "Q10 expectedOrigin 校验",
    prompt: "GoogleOneTap 校验 expectedOrigin === window.location.origin 是? (多选)",
    options: [
      { id: "A", text: "防止 appUrl 与当前 origin 不一致时, 登录跳转 CSRF 风险" },
      { id: "B", text: "防止 token 发到错域" },
      { id: "C", text: "性能优化" },
      { id: "D", text: "装饰" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "origin 校验防 OAuth 跨站 / token 错发.",
      detail: "appUrl 来自 loader, 可能是任意字符串. 校验 origin 是 Google One Tap 的安全要求, 防止 origin mismatch 触发 OAuth 失败 / token 发到第三方.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [ONETAP_PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 withLoginSuccessMarker 作用",
    prompt: "withLoginSuccessMarker 在 GoogleOneTap 里的作用?",
    options: [
      { id: "A", text: "在 returnTo 拼接 login=success 标记, 让登录成功后 Veil 识别" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "在 returnTo URL 上加 login=success 标记.",
      detail: "登录后跳转带标记, root App 的 LoginSuccessVeil 通过 URL search.includes('login=success') 触发覆盖层, 显示成功动画.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [ONETAP_PRIMARY, "app/lib/auth-return.ts"],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 LoginDialog 打开流程",
    prompt: "用户点 Header 登录按钮 → openLoginDialog() → LoginDialog 挂载, 触发什么?",
    options: [
      { id: "render", text: "LoginDialog 渲染" },
      { id: "effect", text: "useEffect 触发, open=true, 锁滚 + focus" },
      { id: "keydown", text: "keydown listener 挂上, Escape / Tab 处理生效" },
      { id: "close", text: "用户按 Escape, onClose 触发, loginDialogOpen=false" },
    ],
    correctAnswer: { pathIds: ["render", "effect", "keydown", "close"] },
    explanation: {
      short: "渲染 → 副作用 → 键盘监听 → 用户关闭.",
      detail: "openLoginDialog 改 state, LoginDialog 挂载, useEffect 跑 (锁滚 + focus + keydown), 用户操作键盘, 按 Escape 关闭.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 LoginDialog 卸载 cleanup",
    prompt: "LoginDialog 关闭, useEffect cleanup 做什么?",
    options: [
      { id: "overflow", text: "document.body.style.overflow 恢复成 previousOverflow" },
      { id: "keydown", text: "移除全局 keydown listener" },
      { id: "no-flicker", text: "页面滚动立刻恢复, 不卡顿" },
    ],
    correctAnswer: { pathIds: ["overflow", "keydown", "no-flicker"] },
    explanation: {
      short: "cleanup 恢复 overflow + 移除 listener, 页面立即可滚.",
      detail: "useEffect cleanup 与 setup 配对, 锁滚恢复, 键盘监听移除. cleanup 漏写会导致页面一直锁滚, 必须有.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q14 GoogleOneTap 同源失败时",
    prompt: "appUrl.origin !== window.location.origin 时, GoogleOneTap 怎么做?",
    options: [
      { id: "A", text: "debugOneTap 记录原因, 不展示 One Tap 弹窗" },
      { id: "B", text: "仍然弹, 让用户跳转" },
      { id: "C", text: "抛错" },
      { id: "D", text: "reload 页面" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "origin 不匹配时不展示, 仅 debug 日志.",
      detail: "OAuth 跨域是攻击面, origin 不匹配直接跳过, 不强制执行, 避免引入安全风险.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [ONETAP_PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 GoogleOneTap 关闭后 12 小时内",
    prompt: "用户 10 分钟前手动关闭了 One Tap, 现在打开新页面, One Tap 还弹吗?",
    options: [
      { id: "A", text: "不弹, 12 小时内不再展示, localStorage 记录时间戳" },
      { id: "B", text: "弹" },
      { id: "C", text: "弹但有 cooldown" },
      { id: "D", text: "随机" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "DISMISS_TTL 内的关闭记录阻止弹窗, 避免骚扰.",
      detail: "localStorage 的 google-one-tap-dismissed-at 存了关闭时间, 12 小时内不再展示, 12 小时后才重置.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [ONETAP_PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 overflow cleanup",
    prompt: "AI 改坏: AI 在 LoginDialog useEffect 删了 cleanup 里 document.body.style.overflow = previousOverflow. 后果是?",
    options: [
      { id: "A", text: "关闭弹窗后 body 仍是 overflow: hidden, 页面无法滚动" },
      { id: "B", text: "弹窗无法打开" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "cleanup 是 useEffect 配对契约, 删了污染全局 body 样式.",
      detail: "overflow: hidden 是全局 body 样式, 不 cleanup 会让用户关闭弹窗后整个站点无法滚动, 体验灾难.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户关闭登录弹窗后, 整站无法滚动, 投诉'页面卡死', 实际是 body overflow 没恢复.",
    aiReviewRisk: "把 cleanup 当成'可选优化'删掉, 实际上全局 body 样式副作用必须 cleanup.",
    wrongAnswerFeedback: {
      B: "弹窗仍能打开, 是关闭后出问题.",
      C: "TS 不会报错, cleanup 是 void 返回.",
      D: "严重影响用户体验.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把 .client 文件 import 进 server 模块",
    prompt: "AI 改坏: AI 在 app/lib/auth.server.ts 加 import { GoogleOneTap } from '~/components/auth/GoogleOneTap.client'. 后果是?",
    options: [
      { id: "A", text: "vite / RR 7 检测到 server 模块 import .client 文件, 构建报错或运行时抛 'window is undefined'" },
      { id: "B", text: "GoogleOneTap 不会工作" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "server 模块不能 import .client 文件, 边界破坏.",
      detail: ".client 后缀是 vite 强制的 client-only 边界, server 模块 import 它会被静态分析拒绝, 编译失败或运行时抛错.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: TOUCHED,
    realWorldImpact: "build 失败或运行时 ReferenceError: window is not defined, 阻塞部署.",
    aiReviewRisk: "把 .client / .server 后缀当成 '标签', 忽略其强制隔离边界.",
    wrongAnswerFeedback: {
      B: "不是不工作, 是根本不会到运行时.",
      C: "TS 可能过 (client 文件有类型), 但 vite build 失败.",
      D: "严重影响构建.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 删 focus trap",
    prompt: "AI 改坏: AI 觉得 'Tab 处理复杂' 删了 keydown handler 里 Tab focus trap 逻辑. 后果是?",
    options: [
      { id: "A", text: "用户按 Tab 可以把焦点移到弹窗外, 破坏 a11y, 屏幕阅读器混乱" },
      { id: "B", text: "弹窗无法打开" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "弹窗必须 trap focus, 删了破坏 a11y.",
      detail: "Tab focus trap 是 modal a11y 强制要求, 让焦点在弹窗内循环, 不跑到背后页面. 删了导致键盘用户能继续 Tab 到背后链接, 屏幕阅读器读错内容.",
    },
    abilityTags: ["frontend.event.click"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "键盘 / 屏幕阅读器用户在弹窗打开时, Tab 把焦点带到背后页面, 操作错位.",
    aiReviewRisk: "为'简化'删 a11y 关键逻辑, 破坏 modal 行业标准.",
    wrongAnswerFeedback: {
      B: "弹窗仍能打开.",
      C: "TS 不会报错.",
      D: "严重影响 a11y.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §19.2-1 useEffect 依赖漏写",
    prompt: reactUseEffectMissingDep({
      lessonSlug: "lazy-login",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).prompt,
    options: reactUseEffectMissingDep({
      lessonSlug: "lazy-login",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).options,
    correctAnswer: reactUseEffectMissingDep({
      lessonSlug: "lazy-login",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: reactUseEffectMissingDep({
      lessonSlug: "lazy-login",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "LoginDialog 的 onClose 在 effect 里被引用但没进依赖, 父组件每次 onClose 引用变化时 effect 不会重跑, 旧 onClose 持续响应键盘事件, 关闭后还能关一次.",
    aiReviewRisk: "漏依赖导致闭包陈旧, 状态与回调错位.",
    wrongAnswerFeedback: reactUseEffectMissingDep({
      lessonSlug: "lazy-login",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 删 GoogleOneTap origin 校验",
    prompt: "AI 改坏: AI 觉得 'appUrl 肯定对' 删除 expectedOrigin !== window.location.origin 校验. 后果是? [lazy-login]",
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
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [ONETAP_PRIMARY],
    realWorldImpact: "用户从错域访问时, One Tap 弹窗发起 OAuth, token 跳到错域, 登录失败或 token 错发到攻击者控制域.",
    aiReviewRisk: "把 OAuth 强制校验当成'可省略'.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 是行为级风险.",
      C: "有安全影响.",
      D: "loader 与 origin 校验无关.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 .client 后缀与 Suspense 包裹",
    prompt: "用自己的话解释 GoogleOneTap 为什么需要 .client 后缀 + ClientOnly + Suspense 三件套, 缺一会怎样?",
    options: [],
    correctAnswer: {
      text: ".client 后缀让 vite / RR 7 强制文件不进 SSR, 避免 window 未定义. ClientOnly 在 React 层再保险一次, 服务端渲染时返回 null. Suspense 处理 dynamic import 的等待期, 让 import 异步不阻塞首屏. 缺 .client: SSR 抛错. 缺 ClientOnly: SSR 阶段直接渲染, 报错. 缺 Suspense: dynamic import 同步等待, 阻塞首屏 200-500ms, 体验糟.",
    },
    explanation: {
      short: "三层防护: 文件后缀 + 渲染包装 + 异步加载.",
      detail: ".client 是构建期隔离, ClientOnly 是运行期隔离, Suspense 是加载期隔离, 三者职责不同.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: ONETAP_PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 LoginDialog useEffect 里的 keydown listener 直接挂到 document, 但 cleanup 没 removeEventListener, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "keydown listener 挂到全局 document, cleanup 必须 removeEventListener, 否则组件 unmount 后 listener 还在, 持续消费键盘事件, 闭包引用 stale 状态. 这条 PR 会让 LoginDialog 关闭后仍能响应 Escape, 关闭无辜弹窗.",
    },
    explanation: {
      short: "审查点: 全局 listener 必须 cleanup.",
      detail: "好的 review 指出 (1) 全局 listener 影响面 (2) 闭包陈旧风险 (3) 实际可观察到的 bug.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
];
