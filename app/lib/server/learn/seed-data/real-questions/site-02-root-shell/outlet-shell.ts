/**
 * Real questions for site-02-root-shell / outlet-shell.
 *
 * Anchor: remix/app/root.tsx L117-158 (App 组件).
 * 学习目标 (from courseCatalog L()): App 组件内 Outlet 承载页面.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2). 全部锚到 App 组件的 Outlet 出口 + login dialog +
 * LoginSuccessVeil 三件套.
 *
 * 引用 recipe: reactUseEffectMissingDep (§19.2-1) — App 内的 previewSuccessActive
 * + requestAnimationFrame 是 useEffect 依赖漏写的典型场景.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { reactUseEffectMissingDep, cssRouteTransitionPointerEvents } from "../recipes";

const PRIMARY = "app/root.tsx";
const TOUCHED = ["app/root.tsx"];
const DIALOG_TOUCHED = ["app/root.tsx", "app/components/nemesis/chat/LoginDialog.client.tsx"];

export const outletShellQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 App 组件的 default export",
    prompt: "root.tsx 用 export default App 把 App 暴露给谁?",
    options: [
      { id: "A", text: "React Router 7 把它作为 root route 的默认组件, 渲染整个 App 树" },
      { id: "B", text: "浏览器" },
      { id: "C", text: "wrangler" },
      { id: "D", text: "d1" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "RR 7 把 default export 当作路由根组件.",
      detail: "App 是 root route 的 entry 组件, RR 在 SSR / CSR 都用它, 内部再通过 Outlet 渲染子路由.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 App 从 loader 拿哪些字段",
    prompt: "App 组件 useLoaderData<typeof loader>() 解构出哪 4 个字段?",
    options: [
      { id: "A", text: "session, googleClientId, appUrl, authPreviewEnabled" },
      { id: "B", text: "theme, session, locale, userAgent" },
      { id: "C", text: "messages, theme, cookies, headers" },
      { id: "D", text: "user, csrf, ip, ua" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "App 拿 session + Google OAuth + appUrl + 预览开关.",
      detail: "loader 返回的 4 个字段对应登录态展示与 Google One Tap 集成, App 用 useLoaderData 拿这些.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q3 <Outlet> 作用",
    prompt: "<Outlet> 在 App 里的作用是?",
    options: [
      { id: "A", text: "渲染当前匹配到的子路由, 是 React Router 7 的页面插槽" },
      { id: "B", text: "替代 <a> 标签" },
      { id: "C", text: "显示 Toast" },
      { id: "D", text: "调用 AI Gateway" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Outlet 是子路由的渲染点.",
      detail: "App 是 root 组件, 自身不直接渲染 _index / chat / music 这些页面, 通过 Outlet 委托给匹配到的子路由, 同时 App 可以注入 context (session, openLoginDialog).",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q4 Outlet context 注入",
    prompt: "<Outlet context={{ session, openLoginDialog, loginDialogOpen }}> 注入的 context 子路由怎么读?",
    options: [
      { id: "A", text: "用 useOutletContext<typeof context>() 拿到" },
      { id: "B", text: "用 props 传" },
      { id: "C", text: "用 window 全局" },
      { id: "D", text: "读不到" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "useOutletContext 是 RR 提供的对称 hook.",
      detail: "子路由调用 useOutletContext<typeof context>() 拿到强类型 context, 比如打开登录弹窗.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "fill_blank",
    title: "Q5 returnTo 来源",
    prompt: "returnTo = getSafeReturnTo(`_____`); 拼接了 location 的三段.",
    options: [],
    correctAnswer: { values: { parts: "${location.pathname}${location.search}${location.hash}" } },
    blanks: [{ id: "parts", placeholder: "三段", acceptedAnswers: ["${location.pathname}${location.search}${location.hash}", "location.pathname + location.search + location.hash", "pathname + search + hash"] }],
    explanation: {
      short: "拼接 pathname + search + hash 作为登录后返回路径.",
      detail: "登录前用户可能停在任何路径, 包括 query / hash, 完整拼接才能让登录后跳回原位置. getSafeReturnTo 还要做白名单校验防止 open redirect.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q6 LoginSuccessVeil 触发条件",
    prompt: "App 渲染了两个 <LoginSuccessVeil>, 它们的 active 触发条件分别是? (多选)",
    options: [
      { id: "A", text: "第一个: session?.user 存在且 URL 包含 login=success" },
      { id: "B", text: "第二个: previewSuccessActive 状态为 true (Google One Tap 预览成功)" },
      { id: "C", text: "session 不存在时也会触发" },
      { id: "D", text: "路由切换时自动触发" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "两个 Veil 分别对应正式登录成功与 Google One Tap 预览成功.",
      detail: "正式登录: session 已存在 + URL 标记 login=success. 预览: GoogleOneTap 返回, 触发 previewSuccessActive. 两者不会同时为 true.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: LoginDialog 包裹",
    prompt: "LoginDialog 外面包了 <Suspense fallback={null}>, 出现在哪一行?",
    code: `1 function App() {
2   const { session, googleClientId, appUrl, authPreviewEnabled } = useLoaderData<typeof loader>();
3   const location = useLocation();
4   const [loginDialogOpen, setLoginDialogOpen] = useState(false);
5   const [previewSuccessActive, setPreviewSuccessActive] = useState(false);
6   const returnTo = getSafeReturnTo(\`\${location.pathname}\${location.search}\${location.hash}\`);
7   return (
8     <>
9       <Outlet context={{ session, openLoginDialog: () => setLoginDialogOpen(true), loginDialogOpen }} />
10      <RouteTransition />
11      {!session?.user && (
12        <>
13          {loginDialogOpen && (
14            <Suspense fallback={null}>
15              <LoginDialog`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "function App() {" },
      { id: "L7", lineNumber: 7, text: "return (" },
      { id: "L9", lineNumber: 9, text: "<Outlet context={...} />" },
      { id: "L14", lineNumber: 14, text: "<Suspense fallback={null}>" },
      { id: "L15", lineNumber: 15, text: "<LoginDialog" },
    ],
    correctAnswer: { lineId: "L14" },
    explanation: {
      short: "第 14 行包裹 Suspense, 让 LoginDialog 动态 import 期间不闪空白.",
      detail: "LoginDialog 是 .client 组件, 动态 import 走 Suspense. fallback 是 null, 表示 import 完成前不渲染占位, 避免遮挡页面.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: DIALOG_TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q8 ClientOnly 包裹 GoogleOneTap",
    prompt: "GoogleOneTap 用 <ClientOnly> 包裹, 而不是直接渲染, 为什么?",
    options: [
      { id: "A", text: "GoogleOneTap 依赖 window.google 与 IntersectionObserver, SSR 阶段会抛错" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "React 19 不支持直接渲染" },
      { id: "D", text: "Tailwind 限制" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "GoogleOneTap 用了 window, 不能 SSR.",
      detail: "Google Identity Services 在浏览器加载脚本, window.google 是必需的, ClientOnly 阻止 SSR 渲染避免 hydration mismatch.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q9 RouteTransition 位置",
    prompt: "<RouteTransition /> 放在 <Outlet> 之后, 不在 App 最外层, 作用是?",
    options: [
      { id: "A", text: "RR 7 的 layout tree 渲染顺序, RouteTransition 覆盖整个 layout 区域" },
      { id: "B", text: "放哪都一样" },
      { id: "C", text: "放 Outlet 之后会重复渲染" },
      { id: "D", text: "TS 限制" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "位置不影响效果, App 树最终都会被 RouteTransition 覆盖.",
      detail: "RouteTransition 监听 navigation.state, 渲染一个 fixed 定位的遮罩, 位置不影响, 放 Outlet 之后是惯用模式, 让逻辑阅读顺序与视觉层级一致.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q10 !session?.user 守卫",
    prompt: "{!session?.user && (...)} 块里只渲染 GoogleOneTap 与 LoginDialog, 原因? (多选)",
    options: [
      { id: "A", text: "已登录用户不需要看登录弹窗" },
      { id: "B", text: "避免已登录用户每次刷新都看到 GoogleOneTap 弹窗骚扰" },
      { id: "C", text: "减少不必要的 client-only 组件挂载" },
      { id: "D", text: "Tailwind 限制" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "已登录跳过登录 UI, 减少渲染与体验骚扰.",
      detail: "session?.user 存在说明已登录, 整个登录提示链都不该渲染, 这是基本的产品体验设计.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q11 setLoginDialogOpen 调用",
    prompt: "openLoginDialog = () => setLoginDialogOpen(true) 通过 Outlet context 暴露, 子路由调它?",
    options: [
      { id: "A", text: "子路由可以打开登录弹窗, 例如 Header 按钮 / 受保护操作" },
      { id: "B", text: "子路由不调用, 装饰用" },
      { id: "C", text: "子路由调它会报错" },
      { id: "D", text: "TS 类型不匹配" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "子路由通过 useOutletContext 拿到 openLoginDialog, 触发登录流.",
      detail: "子路由不直接 import App 状态, 通过 Outlet context 调 openLoginDialog, 例如 Header 登录按钮 / 受保护操作触发 401 时.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 已登录用户访问首页",
    prompt: "已登录用户访问 / 时, App 渲染哪些东西?",
    options: [
      { id: "outlet", text: "<Outlet> 渲染 _index 页面" },
      { id: "no-dialog", text: "session?.user 存在, 跳过 LoginDialog / GoogleOneTap" },
      { id: "veil", text: "第一个 Veil: session 存在但 URL 不含 login=success, 不渲染" },
      { id: "preview", text: "previewSuccessActive 初始为 false, 第二个 Veil 不渲染" },
    ],
    correctAnswer: { pathIds: ["outlet", "no-dialog", "veil", "preview"] },
    explanation: {
      short: "已登录用户: Outlet 渲染页面, 登录 UI 全部跳过.",
      detail: "session?.user 守卫让整块登录提示消失, 两个 Veil 都不会激活. 用户看到的就是普通首页.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 登录成功的 Veil 切换",
    prompt: "用户登录成功, 重定向到 /?login=success, 两个 Veil 状态?",
    options: [
      { id: "first", text: "第一个 Veil: session 存在 + URL 包含 login=success, active=true" },
      { id: "second", text: "第二个 Veil: previewSuccessActive 仍 false, active=false" },
      { id: "render", text: "用户看到第一个 Veil 覆盖层, 显示登录成功提示" },
    ],
    correctAnswer: { pathIds: ["first", "second", "render"] },
    explanation: {
      short: "只有第一个 Veil 激活, 显示正式登录成功.",
      detail: "URL 里的 login=success 是后端重定向时加的标记, 第一个 Veil 监听它, 第二个只响应 GoogleOneTap 预览.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 loginDialogOpen 状态变化",
    prompt: "用户点击 Header 登录按钮 → openLoginDialog() → setLoginDialogOpen(true) → LoginDialog 怎么出现?",
    options: [
      { id: "A", text: "setLoginDialogOpen(true) 后, loginDialogOpen 守卫解除, Suspense 内的 LoginDialog 挂载" },
      { id: "B", text: "页面刷新" },
      { id: "C", text: "loader 重新跑" },
      { id: "D", text: "window 弹窗" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "setState 触发守卫求值, 弹窗挂载.",
      detail: "React 重渲染 App, 看到 loginDialogOpen=true 渲染 LoginDialog, Suspense 处理动态 import 等待期, 完成后弹窗出现.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: DIALOG_TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q15 App 重渲染频率",
    prompt: "用户从一个页面切到另一个, App 重渲染几次?",
    options: [
      { id: "A", text: "1 次, RR 把整个 layout 树视为一个组件, navigation 触发 App 重渲染" },
      { id: "B", text: "0 次" },
      { id: "C", text: "2 次" },
      { id: "D", text: "无限次" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "navigation 触发 App 重渲染, Outlet 内子路由切换不再次触发 App.",
      detail: "Outlet 内部子路由切换时, App 也会重渲染 (location 变化), 但 React 协调保证稳定子树不重 mount.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把 Outlet context 改成 props",
    prompt: "AI 改坏: AI 在子路由改 useOutletContext 读取, 改用 props. 最大风险是?",
    options: [
      { id: "A", text: "Outlet 不会向子路由传 props, 子路由拿不到 session / openLoginDialog" },
      { id: "B", text: "TS 编译会失败" },
      { id: "C", text: "loader 失败" },
      { id: "D", text: "D1 写不进去" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Outlet 不传 props, 改用 useOutletContext.",
      detail: "RR 7 的 Outlet 只渲染匹配的子路由组件, 不传 props. 子路由与 layout 通信靠 Outlet context (useOutletContext), 改成 props 是误解了 RR 数据流.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
    realWorldImpact: "子路由拿不到 session, 已登录用户被当成未登录, 弹出 GoogleOneTap 骚扰.",
    aiReviewRisk: "把 React props 机制与 RR Outlet context 混淆, 破坏了 layout 子树通信契约.",
    wrongAnswerFeedback: {
      B: "TS 不会失败, 编译过但运行时拿不到值.",
      C: "loader 与 context 无关.",
      D: "D1 与 context 无关.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 删除 ClientOnly",
    prompt: "AI 改坏: AI 觉得 ClientOnly '多余' 直接删除, 让 GoogleOneTap 直接渲染. 后果是?",
    options: [
      { id: "A", text: "SSR 阶段 window 不存在, 抛 ReferenceError, hydrate 失败" },
      { id: "B", text: "GoogleOneTap 不会显示" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ClientOnly 阻止 SSR, 删除会触发 ReferenceError.",
      detail: "GoogleOneTap 内部读 window.google, SSR 阶段 window 是 undefined, 抛 ReferenceError, 整个 SSR 失败, 返回 500.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "线上首页 SSR 抛错, 用户看到 500 错误页, 整站不可用.",
    aiReviewRisk: "把 'client-only 组件' 当成普通组件处理, 忽略 SSR 阶段没有浏览器 API.",
    wrongAnswerFeedback: {
      B: "错误不只是不显示, 是 SSR 阶段就崩.",
      C: "TS 不会报错, window.google 是合法类型访问 (在 .tsx 文件里 window 是 global).",
      D: "严重影响 SSR.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 Suspense fallback 改成 <div>loading</div>",
    prompt: "AI 改坏: AI 觉得 fallback={null} '不友好', 改成 <div>loading...</div>. 后果是?",
    options: [
      { id: "A", text: "动态 import 期间用户看到一个 loading 文字一闪而过, 体验差" },
      { id: "B", text: "Suspense 报错" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "弹窗组件用 loading 文字会突兀, 应 null 让 import 透明.",
      detail: "LoginDialog 的 import 在生产是 50ms 内完成, 文字 loading 会闪一下然后变成弹窗, 体验糟. null fallback 让 import 阶段无感知.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: DIALOG_TOUCHED,
    realWorldImpact: "用户点登录按钮先看到 'loading...' 然后弹窗, 视觉上像多了一步.",
    aiReviewRisk: "把 loading 文字当成'通用最佳实践', 忽略了不同组件的加载时长.",
    wrongAnswerFeedback: {
      B: "Suspense 不会报错, 任何 ReactNode 都是合法 fallback.",
      C: "TS 不会报错.",
      D: "视觉有影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §19.2-1 useEffect 依赖漏写",
    prompt: reactUseEffectMissingDep({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).prompt,
    options: reactUseEffectMissingDep({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).options,
    correctAnswer: reactUseEffectMissingDep({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: reactUseEffectMissingDep({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "App 内 previewSuccessActive + requestAnimationFrame 的 useEffect 漏依赖会导致 Veil 不在正确时机激活, 体验错乱.",
    aiReviewRisk: "为'避免 effect 重跑'漏写 location / session 依赖, 导致过期闭包.",
    wrongAnswerFeedback: reactUseEffectMissingDep({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 引用 §20.3-2 RouteTransition pointer-events",
    prompt: cssRouteTransitionPointerEvents({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 19,
    }).prompt,
    options: cssRouteTransitionPointerEvents({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 19,
    }).options,
    correctAnswer: cssRouteTransitionPointerEvents({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 19,
    }).correctAnswer as { choiceId: string },
    explanation: cssRouteTransitionPointerEvents({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 19,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "leaving 阶段用户点击穿透到旧页面, 触发双重 navigation, 旧 fetcher 误触发.",
    aiReviewRisk: "为'用户体验'打开 leaving 阶段点击, 实际破坏路由切换的不变量.",
    wrongAnswerFeedback: cssRouteTransitionPointerEvents({
      lessonSlug: "outlet-shell",
      courseSlug: "site-02-root-shell",
      orderIndex: 19,
    }).wrongAnswerFeedback ?? {},
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 Outlet context 流",
    prompt: "用自己的话解释 App 组件如何通过 Outlet context 把 session 与 openLoginDialog 暴露给子路由, 以及为什么用 context 而不是 props.",
    options: [],
    correctAnswer: {
      text: "App 在 <Outlet context={{...}}> 里注入 context, 子路由通过 useOutletContext<typeof context>() 拿到 session / openLoginDialog / loginDialogOpen. 用 context 是因为 Outlet 不传 props, 子路由与 App 之间没有直接调用关系, context 是 RR 提供的'跨组件树通信'机制, 强类型 + 简单, 比 redux / event bus 轻量.",
    },
    explanation: {
      short: "Outlet context 是 RR 提供的轻量跨层通信.",
      detail: "对比 props: Outlet 不传 props, 子路由组件签名无法预知 App 的字段. 对比全局状态: 仅 layout 子树需要, context 限制在 Outlet 层级, 不污染其他路由.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "假设 PR 删除了 <Suspense fallback={null}> 包裹 LoginDialog, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "LoginDialog 是 .client 动态 import, 没有 Suspense 包裹会在第一次打开时同步等待 import 完成, 阻塞渲染 200-500ms, 用户感觉点登录没反应. Suspense fallback={null} 让 import 异步, 体验顺滑.",
    },
    explanation: {
      short: "审查点: Suspense 包裹 .client 动态 import.",
      detail: "好的 review 指出 (1) 动态 import 必须 Suspense (2) fallback null vs loading 文字的取舍 (3) 用户可感知的延迟.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: DIALOG_TOUCHED,
  }),
];
