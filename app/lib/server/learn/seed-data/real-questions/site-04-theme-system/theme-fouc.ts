/**
 * Real questions for site-04-theme-system / theme-fouc.
 *
 * Anchor: remix/app/root.tsx L91-99 (防闪烁 inline script) +
 *          remix/app/styles/theme.css.
 * 学习目标: 防闪烁内联脚本读取 theme cookie, 在 hydrate 之前给 html 加 class.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: cssDropReducedMotion (§20.3-1) — 涉及全局 CSS 与防闪烁交互.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { cssDropReducedMotion } from "../recipes";

const PRIMARY = "app/root.tsx";
const TOUCHED = [PRIMARY, "app/styles/theme.css"];

const FOC_SCRIPT = `function() {
  const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || 'light';
  document.documentElement.classList.add(theme);
}`;

export const themeFoucQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 防闪烁脚本所在文件",
    prompt: "防主题闪烁的内联 script 写在哪个文件?",
    options: [
      { id: "A", text: "app/root.tsx Layout <head> 内 (L91-99)" },
      { id: "B", text: "app/entry.server.tsx" },
      { id: "C", text: "app/utils/theme.server.ts" },
      { id: "D", text: "tailwind.css" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "防闪烁脚本在 root.tsx Layout 的 <head> 内.",
      detail: "项目刻意把防闪烁脚本放在 Layout (文档壳) 里, 而不是 entry.server 或独立 JS 文件, 跟随 root 文档结构.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 dangerouslySetInnerHTML 作用",
    prompt: "dangerouslySetInnerHTML={{ __html: '...' }} 的语义?",
    options: [
      { id: "A", text: "告诉 React 把字符串作为原始 HTML 插入, 跳过转义, 用于 inline script" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "dangerouslySetInnerHTML 跳过 React 的字符串转义, 直接插入 HTML.",
      detail: "React 默认转义子节点防止 XSS, dangerouslySetInnerHTML 是 escape hatch, 名字带 'dangerously' 提示风险. inline script 必须用它, 因为 <script> 是 HTML 元素不是字符串.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 IIFE 包裹",
    prompt: "防闪烁脚本用 (function() { ... })(); IIFE 包裹的作用?",
    options: [
      { id: "A", text: "创建局部作用域, 避免 const theme 污染 window 全局" },
      { id: "B", text: "性能优化" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "IIFE 创建局部作用域, 避免 const theme 污染 window.",
      detail: "如果不 IIFE, const theme 会成为 inline script 的块作用域变量, 但如果脚本多次执行或被外部代码引用, IIFE 是最佳实践.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 正则匹配 cookie",
    prompt: "document.cookie.match(/_____/) 用于匹配 theme=... cookie.",
    options: [],
    correctAnswer: { values: { rx: "theme=([^;]+)" } },
    blanks: [{ id: "rx", placeholder: "正则", acceptedAnswers: ["theme=([^;]+)"] }],
    explanation: {
      short: "正则 theme=([^;]+) 抓 theme cookie 值, ; 是 cookie 分隔.",
      detail: "match 返回数组, [1] 是第一个捕获组, 没有匹配时是 undefined, 兜底 'light'.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 ?.[1] 含义",
    prompt: "document.cookie.match(/theme=([^;]+)/)?.[1] 中 ?.[1] 的作用? (多选)",
    options: [
      { id: "A", text: "可选链, match 返回 null 时 (cookie 缺失) 不会抛 'cannot read property of null'" },
      { id: "B", text: "结果还是 undefined, 走 || 'light' 兜底" },
      { id: "C", text: "性能优化" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "可选链 + 兜底形成双重安全网.",
      detail: "match 返回 null 时 ?.[1] 短路返回 undefined, 不会抛错. undefined 走 || 'light' 兜底, 整段代码零抛错.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 classList.add vs className =",
    prompt: "document.documentElement.classList.add(theme) 与 document.documentElement.className = theme 的差异?",
    options: [
      { id: "A", text: "classList.add 追加, className= 覆盖, 防闪烁场景下追加更安全 (不破坏已有 class)" },
      { id: "B", text: "完全一样" },
      { id: "C", text: "className= 更快" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "classList.add 追加不覆盖, 防止破坏 React 后续加的 class.",
      detail: "className = 覆盖整个 class 字符串, 可能破坏其他 class. classList.add 只追加新 class, 配合 React hydrate 后续 setHtmlClass 不会冲突.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: cookie 解析",
    prompt: "const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || 'light'; 出现在防闪烁脚本哪一行?",
    code: `1 (function() {
2   const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || 'light';
3   document.documentElement.classList.add(theme);
4 })();`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "(function() {" },
      { id: "L2", lineNumber: 2, text: "const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || 'light';" },
      { id: "L3", lineNumber: 3, text: "document.documentElement.classList.add(theme);" },
      { id: "L4", lineNumber: 4, text: "})();" },
    ],
    correctAnswer: { lineId: "L2" },
    explanation: {
      short: "第 2 行 match + 可选链 + 兜底, 形成 '读取 theme cookie' 的核心逻辑.",
      detail: "正则抓 cookie, 可选链防 null, 兜底 'light', 最终得到 'light' / 'dark' / 其他值, 都符合 CSS 变量名.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 documentElement 是什么",
    prompt: "document.documentElement 指向?",
    options: [
      { id: "A", text: "<html> 元素, 文档根节点" },
      { id: "B", text: "<body>" },
      { id: "C", text: "<head>" },
      { id: "D", text: "document 自己" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "document.documentElement 是 <html> 元素.",
      detail: "HTML 文档结构: document > documentElement (<html>) > head + body. 防闪烁脚本给 <html> 加 className, 全局 CSS 变量能立即响应.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 脚本在 head 内的位置",
    prompt: "防闪烁 script 放在 <Meta /> <Links /> 之后, 在 <body> 之前, 位置选择?",
    options: [
      { id: "A", text: "在 <head> 末尾, 浏览器解析 <head> 完成后立即执行, 抢在首次 paint 之前" },
      { id: "B", text: "在 <body> 底部" },
      { id: "C", text: "随机" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "<head> 末尾保证浏览器在 paint 之前执行, 设好 html className.",
      detail: "浏览器解析到 <head> 末尾时执行 inline script, 立即修改 <html> className. 然后浏览器开始 paint, 此时 html 已有正确 className, CSS 变量生效, 不会闪.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 SSR 时脚本是否执行",
    prompt: "防闪烁 inline script 在 SSR 阶段会执行吗? (多选)",
    options: [
      { id: "A", text: "不会, SSR 阶段 React 只把 <script> 标签 + 字符串塞进 HTML 响应, 浏览器解析时才执行" },
      { id: "B", text: "会在 server 跑" },
      { id: "C", text: "不会抛 ReferenceError, 因为 server 阶段不执行" },
      { id: "D", text: "会立即执行" },
    ],
    correctAnswer: { choiceIds: ["A", "C"] },
    explanation: {
      short: "SSR 只输出 HTML 字符串, 浏览器解析时才执行, 不会抛错.",
      detail: "React 的 dangerouslySetInnerHTML 在 server 阶段只塞字符串, 不跑 JS. 浏览器解析到 <script> 标签时 document 已存在, 正常运行. SSR 与 CSR 都不会抛错.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 SSR 已设 className",
    prompt: "SSR 阶段 <html className={theme}> 已经是 'dark', 防闪烁脚本会不会再覆盖?",
    options: [
      { id: "A", text: "如果 cookie 也是 'dark', classList.add('dark') 幂等无副作用; 如果 cookie 是 'light', 脚本会修正 SSR 错误" },
      { id: "B", text: "会强制覆盖" },
      { id: "C", text: "SSR 阶段 classList.add 不跑" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "classList.add 幂等, 但 cookie 与 loader 不一致时脚本会修正.",
      detail: "如果 cookie 与 loader 都返回 'dark', 脚本 add('dark') 幂等. 如果 loader 失败 / race 导致 SSR 是 'dark' 但 cookie 是 'light' (用户刚切换), 脚本 add('light') 会修正, 配合防闪烁. 是双重保险机制.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 首次访问 dark 用户",
    prompt: "用户首次访问, cookie 没 theme, SSR 用默认 'light', 防闪烁脚本运行后?",
    options: [
      { id: "cookie", text: "document.cookie 无 theme=xxx" },
      { id: "match", text: "match 返回 null, ?.[1] 拿 undefined" },
      { id: "fallback", text: "|| 'light' 兜底到 'light'" },
      { id: "html", text: "classList.add('light'), <html className> 仍 'light', 不闪" },
    ],
    correctAnswer: { pathIds: ["cookie", "match", "fallback", "html"] },
    explanation: {
      short: "无 cookie 走兜底, 不闪屏.",
      detail: "首次访问无 cookie, 防闪烁脚本与 SSR 都用 'light', className 一致, 用户不感知.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "branch_trace",
    title: "Q13 SSR 与 cookie 不一致",
    prompt: "用户刚切到 dark (action 写 cookie), 但 loader 还没拿到 (race), SSR 渲染 'light', 防闪烁脚本?",
    options: [
      { id: "ssr", text: "SSR <html className='light'>" },
      { id: "script", text: "浏览器解析到防闪烁脚本, 读 cookie 拿到 'dark'" },
      { id: "fix", text: "classList.add('dark'), <html className> 变为 'dark'" },
      { id: "no-flicker", text: "视觉无感知, 不闪屏" },
    ],
    correctAnswer: { pathIds: ["ssr", "script", "fix", "no-flicker"] },
    explanation: {
      short: "防闪烁脚本修正 SSR 错误, 用户无感知.",
      detail: "action 与 loader 之间存在 race, 防闪烁脚本作为客户端最后一道保险, 读 cookie 修正 SSR 错误, 用户不会看到 'light' 闪一下切到 'dark'.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q14 主题切换瞬时状态",
    prompt: "用户在 light 页面点切换按钮, 浏览器立刻切到 dark 吗?",
    options: [
      { id: "A", text: "不是立刻, Form submit 等 action 返回 Set-Cookie 后, 下次 loader / hydrate 才反映" },
      { id: "B", text: "立即" },
      { id: "C", text: "刷新页面" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Form submit 是异步, 主题切换有 100-500ms 延迟.",
      detail: "用户点切换 → Form 提交 → action 写 Set-Cookie → 浏览器更新 cookie → fetcher 拿到 success → 前端决定刷新数据或重新渲染. 不是瞬间.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 用户清空 cookie",
    prompt: "用户在 DevTools 清空所有 cookie, 刷新页面, 渲染?",
    options: [
      { id: "A", text: "防闪烁脚本匹配不到 theme, 走 'light' 兜底, 渲染 'light'" },
      { id: "B", text: "抛错" },
      { id: "C", text: "无限循环" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "无 cookie 走兜底 'light', 不抛错.",
      detail: "match 返回 null, 可选链短路, || 'light' 兜底, 整段代码零抛错, 用户看到 light 主题. 整段链路容错性极强.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把防闪烁脚本挪到 body 底部",
    prompt: "AI 改坏: AI 把防闪烁 inline script 挪到 </body> 之前, 理由 '脚本放底部更现代'. 后果是?",
    options: [
      { id: "A", text: "浏览器先 paint 一次亮色 html, 脚本在 paint 后才执行, 用户看到白闪" },
      { id: "B", text: "更现代" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "防闪烁脚本必须早于首次 paint, body 底部会闪.",
      detail: "浏览器解析到 <head> 末尾开始 paint, 此时 html 没 className, 用户看到亮色. body 底部脚本跑完才 classList.add, React hydrate 完成才同步, 整链路延迟让用户看到白闪.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "暗色模式用户每次刷新看到一次白闪, 体验退步.",
    aiReviewRisk: "把'脚本放底部'当成通用最佳实践, 忽略防闪烁脚本的 paint 时序约束.",
    wrongAnswerFeedback: {
      B: "body 底部对 inline 防闪烁脚本是反模式.",
      C: "TS 不会报错.",
      D: "严重影响暗色体验.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 用 useEffect 替代",
    prompt: "AI 改坏: AI 删 inline script, 改用 useEffect(() => { document.documentElement.classList.add(...) }, [theme]). 后果是?",
    options: [
      { id: "A", text: "useEffect 在 hydrate 之后才跑, 期间用户看到 1 次白闪" },
      { id: "B", text: "更 React" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "useEffect 在 hydrate 之后跑, 防闪烁机制失效.",
      detail: "useEffect 是 React 18 副作用, 在 hydrate 完成之后才执行. 用户已经看到 1 次亮色 paint 之后才设 className, 闪屏. 防闪烁脚本必须是同步 inline.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "暗色用户每次刷新看到一次白闪, 严重破坏防闪烁契约.",
    aiReviewRisk: "把 React 模式当成'更优', 忽略 SSR/CSR 边界时序.",
    wrongAnswerFeedback: {
      B: "React 模式不适合防闪烁场景, SSR 阶段没 React.",
      C: "TS 不会报错.",
      D: "有严重闪屏.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 删 IIFE 包裹",
    prompt: "AI 改坏: AI 觉得 IIFE '多余' 直接去掉. 后果是?",
    options: [
      { id: "A", text: "const theme 暴露为 inline script 块作用域变量, 在 ES module strict 模式下影响小, 但失去局部封装" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "抛错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "IIFE 失去局部封装, const theme 暴露块作用域, 但实际功能不受影响.",
      detail: "const theme 在 inline script 内是块作用域, 不会污染 window. IIFE 更多是代码风格与可读性. 删 IIFE 不会让防闪烁失效, 只是风格变差.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "实际功能不受影响, 但失去 IIFE 封装, 后续维护者可能误加外部依赖.",
    aiReviewRisk: "把'多余的封装'删掉, 没意识到封装对未来扩展的保护.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "不会抛错, const 块作用域足够.",
      D: "有可维护性影响但不影响功能.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §20.3-1 删除 prefers-reduced-motion",
    prompt: cssDropReducedMotion({
      lessonSlug: "theme-fouc",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).prompt,
    options: cssDropReducedMotion({
      lessonSlug: "theme-fouc",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).options,
    correctAnswer: cssDropReducedMotion({
      lessonSlug: "theme-fouc",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: cssDropReducedMotion({
      lessonSlug: "theme-fouc",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: "app/styles/theme.css",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/styles/theme.css", "app/tailwind.css"],
    realWorldImpact: "动画敏感用户无法关闭大量动效, 触发前庭功能不适甚至癫痫风险.",
    aiReviewRisk: "把无障碍偏好当成'可有可无的视觉效果优化', 实际上是无障碍合规底线.",
    wrongAnswerFeedback: cssDropReducedMotion({
      lessonSlug: "theme-fouc",
      courseSlug: "site-04-theme-system",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 classList.add 改成 className =",
    prompt: "AI 改坏: AI 觉得 add '多余' 改成 document.documentElement.className = theme. 后果是?",
    options: [
      { id: "A", text: "覆盖 <html> 所有 class, 破坏 React 后续设的 class, 引发渲染异常" },
      { id: "B", text: "更简洁" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "className = 覆盖所有 class, 破坏 React 后续 setHtmlClass.",
      detail: "classList.add 追加, 不破坏已有 class. className = 直接覆盖整个 class 字符串, React hydrate 后 Layout 设置的 className 被覆盖, 引发 className 错乱.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "hydrate 后 className 错乱, 用户看到部分样式丢失或重复应用.",
    aiReviewRisk: "把'覆盖'当成'更直接', 忽略 React 协调对 className 的管理.",
    wrongAnswerFeedback: {
      B: "add 不冗余, = 才是反模式.",
      C: "TS 不会报错.",
      D: "有渲染错乱风险.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释防闪烁脚本的双重保险作用",
    prompt: "用自己的话解释防闪烁 inline script 为什么必须在 <head> 内, 为什么用 IIFE + 可选链 + 兜底 + classList.add 四件套, 它和 SSR 的 <html className> 怎么配合.",
    options: [],
    correctAnswer: {
      text: "<head> 内保证浏览器解析时立即执行, 抢在首次 paint 之前设 className. IIFE 封装避免 const theme 暴露. 可选链 + 兜底处理 cookie 缺失. classList.add 追加不覆盖, 与 React hydrate 兼容. 双重保险: SSR <html className> 是 loader 拿到的 theme, 防闪烁脚本读 cookie 拿 '客户端最新' theme, 如果两者一致 (常见情况) 幂等, 如果不一致 (race / loader 失败) 脚本修正 SSR 错误, 用户不会感知.",
    },
    explanation: {
      short: "SSR 给静态 className, 防闪烁脚本给动态修正, 双重保险.",
      detail: "两段代码围绕 paint / hydrate 时序设计, 任何一段失效用户都能感知闪屏, 必须双保险.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把防闪烁 inline script 改成 useEffect, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "useEffect 在 hydrate 之后跑, 期间浏览器已经 paint 一次亮色 html, 用户会看到白闪. 防闪烁脚本必须是同步 inline script, 抢在 paint 之前. 这条 PR 直接破坏暗色模式体验承诺, 必须保留 inline script.",
    },
    explanation: {
      short: "审查点: 防闪烁必须早于 paint, useEffect 太晚.",
      detail: "好的 review 指出 (1) paint / hydrate 时序 (2) useEffect 的执行时机 (3) 真实可观察的 bug (4) 给出明确保留原因.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
];

// 引用 LAYOUT_CODE 常量保持链接, 防止 unused 警告.
void FOC_SCRIPT;
