/**
 * Real questions for site-12-client-boundary / lazy-import.
 *
 * Anchor: remix/app/root.tsx L28-29 (lazy import LoginDialog + GoogleOneTap) +
 *          remix/app/components/common/ClientOnly.tsx.
 * 学习目标: 客户端动态 import + Suspense + ClientOnly 三件套, 减少首包.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: tsServerImportInClient (§12.2-TS-3) — 涉及 .client / .server 边界.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { tsServerImportInClient } from "../recipes";

const PRIMARY = "app/root.tsx";
const CLIENT_ONLY = "app/components/common/ClientOnly.tsx";
const TOUCHED = [PRIMARY, CLIENT_ONLY, "app/components/auth/LoginDialog.tsx", "app/components/auth/GoogleOneTap.client.tsx"];

export const lazyImportQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 React.lazy 作用",
    prompt: "const LoginDialog = lazy(() => import('~/components/auth/LoginDialog')); 的语义?",
    options: [
      { id: "A", text: "动态 import, 首次渲染 LoginDialog 时才下载 / 解析 / 编译它的 chunk" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "lazy() 让组件在首次渲染时才被 import, 减少首屏 bundle.",
      detail: "顶层 import 会把 LoginDialog 打进 main chunk, 首次访问就下载. lazy() 把它拆到独立 chunk, 用户第一次点登录按钮才下载, 首屏少 30-100KB.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 lazy 来自哪个包",
    prompt: "lazy 来自?",
    options: [
      { id: "A", text: "React (import { lazy } from 'react')" },
      { id: "B", text: "RR 7" },
      { id: "C", text: "node" },
      { id: "D", text: "vite" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "lazy 来自 React, RR 不提供独立的 lazy.",
      detail: "React 18 提供的 lazy 接收 () => import() 返回 Promise<{ default: Component }>, 与 Suspense 配合使用.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 ClientOnly 角色",
    prompt: "ClientOnly 在 RR 7 里的角色?",
    options: [
      { id: "A", text: "客户端边界保护, SSR 阶段渲染 fallback, hydrate 之后才渲染 children, 防 SSR crash" },
      { id: "B", text: "性能" },
      { id: "C", text: "装饰" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ClientOnly 守 SSR 边界, 防止 client-only 组件 SSR 抛错.",
      detail: "GoogleOneTap 内部读 window.google, SSR 抛 ReferenceError. ClientOnly 用 hasMounted state 推迟渲染, 解决 SSR / CSR 边界.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: CLIENT_ONLY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 hasMounted 何时变 true",
    prompt: "ClientOnly 的 hasMounted 状态在 useEffect 里设为 _____. 整个 useEffect 没有依赖数组, 等价于 _____ 钩子.",
    options: [],
    correctAnswer: { values: { v: "true, mount" } },
    blanks: [{ id: "v", placeholder: "值,钩子", acceptedAnswers: ["true, mount", "true, mounted", "true, didMount"] }],
    explanation: {
      short: "useEffect(() => setHasMounted(true), []) 等价于 componentDidMount.",
      detail: "空依赖数组的 useEffect 只在 mount 时跑一次, 类比老版 class 的 componentDidMount, 是 ClientOnly 的核心机制.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: CLIENT_ONLY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 ClientOnly 触发 hydration",
    prompt: "ClientOnly 的 useEffect setHasMounted(true) 之后, React 行为? (多选)",
    options: [
      { id: "A", text: "触发组件重渲染, 此时 hasMounted=true, 渲染 children()" },
      { id: "B", text: "React 协调时把 fallback 替换成 children" },
      { id: "C", text: "客户端与服务端 DOM 不一致, 触发 hydration warning" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "useEffect 触发重渲染, 从 fallback 切到 children, 是 React 推荐的 SSR 不一致消除模式.",
      detail: "首次 SSR 渲染 fallback (null), 客户端 hydrate 时 SSR 标记为 'already rendered fallback', useEffect 后再切到 children. React 协调处理, 不报警告.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: CLIENT_ONLY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
  }),
  q({
    type: "single_choice",
    title: "Q6 fallback 默认值",
    prompt: "ClientOnly({ children, fallback = null }) 默认 fallback 是?",
    options: [
      { id: "A", text: "null, SSR 阶段不渲染任何东西" },
      { id: "B", text: "<div>loading</div>" },
      { id: "C", text: "空 Fragment" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "fallback 默认 null, 不渲染占位, 适合 GoogleOneTap 类'不到时候不显示'的组件.",
      detail: "GoogleOneTap 不需要 loading 占位 (它是按需弹窗), fallback null 让 SSR 与 CSR 都无 DOM 干扰, hydrate 后才出现.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: CLIENT_ONLY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: setHasMounted",
    prompt: "setHasMounted(true) 出现在 ClientOnly 哪一行?",
    code: `1 export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
2   const [hasMounted, setHasMounted] = useState(false);
3
4   useEffect(() => {
5     setHasMounted(true);
6   }, []);`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "const [hasMounted, setHasMounted] = useState(false);" },
      { id: "L4", lineNumber: 4, text: "useEffect(() => {" },
      { id: "L5", lineNumber: 5, text: "setHasMounted(true);" },
      { id: "L6", lineNumber: 6, text: "}, []);" },
    ],
    correctAnswer: { lineId: "L5" },
    explanation: {
      short: "第 5 行 useEffect 内 setHasMounted(true), 触发重渲染.",
      detail: "mount 后 setState, React 看到 hasMounted 变 true, 重新执行组件函数, 进入 children() 分支, 渲染真实内容.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: CLIENT_ONLY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
  }),
  q({
    type: "single_choice",
    title: "Q8 children 是函数",
    prompt: "ClientOnly 的 children 类型是 () => ReactNode, 而不是 ReactNode, 为什么?",
    options: [
      { id: "A", text: "函数式 children 让组件在 hasMounted 前不执行, 真正'需要时才渲染'" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "函数式 children 延迟求值, 避免 SSR 阶段执行可能抛错的代码.",
      detail: "如果 children 是 ReactNode, SSR 阶段已经执行 children 的内容, GoogleOneTap 内部读 window.google 抛错. 改成 () => ReactNode 后, hasMounted=false 时不调用, 完全跳过.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: CLIENT_ONLY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
  }),
  q({
    type: "single_choice",
    title: "Q9 Suspense 与 ClientOnly 关系",
    prompt: "<Suspense><ClientOnly>...</ClientOnly></Suspense> 嵌套, 各自职责?",
    options: [
      { id: "A", text: "Suspense 处理 async import (lazy), ClientOnly 处理 SSR/CSR 边界" },
      { id: "B", text: "重复" },
      { id: "C", text: "冲突" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Suspense + ClientOnly 处理两个不同问题, 互补.",
      detail: "lazy() 是异步 import, 必须 Suspense 包裹, fallback null 让 import 透明. ClientOnly 处理 SSR/CSR 边界, hasMounted 推迟渲染. 两者职责不同, 配合用.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q10 lazy 的 import 路径",
    prompt: "lazy(() => import('~/components/auth/LoginDialog')) 中 '~/' 路径? (多选)",
    options: [
      { id: "A", text: "Vite / TS 路径别名, 解析到 remix/app/" },
      { id: "B", text: "运行时相对路径" },
      { id: "C", text: "可以在 tsconfig.json 配置" },
      { id: "D", text: "可以在 vite.config 配置" },
    ],
    correctAnswer: { choiceIds: ["A", "C", "D"] },
    explanation: {
      short: "~ 是 Vite / TS 路径别名, 指向 remix/app/.",
      detail: "~/components/auth/LoginDialog 在 vite build 时被解析为绝对路径. tsconfig 配 paths, vite 配 resolve.alias, 保持一致.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q11 lazy 不支持 SSR 的部分",
    prompt: "lazy() 在 SSR 阶段如何处理?",
    options: [
      { id: "A", text: "SSR 阶段 lazy 抛 Promise, 等待 resolve, 同步渲染组件, 但需要 Suspense fallback" },
      { id: "B", text: "SSR 不支持 lazy" },
      { id: "C", text: "SSR 跳过 lazy" },
      { id: "D", text: "SSR 报错" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSR 阶段 lazy 同步等待 import resolve, 仍然需要 Suspense fallback.",
      detail: "RR 7 在 SSR 时 await lazy 的 Promise, 同步拿到组件. 但 fallback={null} 仍然有意义, 因为 import 期间 DOM 不能是空的.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 SSR 完整路径",
    prompt: "SSR 阶段 lazy + ClientOnly + Suspense 三件套的处理路径?",
    options: [
      { id: "lazy", text: "lazy(() => import(...)) 触发同步 import, RR 7 await resolve" },
      { id: "suspense", text: "Suspense fallback 渲染 (null), 期间显示占位" },
      { id: "client-only", text: "ClientOnly useEffect 没跑 (SSR 没 useEffect), hasMounted=false 渲染 fallback" },
      { id: "html", text: "用户看到 null, HTML 流式返回" },
    ],
    correctAnswer: { pathIds: ["lazy", "suspense", "client-only", "html"] },
    explanation: {
      short: "lazy 同步等 import, Suspense fallback 占位, ClientOnly SSR 时 fallback (null).",
      detail: "SSR 阶段: RR 7 同步 await lazy, Suspense 显示 fallback, ClientOnly hasMounted=false 也显示 fallback, 最终用户看到 null 占位. 不抛错, 不破坏 SSR.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 hydrate 完整路径",
    prompt: "浏览器拿到 HTML, hydrate 触发?",
    options: [
      { id: "fouc", text: "防闪烁脚本设 html className" },
      { id: "hydrate", text: "React hydrate, 复用 SSR DOM (null 占位)" },
      { id: "client-only", text: "ClientOnly useEffect 跑, hasMounted=true, 触发重渲染" },
      { id: "real", text: "children() 调用, 真正组件挂载 (GoogleOneTap 内部读 window.google, 不再抛错)" },
    ],
    correctAnswer: { pathIds: ["fouc", "hydrate", "client-only", "real"] },
    explanation: {
      short: "hydrate → useEffect → hasMounted=true → 真正组件挂载.",
      detail: "hydrate 后 useEffect 跑, hasMounted 变 true, 触发重渲染, 真正组件挂载. 时序: SSR fallback → hydrate 复用 → effect 切换 → 真正组件.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: CLIENT_ONLY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
  }),
  q({
    type: "single_choice",
    title: "Q14 lazy import 失败",
    prompt: "网络抖动导致 GoogleOneTap lazy import 失败, React 行为?",
    options: [
      { id: "A", text: "ErrorBoundary 捕获 (如果包了), 否则抛到上层错误处理" },
      { id: "B", text: "永远 loading" },
      { id: "C", text: "no-op" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "lazy import 失败会触发 ErrorBoundary, 不是无限 loading.",
      detail: "Promise reject → lazy 抛 error → 最近的 ErrorBoundary 捕获. 项目里根 root.tsx ErrorBoundary 会兜底, 用户看到 RouteErrorBoundary.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 useState 初值 false",
    prompt: "const [hasMounted, setHasMounted] = useState(false); 初值为什么是 false 而不是 true?",
    options: [
      { id: "A", text: "SSR 阶段必须渲染 fallback, useState(false) 保证服务端与客户端 hydrate 之前都是 false" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "初值 false 保证 SSR 渲染 fallback, 客户端 hydrate 立即 fallback, useEffect 后再切.",
      detail: "如果初值 true, SSR 直接渲染 children, 客户端 hydrate 也 children, 但 useEffect 还没跑, 渲染正常. 但 useState 初值必须 SSR 与 CSR 一致, false 是最稳妥的 fallback 起点.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: CLIENT_ONLY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把 lazy 改顶层 import",
    prompt: "AI 改坏: AI 把 const LoginDialog = lazy(...) 改成 import LoginDialog from '~/components/auth/LoginDialog'. 后果是?",
    options: [
      { id: "A", text: "LoginDialog 被打进 main chunk, 首屏多 30-100KB, 用户访问 / 不需要 LoginDialog 也下载" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更兼容" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "顶层 import 把 LoginDialog 打进 main chunk, 首屏变大.",
      detail: "vite 把顶层 import 静态分析, 整个 LoginDialog + 它的依赖全部进 main bundle. 用户访问 / 时根本不需要 LoginDialog, 但已经下载了. lazy() 的价值就是按需加载.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "首屏多 30-100KB, 移动端 LCP 退到 3s+, 用户感知变慢.",
    aiReviewRisk: "为'简单'改顶层 import, 失去动态 import 的代码分包价值.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 两种 import 都合法.",
      C: "更兼容是反话, 兼容性一样.",
      D: "有性能影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把 Suspense fallback 改 loading 文字",
    prompt: "AI 改坏: AI 把 <Suspense fallback={null}> 改 fallback={<div>Loading...</div>}. 后果是?",
    options: [
      { id: "A", text: "用户看到 'Loading...' 文字一闪, 之后变成弹窗, 体验突兀" },
      { id: "B", text: "更友好" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "loading 文字对弹窗类组件是反模式, 应该 null 让 import 透明.",
      detail: "LoginDialog / GoogleOneTap 的 import 在生产环境 50ms 内完成, 文字 loading 闪一下然后弹窗, 体验差. 业务组件 (页面 / 长列表) 适合 loading 文字, 弹窗类适合 null.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户点登录按钮, 先看到 'Loading...' 然后弹窗, 像多了一步, 体验退步.",
    aiReviewRisk: "把'Loading 文字'当成通用最佳实践, 忽略弹窗 vs 页面的不同.",
    wrongAnswerFeedback: {
      B: "对弹窗不友好.",
      C: "TS 不会报错.",
      D: "有体验影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 删 useEffect 直接 useState(true)",
    prompt: "AI 改坏: AI 觉得 useEffect '多此一举' 改成 const [hasMounted] = useState(true). 后果是?",
    options: [
      { id: "A", text: "SSR 阶段 hasMounted=true, 直接渲染 children(), GoogleOneTap 内部读 window.google 抛 ReferenceError" },
      { id: "B", text: "更简洁" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "useState(true) 让 SSR 立即渲染 children, 触发 window 抛错.",
      detail: "ClientOnly 的设计目标就是延迟渲染到客户端, 删 useEffect 等于取消延迟. SSR 阶段 children() 立即执行, GoogleOneTap 抛 ReferenceError, SSR 失败.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: CLIENT_ONLY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
    realWorldImpact: "SSR 抛 ReferenceError, 整页 500, 部署后用户访问首页全挂.",
    aiReviewRisk: "为'简洁'删 ClientOnly 的核心机制, 破坏 SSR/CSR 边界保护.",
    wrongAnswerFeedback: {
      B: "删核心机制不是简洁.",
      C: "TS 不会报错.",
      D: "有严重 SSR 失败.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §12.2-TS-3 client 导入 server",
    prompt: tsServerImportInClient({
      lessonSlug: "lazy-import",
      courseSlug: "site-12-client-boundary",
      orderIndex: 18,
    }).prompt,
    options: tsServerImportInClient({
      lessonSlug: "lazy-import",
      courseSlug: "site-12-client-boundary",
      orderIndex: 18,
    }).options,
    correctAnswer: tsServerImportInClient({
      lessonSlug: "lazy-import",
      courseSlug: "site-12-client-boundary",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: tsServerImportInClient({
      lessonSlug: "lazy-import",
      courseSlug: "site-12-client-boundary",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
    realWorldImpact: "lazy 加载的 client 组件 import server 模块, bundle 泄露, 可能暴露 secret / Worker-only API.",
    aiReviewRisk: "把 .client / .server 后缀当成'标签', 忽略其强制隔离边界.",
    wrongAnswerFeedback: tsServerImportInClient({
      lessonSlug: "lazy-import",
      courseSlug: "site-12-client-boundary",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 children 类型改回 ReactNode",
    prompt: "AI 改坏: AI 觉得 children: () => ReactNode '复杂' 改回 children: ReactNode. 后果是?",
    options: [
      { id: "A", text: "SSR 阶段 children 立即求值, GoogleOneTap 读 window.google 抛 ReferenceError" },
      { id: "B", text: "更简洁" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ReactNode children 在父组件渲染时立即执行, 失去延迟求值.",
      detail: "函数式 children 是 ClientOnly 的关键设计, 把求值推迟到 hasMounted=true. 改回 ReactNode, JSX 立即执行, SSR 阶段触发 children 函数体, 抛错.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: CLIENT_ONLY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
    realWorldImpact: "SSR 抛 ReferenceError, 部署后整站 500, 用户访问首页全挂.",
    aiReviewRisk: "为'简洁'改类型, 破坏延迟求值设计.",
    wrongAnswerFeedback: {
      B: "类型简化失去设计意图.",
      C: "TS 不会报错, children 类型变化是合法变更.",
      D: "有严重 SSR 失败.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 lazy + Suspense + ClientOnly 三件套",
    prompt: "用自己的话解释为什么 login UI 必须 lazy + Suspense + ClientOnly 三件套, 各自负责哪个层面, 缺一会出什么问题.",
    options: [],
    correctAnswer: {
      text: "lazy 负责 '何时下载' (首次渲染才下载, 减少首包). Suspense 负责 '加载时显示什么' (fallback={null} 让 import 透明, 用户不感知). ClientOnly 负责 '何时渲染' (hasMounted 推迟到客户端, 防 SSR 抛错). 缺 lazy: 首包 30-100KB 浪费. 缺 Suspense: import 期间阻塞首屏, React 报 'A component suspended while responding to synchronous input'. 缺 ClientOnly: SSR 阶段 children() 立即执行, GoogleOneTap 读 window.google 抛 ReferenceError.",
    },
    explanation: {
      short: "三件套覆盖 download / display / render 三个层面, 缺一破坏一层面.",
      detail: "lazy → Suspense → ClientOnly 是 RR 7 客户端动态 import 的标准三件套, 三者职责正交, 必须配齐.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 ClientOnly 的 useEffect 删掉, 改成 useState(true), 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "ClientOnly 的设计目标就是 hasMounted 默认 false, useEffect 切 true 来推迟渲染. 改成 useState(true) 让 SSR 立即渲染 children(), GoogleOneTap 内部读 window.google 抛 ReferenceError, 整站 SSR 失败. useEffect 是这个组件的核心机制, 不能删.",
    },
    explanation: {
      short: "审查点: useEffect 是 ClientOnly 的 SSR/CSR 边界守门, 不能删.",
      detail: "好的 review 指出 (1) useEffect 的设计意图 (2) 删除后果 (3) 真实可观察的 bug (整站 500).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: CLIENT_ONLY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: [CLIENT_ONLY],
  }),
];
