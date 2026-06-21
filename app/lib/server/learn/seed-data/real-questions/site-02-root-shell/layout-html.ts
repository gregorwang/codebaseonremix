/**
 * Real questions for site-02-root-shell / layout-html.
 *
 * Anchor: remix/app/root.tsx L77-115 (Layout 组件).
 * 学习目标 (from courseCatalog L()): theme class 挂 html, 防闪烁内联脚本读取
 * theme cookie.
 *
 * 与 root-loader 的关系: loader 准备 theme 数据, Layout 负责把 theme
 * 实际挂到 <html> 上, 并在 SSR 阶段插入防闪烁 inline script.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2). 全部锚到 root.tsx L77-115.
 *
 * Phase 0.3 recipe 库用一处: remixRouteCssInRoot (remix §18.3-5) — layout-html
 * 的 <head> 正是 route CSS links 的宿主, 改坏题直接相关.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { remixRouteCssInRoot } from "../recipes";

const PRIMARY = "app/root.tsx";
const TOUCHED = ["app/root.tsx"];
const STYLE_TOUCHED = ["app/root.tsx", "app/styles/theme.css", "app/tailwind.css"];

const LAYOUT_CODE = `export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  const theme = data?.theme || "light";
  const location = useLocation();
  const isMusic = location.pathname.startsWith("/music");

  return (
    <html lang="zh-CN" className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* 防止主题闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: \`
              (function() {
                const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || 'light';
                document.documentElement.classList.add(theme);
              })();
            \`,
          }}
        />
      </head>
      <body className={isMusic ? undefined : "bg-primary-50 text-primary-950"}>
        {children}
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: \`window.ENV = \${JSON.stringify({ GOOGLE_CLIENT_ID: data?.googleClientId || "", APP_URL: data?.appUrl || "" })};\`,
          }}
        />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}`;

export const layoutHtmlQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 Layout 组件的签名",
    prompt: "root.tsx 里的 Layout 组件接受什么 props?",
    options: [
      { id: "A", text: "{ children: React.ReactNode }" },
      { id: "B", text: "{ loader: LoaderFunction }" },
      { id: "C", text: "{ session, theme }" },
      { id: "D", text: "无 props" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Layout 只接 children, 不是 loader / action.",
      detail: "Layout 是 React Router 7 用来定义文档外壳的特殊 export, 内部通过 useLoaderData<typeof loader>() 拿数据, 不需要外部传参.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 <html> 标签的 lang 属性",
    prompt: "<html lang='zh-CN'> 起到什么作用?",
    options: [
      { id: "A", text: "屏幕阅读器与浏览器翻译使用, 站点是中文所以写 zh-CN" },
      { id: "B", text: "决定 React 版本" },
      { id: "C", text: "控制 cookie 范围" },
      { id: "D", text: "只影响 SEO 不影响 a11y" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "lang 决定 a11y 与浏览器行为.",
      detail: "lang 供屏幕阅读器发音切换, 浏览器翻译 / 拼写检查也会读这个字段, 写错会让 a11y 设备发音错乱.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q3 theme className 来源",
    prompt: "<html className={theme}> 里的 theme 取自哪里?",
    options: [
      { id: "A", text: "useLoaderData<typeof loader>() 返回的 data.theme, fallback 'light'" },
      { id: "B", text: "localStorage.getItem('theme')" },
      { id: "C", text: "硬编码字符串" },
      { id: "D", text: "URL query 参数" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "theme 来自 root loader 返回的 data, 缺失时 fallback 'light'.",
      detail: "data?.theme || 'light' 是经典 nullish 兜底, 防止 loader 异常时 html 缺 className.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: ["app/root.tsx", "app/utils/theme.server.ts"],
  }),
  q({
    type: "position_judgement",
    title: "Q4 防闪烁脚本位置",
    prompt: "防主题闪烁的内联 script 放在 <head> 里有什么意义?",
    options: [
      { id: "A", text: "在 React hydrate 之前, 浏览器先读 cookie 给 html 加 class, 避免亮→暗闪一下" },
      { id: "B", text: "没有意义, 放哪都行" },
      { id: "C", text: "放 <body> 底部效果一样" },
      { id: "D", text: "只影响 SEO" },
    ],
    correctAnswer: { positionId: "A" },
    explanation: {
      short: "必须在 <head> 且在 React hydrate 之前执行, 否则用户看到一次亮色闪屏.",
      detail: "防闪烁脚本是同步 inline script, 浏览器解析 head 时立刻执行, 把 html className 设对, React 接管时 className 已是正确的, 不会闪.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "fill_blank",
    title: "Q5 useLoaderData 类型参数",
    prompt: "const data = useLoaderData<_____>(); 里, 类型参数应当是同文件的 _____ 函数.",
    options: [],
    correctAnswer: { values: { fn: "loader" } },
    blanks: [{ id: "fn", placeholder: "函数名", acceptedAnswers: ["loader", "Loader"] }],
    explanation: {
      short: "typeof loader 拿到 loader 的返回类型, 保证 data 形状与 loader 一致.",
      detail: "如果类型参数传错 (比如 typeof action), data.session 访问会变 any, 编译期丢失 session 形状保护.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q6 window.ENV 包含字段",
    prompt: "Layout 注入的 window.ENV 包含哪些字段? (多选)",
    options: [
      { id: "google", text: "GOOGLE_CLIENT_ID" },
      { id: "appUrl", text: "APP_URL" },
      { id: "session", text: "session 完整对象" },
      { id: "loader", text: "loader 函数引用" },
    ],
    correctAnswer: { choiceIds: ["google", "appUrl"] },
    explanation: {
      short: "只暴露公开 Google Client ID 与 APP_URL, session 是 user-specific 不能进 window 全局.",
      detail: "window.ENV 是 public-only 配置, 任何用户都能看到. session 走 useLoaderData, 不能塞进 window.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "mixed-risk",
    touchedFiles: TOUCHED,
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: theme fallback",
    prompt: "data?.theme || 'light' 出现在 Layout 哪一行?",
    code: `1 export function Layout({ children }: { children: React.ReactNode }) {
2   const data = useLoaderData<typeof loader>();
3   const theme = data?.theme || "light";
4   const location = useLocation();
5   const isMusic = location.pathname.startsWith("/music");
6   return (
7     <html lang="zh-CN" className={theme}>`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "export function Layout({ children }: { children: React.ReactNode }) {" },
      { id: "L2", lineNumber: 2, text: "const data = useLoaderData<typeof loader>();" },
      { id: "L3", lineNumber: 3, text: "const theme = data?.theme || 'light';" },
      { id: "L4", lineNumber: 4, text: "const location = useLocation();" },
      { id: "L5", lineNumber: 5, text: "const isMusic = location.pathname.startsWith('/music');" },
    ],
    correctAnswer: { lineId: "L3" },
    explanation: {
      short: "第 3 行做 nullish 兜底, theme 缺失时退到 'light'.",
      detail: "data 可能因为 loader 抛错 / remount 时序而暂时 undefined, 兜底防止 html className 变成 undefined.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q8 useLocation 来自哪",
    prompt: "Layout 里 useLocation() 是哪个包导出的?",
    options: [
      { id: "A", text: "react-router (RR 提供)" },
      { id: "B", text: "next/router" },
      { id: "C", text: "我自己写的 hook" },
      { id: "D", text: "react" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "useLocation 是 React Router 提供的客户端 hook.",
      detail: "Layout 在 SSR 与 CSR 都执行, useLocation 在 server 时返回当前请求的 location 对象, 客户端 hydrate 后保持一致.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q9 isMusic 判断逻辑",
    prompt: "const isMusic = location.pathname.startsWith('/music'); 的语义是?",
    options: [
      { id: "A", text: "当前路径以 /music 开头, 包括 /music, /music/foo, /music/song/123" },
      { id: "B", text: "当前路径等于 /music 字符串" },
      { id: "C", text: "当前路径包含 music 子串" },
      { id: "D", text: "query 里包含 music" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "startsWith 是前缀匹配, 子路径都算.",
      detail: "/music/song/123 会让 isMusic 为 true, 整棵树 body 走 music 视觉. 用 === 反而漏掉子路由.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q10 <Meta /> <Links /> <Scripts /> 来源",
    prompt: "Layout 里的 <Meta /> <Links /> <Scripts /> <ScrollRestoration /> 是? (多选)",
    options: [
      { id: "A", text: "React Router 7 提供的内置组件, 负责注入 meta / 资源链接 / 客户端 bundle / 滚动恢复" },
      { id: "B", text: "我自己写的组件" },
      { id: "C", text: "react-dom 自带" },
      { id: "D", text: "删除其中任何一个都会破坏 SSR / hydrate 流程" },
    ],
    correctAnswer: { choiceIds: ["A", "D"] },
    explanation: {
      short: "这四个都是 RR 7 内置组件, 缺一不可.",
      detail: "Meta 注入 loader 返回的 meta; Links 注入 loader 返回的 CSS; Scripts 注入客户端 bundle; ScrollRestoration 处理路由切换滚动位置.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q11 LiveReload 何时存在",
    prompt: "<LiveReload /> 在生产构建里?",
    options: [
      { id: "A", text: "dev 环境存在, 生产构建时被 tree-shake 掉" },
      { id: "B", text: "永远存在" },
      { id: "C", text: "只在 SSR 时存在" },
      { id: "D", text: "只在用户登录时存在" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "LiveReload 是 dev-only 组件, 生产打包时被消除.",
      detail: "vite 在 build 时把 <LiveReload /> 替换成 null, 不会进入生产 chunk. 保留是 RR 模板默认行为, 不需要手动处理.",
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
    title: "Q12 theme cookie 缺失时的渲染",
    prompt: "用户首次访问, 没有 theme cookie, <html> 的 className 是什么?",
    options: [
      { id: "loader", text: "loader 阶段 getTheme 拿到 null" },
      { id: "fallback", text: "data?.theme 是 nullish, Layout 兜底为 'light'" },
      { id: "render", text: "<html className='light'>" },
      { id: "flicker", text: "SSR 是 'light', 防闪烁脚本读到 cookie 缺失也设 'light', 不闪" },
    ],
    correctAnswer: { pathIds: ["loader", "fallback", "render", "flicker"] },
    explanation: {
      short: "cookie 缺失 → loader null → 兜底 'light' → 渲染 <html className='light'>, 闪烁脚本不冲突.",
      detail: "getTheme 找不到 cookie 返回 null, loader theme 为 null, Layout 兜底, 防闪烁脚本也兜底到 'light', 整链路一致, 不闪.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: ["app/root.tsx", "app/utils/theme.server.ts"],
  }),
  q({
    type: "branch_trace",
    title: "Q13 isMusic 切换时",
    prompt: "用户从 / 切到 /music/abc 时, body className 经历什么?",
    options: [
      { id: "from", text: "起点: pathname='/isMusic', body className='bg-primary-50 text-primary-950'" },
      { id: "to", text: "终点: pathname='/music/abc' 命中 startsWith, body className=undefined" },
      { id: "no-flicker", text: "React 协调只更新 className 字符串, 不重渲染整棵树" },
    ],
    correctAnswer: { pathIds: ["from", "to", "no-flicker"] },
    explanation: {
      short: "React 只更新 className 属性, 不重渲染 children.",
      detail: "isMusic 变化只引发 Layout 重新执行 + className 字符串替换, children 子树引用稳定, 不会重新挂载. 用户感知是平滑过渡.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 SSR 期间 document 是否存在",
    prompt: "Layout 在 SSR (renderToReadableStream) 期间执行, 防闪烁 inline script 里的 document 会?",
    options: [
      { id: "A", text: "SSR 阶段 document 不存在, inline script 不执行, 只是把字符串塞进 HTML, 浏览器解析时才跑" },
      { id: "B", text: "SSR 阶段 document 存在, 会立即执行" },
      { id: "C", text: "SSR 抛错" },
      { id: "D", text: "浏览器忽略 inline script" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "dangerouslySetInnerHTML 只产字符串, 不在 server 跑.",
      detail: "server 端 React 把 script 标签 + 内联字符串塞进 HTML 响应, 浏览器解析到这段 <script> 时才执行, 此时 document 已存在, 不会抛错.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "mixed-risk",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q15 Layout 重渲染频率",
    prompt: "正常路由切换 (不涉及 loader 变化) 时, Layout 会重新执行吗?",
    options: [
      { id: "A", text: "会, RR 7 的 Layout 是 React 组件, 任何 navigation 都重新跑 render" },
      { id: "B", text: "不会, Layout 只在 loader 变化时跑" },
      { id: "C", text: "永远不会" },
      { id: "D", text: "只在 dev 环境会" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Layout 是 React 组件, 每次 navigation 都会重 render.",
      detail: "Layout 重 render 代价小 (没有昂贵副作用), 但 useLoaderData 会拿到新 data, useLocation 拿到新 location. children 引用稳定, 子树 reconciler 不重 mount.",
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
    title: "Q16 AI 删防闪烁脚本",
    prompt: "AI 改坏: AI 觉得防闪烁脚本 '不重要', 直接删除整段 inline script. 后果是?",
    options: [
      { id: "A", text: "用户首屏看到亮色主题闪一下, 切到暗色才有反应, 体验差" },
      { id: "B", text: "React 编译失败" },
      { id: "C", text: "session 会被清" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "删除防闪烁脚本 = 主题切换时一定闪屏.",
      detail: "防闪烁脚本让 html className 在 hydrate 之前就正确, 没有它, React hydrate 之前 html 是无 class 的亮色, hydrate 之后才切到 'dark', 用户看到一次白闪.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "深色模式用户每次刷新页面都看到一次白闪, 体验退步, 部分敏感用户会感到不适.",
    aiReviewRisk: "把 '无障碍 / 体验优化' 当成 '装饰代码' 删掉, 实际破坏了 SSR / CSR 边界.",
    wrongAnswerFeedback: {
      B: "React 不会失败, inline script 删除是合法 JSX 变更.",
      C: "session 与 script 无关.",
      D: "loader 与防闪烁脚本无关.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把脚本挪到 body 底部",
    prompt: "AI 改坏: AI 把防闪烁 inline script 挪到 </body> 之前. 后果是?",
    options: [
      { id: "A", text: "浏览器先 paint 一次亮色 html, 再执行脚本设 className, 用户看到白闪" },
      { id: "B", text: "React 不会 hydrate" },
      { id: "C", text: "D1 写不进去" },
      { id: "D", text: "无影响, 顺序无所谓" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "脚本必须早于首次 paint 执行, body 底部会闪.",
      detail: "浏览器解析到 <head> 末尾时开始 paint, 此时 html 没有 theme class, 用户看到亮色. body 底部 script 跑完之后 React hydrate, 已经晚了.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "暗色模式用户每次刷新看到一次白闪, 严重破坏暗色体验承诺.",
    aiReviewRisk: "把 inline script 当成 '任何位置都可以', 忽略了 paint 时序.",
    wrongAnswerFeedback: {
      B: "hydrate 与 script 位置无关.",
      C: "D1 与 script 位置无关.",
      D: "顺序在视觉上有显著影响, 不是'无所谓'.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 硬编码 theme",
    prompt: "AI 改坏: AI 把 <html className={theme}> 改成 <html className='dark'>, 理由是 '项目主要用暗色'. 后果是?",
    options: [
      { id: "A", text: "用户切到亮色无效, 主题 cookie / loader 完全失效, 体验倒退" },
      { id: "B", text: "CSS 编译失败" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "loader 不会跑" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "硬编码破坏主题切换契约.",
      detail: "theme 来源是 loader, 硬编码后 cookie / toggle / 系统偏好全部失效, 整个主题系统退化为单主题.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "用户切到 light 后没反应, 投诉 '按钮坏了'; 实际是主题系统被硬编码.",
    aiReviewRisk: "为'简化'破坏动态数据流, 失去主题契约.",
    wrongAnswerFeedback: {
      B: "CSS 不会编译失败.",
      C: "TS 不会报错, 字符串是合法类型.",
      D: "loader 仍会跑, 跑出来的 data.theme 被丢弃.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 AI 把 window.ENV 注入独立化",
    prompt: "AI 改坏: AI 把 window.ENV 注入拆到独立 useEffect 里:\n  useEffect(() => { window.ENV = {...}; }, [data]);\n后果是?",
    options: [
      { id: "A", text: "env 注入延后到 hydrate 后, 期间 GoogleOneTap 初始化可能拿到 undefined GOOGLE_CLIENT_ID" },
      { id: "B", text: "useEffect 不会执行" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "useEffect 在 hydrate 后才跑, 期间读 window.ENV 拿到 undefined.",
      detail: "GoogleOneTap.client 是 Suspense + ClientOnly 包裹, hydrate 之后才挂载. useEffect 也是 hydrate 之后跑. 顺序变成: hydrate → useEffect 设 ENV → GoogleOneTap 读 ENV. 如果中间有别的代码先读 ENV, 拿到 undefined.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
    realWorldImpact: "GoogleOneTap 偶尔拿不到 CLIENT_ID, 用户看不到登录入口, 排查时序问题耗时.",
    aiReviewRisk: "为'分离关注点'把同步 inline script 改成异步 useEffect, 引入时序竞态.",
    wrongAnswerFeedback: {
      B: "useEffect 会执行, 但执行时机错了.",
      C: "TS 不会报错.",
      D: "有影响, 时序变了.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q20 引用 §18.3-5 route CSS 全塞 root",
    prompt: remixRouteCssInRoot({
      lessonSlug: "layout-html",
      courseSlug: "site-02-root-shell",
      orderIndex: 19,
    }).prompt,
    options: remixRouteCssInRoot({
      lessonSlug: "layout-html",
      courseSlug: "site-02-root-shell",
      orderIndex: 19,
    }).options,
    correctAnswer: remixRouteCssInRoot({
      lessonSlug: "layout-html",
      courseSlug: "site-02-root-shell",
      orderIndex: 19,
    }).correctAnswer as { choiceId: string },
    explanation: {
      ...remixRouteCssInRoot({
        lessonSlug: "layout-html",
        courseSlug: "site-02-root-shell",
        orderIndex: 19,
      }).explanation,
      short: "route CSS 应通过 route links 按需加载,全塞 root 等于全部打包.",
      detail: "RR 7 的 links export 允许每个 route 声明自己的 CSS, vite 会按路由拆分. 全塞 root 等于强制首屏加载所有 CSS, 跨页面样式互相覆盖, CSS 变量 / @layer 顺序也容易错乱. Layout <head> 是按路由资源加载的承载点, 错放 root 会破坏分包.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/root.tsx", "app/styles/index-route.css", "app/styles/game.css", "app/styles/music.css"],
    realWorldImpact: "首屏下载 800KB CSS, 移动端 LCP 退到 4s+; 切到 game 路由时, gallery 的 .grid 类污染 game 布局.",
    aiReviewRisk: "为'省事'破坏 RR 的按路由资源分包, 跨页面样式互相影响.",
    wrongAnswerFeedback: {
      B: "CSS 仍能编译, 这正是问题 — 它编译成功了但全部塞给首屏.",
      C: "loader 与 CSS 引入方式无关.",
      D: "主题切换不直接受影响, 但 CSS 变量被覆盖会导致主题错乱.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释防主题闪烁",
    prompt: "用自己的话解释 Layout 的防闪烁 inline script 是怎么工作的, 为什么必须放在 <head> 且在 React hydrate 之前.",
    options: [],
    correctAnswer: {
      text: "防闪烁脚本读 document.cookie 里的 theme, 同步把 className 加到 <html> 上, 浏览器解析 <head> 时立即执行, 在首次 paint 前就把 html className 设对, 避免 hydrate 之后才切主题造成的闪屏. 必须放 <head> 是因为 paint 在 <head> 解析完成后就开始, 必须抢在 paint 之前; 必须在 hydrate 之前是因为 React 接管后会用自己的 data.theme 覆盖 html className, 闪烁脚本是给 hydrate 之前的'占位 class'.",
    },
    explanation: {
      short: "抢在首次 paint 与 hydrate 之间设 className.",
      detail: "SSR 输出 <html> 时 className 已经是 loader 拿到的 theme, 但如果 cookie 与 loader 不一致, 防闪烁脚本会在浏览器解析阶段修正, 配合 SSR 形成双重保险.",
    },
    abilityTags: ["frontend.state.global"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "假设你看到 PR 把防闪烁 inline script 改成了 useEffect + document.documentElement.classList.add(theme), 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "防闪烁脚本必须在 SSR 阶段就生效, useEffect 在 hydrate 之后才跑, 已经晚于首次 paint — 用户会看到一次白闪. 这段必须用 dangerouslySetInnerHTML 放在 <head> 里同步执行.",
    },
    explanation: {
      short: "审查点: 时序与首次 paint.",
      detail: "好的 review 应该指出 (1) 时序问题 (hydrate vs paint) (2) 正确位置 (head inline) (3) 严重性 (闪屏是用户可见回归).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
];

// 保留 LAYOUT_CODE 以便未来 line_pick / code_fix 题使用, 防止 unused 警告.
void LAYOUT_CODE;
