/**
 * Real questions for site-02-root-shell / error-boundary.
 *
 * Anchor: remix/app/root.tsx L162-170 (ErrorBoundary) +
 *          remix/app/components/error/{NotFound404,RouteErrorBoundary}.tsx.
 * 学习目标: ErrorBoundary 包裹子树, 404 走 NotFound404, 其他走 RouteErrorBoundary.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: reactTimerRefToLet (§19.2-5) — 错误页用 setInterval 实现打字机,
 * 漏 useRef 会导致 cleanup 不可靠, 这是 lesson 关联的 React 改坏题.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { reactTimerRefToLet } from "../recipes";

const PRIMARY = "app/root.tsx";
const TOUCHED = ["app/root.tsx", "app/components/error/NotFound404.tsx", "app/components/error/RouteErrorBoundary.tsx"];

export const errorBoundaryQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 ErrorBoundary 命名 export",
    prompt: "root.tsx 用 export function ErrorBoundary() 暴露, RR 7 怎么识别它?",
    options: [
      { id: "A", text: "RR 7 扫描 module, 识别命名 export ErrorBoundary 作为错误边界" },
      { id: "B", text: "靠文件名" },
      { id: "C", text: "靠注释" },
      { id: "D", text: "靠 d.ts" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "RR 7 靠命名 export ErrorBoundary 识别.",
      detail: "与 default export 一样, 命名 export ErrorBoundary 是 RR 7 路由模块的约定, 框架扫描 module 自动识别, 抛错时渲染 ErrorBoundary 替代子树.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 useRouteError 返回值",
    prompt: "const error = useRouteError() 的 error 可能是?",
    options: [
      { id: "A", text: "可能是 ErrorResponse (status / statusText) 或普通 Error" },
      { id: "B", text: "总是 string" },
      { id: "C", text: "总是 Error" },
      { id: "D", text: "总是 undefined" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ErrorResponse 或普通 Error, 用 isRouteErrorResponse 区分.",
      detail: "loader / action 抛 throw json({}, { status: 404 }) 走 ErrorResponse, throw new Error() 走普通 Error. 边界用 isRouteErrorResponse 区分.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q3 isRouteErrorResponse 守卫",
    prompt: "if (isRouteErrorResponse(error) && error.status === 404) 这种守卫的作用?",
    options: [
      { id: "A", text: "type guard 收窄 error 类型, status 是 ErrorResponse 的字段" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "避免 TS 报错" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "isRouteErrorResponse 是 type predicate, 收窄类型.",
      detail: "error 可能是 ErrorResponse 或 Error, 访问 error.status 之前必须 type guard, 否则 TS 报 'error 上不存在 status'.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "fill_blank",
    title: "Q4 404 fallback",
    prompt: "如果 error.status === 404, ErrorBoundary 应该渲染哪个组件? (填组件名)",
    options: [],
    correctAnswer: { values: { comp: "NotFound404" } },
    blanks: [{ id: "comp", placeholder: "组件名", acceptedAnswers: ["NotFound404", "NotFound", "NotFoundPage"] }],
    explanation: {
      short: "404 走 NotFound404, 其他走 RouteErrorBoundary.",
      detail: "项目区分'找不到'与'真错误', 404 友好提示, 其他错误展示重试 / 反馈入口.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q5 错误页面通用元素",
    prompt: "NotFound404 与 RouteErrorBoundary 共同使用? (多选)",
    options: [
      { id: "A", text: "canvas 绘制动画 (鱼/像素龙)" },
      { id: "B", text: "打字机效果显示提示文字" },
      { id: "C", text: "GsapFillLink 返回首页链接" },
      { id: "D", text: "AI Gateway 调用" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "三件套: canvas 动画 + 打字机文字 + 返回链接.",
      detail: "错误页有视觉 + 文字 + 操作, 共同点是 canvas / setInterval / GsapFillLink, 不同点是鱼 vs 像素龙 + 文字内容.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: "app/components/error/RouteErrorBoundary.tsx",
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q6 ErrorBoundary 渲染位置",
    prompt: "ErrorBoundary 渲染时, root loader 的数据是否可用?",
    options: [
      { id: "A", text: "可用, RR 7 在父 ErrorBoundary 里仍能 useLoaderData (root loader 跑成功了)" },
      { id: "B", text: "不可用" },
      { id: "C", text: "总是 null" },
      { id: "D", text: "取决于网络" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "父 ErrorBoundary 仍可读 root loader 数据.",
      detail: "RR 7 的 ErrorBoundary 替代的是子树, 不影响 layout 上的 root loader data. useRouteError 拿 error, useLoaderData 仍可拿父 loader.",
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
    title: "Q7 关键行: 404 分支",
    prompt: "if (isRouteErrorResponse(error) && error.status === 404) 出现在 root.tsx ErrorBoundary 哪一行?",
    code: `1 export function ErrorBoundary() {
2   const error = useRouteError();
3
4   if (isRouteErrorResponse(error) && error.status === 404) {
5     return <NotFound404 />;
6   }
7
8   return <RouteErrorBoundary />;
9 }`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "const error = useRouteError();" },
      { id: "L4", lineNumber: 4, text: "if (isRouteErrorResponse(error) && error.status === 404) {" },
      { id: "L5", lineNumber: 5, text: "return <NotFound404 />;" },
      { id: "L8", lineNumber: 8, text: "return <RouteErrorBoundary />;" },
    ],
    correctAnswer: { lineId: "L4" },
    explanation: {
      short: "第 4 行 type guard + status 判断.",
      detail: "isRouteErrorResponse 收窄类型, error.status 访问合法. 复合守卫同时满足才走 404 分支.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q8 useEffect cleanup 形式",
    prompt: "打字机 useEffect 末尾 return () => clearInterval(timer) 的作用是?",
    options: [
      { id: "A", text: "组件 unmount 或依赖变化时清理 setInterval, 防止内存泄漏" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "TS 要求" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "cleanup 是 useEffect 的标准清理机制.",
      detail: "打字机 setInterval 持续到 fullText 结束或组件 unmount, cleanup 强制结束 timer, 否则组件 unmount 后 timer 仍跑, 抛 'setState on unmounted component'.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: "app/components/error/RouteErrorBoundary.tsx",
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q9 canvas getContext 守卫",
    prompt: "const ctx = canvas.getContext('2d'); if (!ctx) return; 为什么需要?",
    options: [
      { id: "A", text: "getContext 可能返回 null (浏览器禁用 canvas / 内存不足), 守卫避免空引用" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "TS 编译需要" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "getContext 返回 CanvasRenderingContext2D | null, 必须守卫.",
      detail: "TS 类型上 getContext 是 (id: string) => CanvasRenderingContext2D | null, 浏览器在低内存 / 无 GPU 时返回 null, 直接 ctx.save() 会抛错.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: "app/components/error/RouteErrorBoundary.tsx",
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q10 setInterval 内 setState",
    prompt: "打字机 setInterval 里调用 setDisplayText 会? (多选)",
    options: [
      { id: "A", text: "触发组件重渲染" },
      { id: "B", text: "与 React 18 批处理兼容" },
      { id: "C", text: "在 unmount 后调用会警告 'setState on unmounted'" },
      { id: "D", text: "不影响性能" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "setInterval 里的 setState 触发重渲染, 需要 cleanup 防 stale.",
      detail: "每次 setDisplayText 触发 React 重渲染, React 18 自动批处理多次 setState. 但若组件已 unmount 而 timer 仍在跑, 会警告 stale setState.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: "app/components/error/RouteErrorBoundary.tsx",
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q11 NotFound404 与 RouteErrorBoundary 差异",
    prompt: "两者都用了 canvas + setInterval, 视觉差异在?",
    options: [
      { id: "A", text: "NotFound404 画像素龙, RouteErrorBoundary 画鱼群; 文字内容不同" },
      { id: "B", text: "完全一样" },
      { id: "C", text: "颜色不同" },
      { id: "D", text: "高度不同" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "404 画龙, 其他错误画鱼, 文案也不同.",
      detail: "项目有意区分 404 (空灵场景) 与 500 (水面游走), 增强品牌感.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: "app/components/error/NotFound404.tsx",
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 404 触发路径",
    prompt: "用户访问 /nope, RR 怎么处理?",
    options: [
      { id: "no-match", text: "没有匹配路由, RR 抛 404 ErrorResponse" },
      { id: "boundary", text: "root ErrorBoundary 捕获, isRouteErrorResponse && status === 404 命中" },
      { id: "render", text: "渲染 <NotFound404 />" },
    ],
    correctAnswer: { pathIds: ["no-match", "boundary", "render"] },
    explanation: {
      short: "未匹配路由 → 404 ErrorResponse → ErrorBoundary 渲染 NotFound404.",
      detail: "RR 7 的 splat 路由不存在时, 框架自动抛 404, 走 ErrorBoundary 的 404 分支.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 loader 抛 500 触发路径",
    prompt: "_index loader 抛 new Error('db down'), 渲染?",
    options: [
      { id: "throw", text: "loader 抛普通 Error" },
      { id: "boundary", text: "root ErrorBoundary 捕获, isRouteErrorResponse 为 false, 跳过 404 分支" },
      { id: "render", text: "渲染 <RouteErrorBoundary />" },
    ],
    correctAnswer: { pathIds: ["throw", "boundary", "render"] },
    explanation: {
      short: "普通 Error → 跳过 404 分支 → 渲染 RouteErrorBoundary.",
      detail: "isRouteErrorResponse(error) 为 false (因为不是 throw json(...)), 进入 RouteErrorBoundary, 显示重试入口.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 打字机 7 次重渲染",
    prompt: "fullText.length = 6, 打字机 150ms 一次, 一共触发几次 setDisplayText?",
    options: [
      { id: "A", text: "7 次 (index 0..6 各一次, 0 显示空字符串, 6 显示全文字)" },
      { id: "B", text: "6 次" },
      { id: "C", text: "1 次" },
      { id: "D", text: "无数次" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "index 从 0 走到 6 (含), 共 7 次 setState.",
      detail: "代码 if (index <= fullText.length) 包含 0, 0 时显示空串, 6 时显示全串, 然后 clearInterval 停止.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: "app/components/error/RouteErrorBoundary.tsx",
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q15 unmount 之后",
    prompt: "用户从 404 页立刻切到 /, NotFound404 卸载, setInterval 怎么办?",
    options: [
      { id: "A", text: "cleanup 触发 clearInterval, 打字机停止, 后续 setState 不再发生" },
      { id: "B", text: "继续跑直到 fullText 完成" },
      { id: "C", text: "setState 抛错崩" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "cleanup 及时清理, 防止 stale setState.",
      detail: "return () => clearInterval(timer) 是 useEffect 标准模式, 组件 unmount / 依赖变化时清理, 防止内存泄漏与 stale setState 警告.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: "app/components/error/NotFound404.tsx",
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 isRouteErrorResponse 守卫",
    prompt: "AI 改坏: AI 删掉 isRouteErrorResponse 守卫, 直接 if (error.status === 404). 后果是?",
    options: [
      { id: "A", text: "TS 报错 'error 上不存在 status', 编译失败" },
      { id: "B", text: "运行时崩" },
      { id: "C", text: "无影响" },
      { id: "D", text: "404 错误消失" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "TS 编译期就拒绝, 因为 error 是 Error | ErrorResponse 联合.",
      detail: "未收窄前 error.status 不存在, TS strict 模式会报错. AI 删守卫是经典 'AI 不看类型只看运行' 错误.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
    realWorldImpact: "PR 推到 CI, TS 编译失败, 阻塞部署.",
    aiReviewRisk: "把'类型守卫'当成可选装饰, 实际上守卫是访问字段的前提.",
    wrongAnswerFeedback: {
      B: "TS 在编译期就拒绝, 不会到运行时.",
      C: "编译失败是有影响的.",
      D: "404 不会消失, 编译过不去.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 删 cleanup",
    prompt: "AI 改坏: AI 觉得 '反正组件会 unmount' 删掉 return () => clearInterval(timer). 后果是?",
    options: [
      { id: "A", text: "setInterval 持续跑, 组件 unmount 后还 setState, React 警告 + 内存泄漏" },
      { id: "B", text: "setInterval 自动停止" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "cleanup 是 useEffect 的契约, 删了以后 timer 持续跑.",
      detail: "React useEffect 模式 = 'setup + cleanup', cleanup 不是可选项. 组件 unmount 后 timer 仍在调 setDisplayText, React 报警告, GC 也无法回收该闭包.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: "app/components/error/RouteErrorBoundary.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "用户从 404 切走, console 持续报 'setState on unmounted component', 内存不释放.",
    aiReviewRisk: "把 cleanup 当成'可选优化', 实际上 useEffect 的副作用管理核心.",
    wrongAnswerFeedback: {
      B: "setInterval 不会自动停止.",
      C: "TS 不会报错, cleanup 是 void 返回.",
      D: "有内存与警告影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 isRouteErrorResponse 顺序写反",
    prompt: "AI 改坏: AI 写成 if (error.status === 404 && isRouteErrorResponse(error)). 后果是?",
    options: [
      { id: "A", text: "TS 编译失败: 先访问 error.status 还没收窄, 字段不存在" },
      { id: "B", text: "404 不会渲染" },
      { id: "C", text: "运行时崩" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "短路求值顺序错, TS 仍然报 'error 上不存在 status'.",
      detail: "&& 左到右求值, 第一个表达式先被检查, error.status 仍然在未收窄联合上访问, TS 拒绝. AI 调换顺序是表面变化, TS 仍然要 type guard.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
    realWorldImpact: "PR 推到 CI, 编译失败.",
    aiReviewRisk: "把 type guard 当成'表达式之一'而不是'类型收窄前提'.",
    wrongAnswerFeedback: {
      B: "404 不会渲染是因为编译失败, 不是逻辑错误.",
      C: "TS 在编译期就拒绝, 不会到运行时.",
      D: "有影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §19.2-5 useRef timer 改 let",
    prompt: reactTimerRefToLet({
      lessonSlug: "error-boundary",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).prompt,
    options: reactTimerRefToLet({
      lessonSlug: "error-boundary",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).options,
    correctAnswer: reactTimerRefToLet({
      lessonSlug: "error-boundary",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: reactTimerRefToLet({
      lessonSlug: "error-boundary",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["frontend.state.local"],
    sourceFilePath: "app/components/error/RouteErrorBoundary.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "let timer 每次重渲染重置为 null, cleanup 拿到 null, setInterval 实际还在跑, 内存泄漏与 stale setState.",
    aiReviewRisk: "把 useRef 当成'过度设计'语法糖.",
    wrongAnswerFeedback: reactTimerRefToLet({
      lessonSlug: "error-boundary",
      courseSlug: "site-02-root-shell",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 删 canvas resize listener cleanup",
    prompt: "AI 改坏: AI 在 canvas useEffect 里 window.addEventListener('resize', ...) 但没 removeEventListener. 后果是?",
    options: [
      { id: "A", text: "组件 unmount 后 resize listener 还在监听, 引用 stale canvas, 内存泄漏" },
      { id: "B", text: "无影响" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "全局 listener 必须 cleanup, 否则 unmount 后还在跑.",
      detail: "window.addEventListener 在 component unmount 时不会自动移除, useEffect 必须 return () => window.removeEventListener(...). 否则 stale 闭包 + 内存泄漏.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: "app/components/error/RouteErrorBoundary.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "用户切走 404, 调整窗口大小仍然触发 canvas resize, 引用已卸载 canvas, console 报错.",
    aiReviewRisk: "把 window.addEventListener 当成一次性注册, 忽略 unmount 清理.",
    wrongAnswerFeedback: {
      B: "有明显内存影响.",
      C: "TS 不会报错.",
      D: "loader 与 listener 无关.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 ErrorBoundary 区分 404 与其他",
    prompt: "用自己的话解释 root.tsx ErrorBoundary 为什么要区分 404 与其他错误, 以及这种区分对用户体验的影响.",
    options: [],
    correctAnswer: {
      text: "404 表示'用户走错了路', 应当用更友好、引导回首页的方式; 其他错误 (500 / loader 抛错) 表示'系统出问题了', 应当给重试入口与反馈通道. 把两者混在一起, 用户不知道是自己的问题还是系统问题, 体验糟. 项目用 NotFound404 画龙 + '你来到了无人之境', 用 RouteErrorBoundary 画鱼 + '页面游走了', 视觉与文案都有差异.",
    },
    explanation: {
      short: "404 = 用户错, 500 = 系统错, 体验设计要分别对待.",
      detail: "好的错误页能让用户理解是'我没找对地方'还是'网站坏了', 决定下一步操作.",
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
    prompt: "PR 把 RouteErrorBoundary 的 useEffect cleanup 删了, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "useEffect 的 cleanup 不是'清理代码', 而是 effect 配对契约, 删了以后 setInterval 在组件 unmount 后仍跑, 持续触发 stale setState 警告与内存泄漏. 这条 PR 会被 React 严格模式与生产环境同时惩罚, 必须保留.",
    },
    explanation: {
      short: "审查点: useEffect cleanup 是契约, 不可删.",
      detail: "好的 review 指出 (1) cleanup 的语义 (2) 删除后果 (3) React 严格模式会主动 double-invoke 检测这种问题.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: "app/components/error/RouteErrorBoundary.tsx",
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
];
