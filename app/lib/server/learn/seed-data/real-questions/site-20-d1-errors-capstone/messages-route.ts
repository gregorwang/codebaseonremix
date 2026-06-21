/**
 * Real questions for site-20-d1-errors-capstone / messages-route.
 *
 * Anchor: remix/app/routes/messages.tsx (loader + action + headers)
 *         remix/app/lib/messages.server.ts (data service)
 *         remix/app/components/messages/BubbleMessageBoard.client.tsx (client boundary)
 *
 * 学习目标: 理解消息板路由的 loader / action 数据流、缓存策略、服务端/客户端边界、以及 AI 改坏风险。
 *
 * 题目数: 22.
 *
 * 引用 recipe: remixPublicCacheOnMessages (§18.3-1) + remixFetcherToFetch (§18.3-3)
 *              + remixDropForwardLoaderCacheControl (§18.3-4) + reactSubmitDomDisabledOnly (§19.2-3)
 *              + cssBubbleTwoColMobile (§20.3-4).
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import {
  remixPublicCacheOnMessages,
  remixFetcherToFetch,
  remixDropForwardLoaderCacheControl,
  reactSubmitDomDisabledOnly,
  cssBubbleTwoColMobile,
} from "../recipes";

const PRIMARY = "app/routes/messages.tsx";
const SERVICE = "app/lib/messages.server.ts";
const CLIENT = "app/components/messages/BubbleMessageBoard.client.tsx";
const TOUCHED = [PRIMARY, SERVICE, CLIENT];

export const messagesRouteQuestions: RealQ[] = [
  // ─── 基础识别 (Q1–Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 messages loader 签名",
    prompt: "messages.tsx 中 loader 的函数签名是?",
    options: [
      { id: "A", text: "export const loader = async ({ request }: LoaderFunctionArgs) => { ... }" },
      { id: "B", text: "export const loader = async ({ params }: LoaderFunctionArgs) => { ... }" },
      { id: "C", text: "export const action = async ({ request }: ActionFunctionArgs) => { ... }" },
      { id: "D", text: "function loader() { ... }" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "loader 接收 { request }，从中读取 session 与 URL searchParams。",
      detail: "L16: `export const loader = async ({ request }: LoaderFunctionArgs) => { ... }`。params 在此路由无用（无动态段），request 用于 getSessionCached 与 cursor 读取。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 messages.server.ts 导出清单",
    prompt: "app/lib/messages.server.ts 导出了哪些核心符号?",
    options: [
      { id: "A", text: "MESSAGE_DAILY_LIMIT / MESSAGE_CONTENT_MAX_LENGTH / MESSAGE_BOARD_LIMIT / getApprovedMessages / getPendingMessagesForUser / getMessageLimitStatus / createPendingMessage" },
      { id: "B", text: "仅 createPendingMessage" },
      { id: "C", text: "React 组件 MessageBoard" },
      { id: "D", text: "Remix loader" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "7 个导出：3 个常量 + 4 个 async 函数。",
      detail: "L6-12: messages.tsx 从 messages.server.ts import 了 createPendingMessage / getApprovedMessages / getMessageLimitStatus / getPendingMessagesForUser / MESSAGE_BOARD_LIMIT。模块还导出 MESSAGE_DAILY_LIMIT 与 MESSAGE_CONTENT_MAX_LENGTH（action 中用于校验）。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: SERVICE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q3 loader 如何调用列表服务",
    prompt: "loader 中 approvedMessages 是如何获取的?",
    options: [
      { id: "A", text: "await getApprovedMessages(url.searchParams.get('cursor'), MESSAGE_BOARD_LIMIT)" },
      { id: "B", text: "await getApprovedMessages(env.DB)" },
      { id: "C", text: "直接写 SQL 查询 D1" },
      { id: "D", text: "从 KV 读取" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "从 URL searchParams 取 cursor，以 MESSAGE_BOARD_LIMIT 为页大小。",
      detail: "L19: `const approvedMessages = await getApprovedMessages(url.searchParams.get('cursor'), MESSAGE_BOARD_LIMIT);`。loader 自己不碰 D1，全部委托给 messages.server.ts。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q4 loader 响应 Cache-Control",
    prompt: "messages loader 返回的 Cache-Control 策略是?",
    options: [
      { id: "A", text: "session?.user ? 'private, no-store' : 'public, max-age=60, stale-while-revalidate=120'" },
      { id: "B", text: "始终 'public, max-age=60'" },
      { id: "C", text: "始终 'private, no-store'" },
      { id: "D", text: "不设置 Cache-Control" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "登录用户 private，匿名用户 public。",
      detail: "L38-41: 三元判断。登录用户的 pending / limitStatus 是 user-specific，必须 private；匿名用户只看已审核公开列表，可以 public 缓存 60s。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q5 headers 导出作用",
    prompt: "messages.tsx 底部的 `export const headers: HeadersFunction = forwardLoaderCacheControl;` 做了什么?",
    options: [
      { id: "A", text: "把 loader 里设置的 Cache-Control 透传给最终 HTTP 响应" },
      { id: "B", text: "重新覆盖为 public cache" },
      { id: "C", text: "仅用于 SSR，不进入浏览器" },
      { id: "D", text: "设置 CORS header" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "forwardLoaderCacheControl 将 loader header 合并到 document response。",
      detail: "L45: `export const headers: HeadersFunction = forwardLoaderCacheControl;`。Remix 的 headers 函数负责把 loader 返回的 headers 透传给最终 HTTP response；删掉它则 loader 设的 Cache-Control 不会到达浏览器/CDN。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/cache-headers.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q6 useLoaderData 类型推断",
    prompt: "messages 路由组件中，如何正确获取 loader 数据并传给 BubbleMessageBoard?",
    options: [
      { id: "A", text: "const data = useLoaderData<typeof loader>(); 然后把 data.messages / data.userPendingMessages 等作为 props 传入 BubbleMessageBoard" },
      { id: "B", text: "useFetcher<typeof loader>()" },
      { id: "C", text: "直接 JSON.parse(document.body.innerText)" },
      { id: "D", text: "用 useState 存储" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "useLoaderData<typeof loader>() 是 Remix 标准类型安全做法。",
      detail: "虽然 messages.tsx 只展示了 loader / action / headers，但项目惯例（如其他路由）使用 `useLoaderData<typeof loader>()` 获取数据，再解构为 props 传给客户端组件 BubbleMessageBoard。这样 loader 返回类型的改动会自动传导到组件。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, CLIENT],
  }),

  // ─── 代码阅读 (Q7–Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: loader 数据组装",
    prompt: "下面哪一行是 'loader 把全部数据打包成 JSON 返回' 的关键组装行?",
    code: `16 export const loader = async ({ request }: LoaderFunctionArgs) => {
17   const session = await getSessionCached(request);
18   const url = new URL(request.url);
19   const approvedMessages = await getApprovedMessages(url.searchParams.get("cursor"), MESSAGE_BOARD_LIMIT);
20   const userPendingMessages = session?.user
21     ? await getPendingMessagesForUser(session.user.id)
22     : [];
23   const limitStatus = session?.user
24     ? await getMessageLimitStatus(session.user.id)
25     : null;
26   const hasMore = approvedMessages.length === MESSAGE_BOARD_LIMIT;
27   const nextCursor = hasMore ? approvedMessages[approvedMessages.length - 1].id : null;
28
29   return json({
30     messages: approvedMessages,
31     userPendingMessages,
32     limitStatus,
33     defaultAvatar: "https://oss.xn--cckl9nsb.com/taobao.jfif",
34     nextCursor,
35     hasMore,
36   }, {
37     headers: {
38       "Cache-Control": session?.user
39         ? "private, no-store"
40         : "public, max-age=60, stale-while-revalidate=120",
41     },
42   });
43 };`,
    options: [],
    linePickLines: [
      { id: "L19", lineNumber: 19, text: 'const approvedMessages = await getApprovedMessages(url.searchParams.get("cursor"), MESSAGE_BOARD_LIMIT);' },
      { id: "L29", lineNumber: 29, text: "return json({" },
      { id: "L38", lineNumber: 38, text: '"Cache-Control": session?.user' },
    ],
    correctAnswer: { lineId: "L29" },
    explanation: {
      short: "L29: return json(...) 把 messages / userPendingMessages / limitStatus / cursor / hasMore 一次组装返回。",
      detail: "L19 是数据获取，L38 是 header 决策。L29 是关键组装行：把前端需要的全部字段（包括公开列表、用户 pending、分页指针）打包成 JSON，并附带 Cache-Control header。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q8 分页限制参数",
    prompt: "loader 调用 `getApprovedMessages(cursor, limit)` 时，limit 的默认值等于 `messages.server.ts` 中定义的常量 ___。",
    options: [],
    correctAnswer: { values: { v: "MESSAGE_BOARD_LIMIT" } },
    blanks: [{ id: "v", placeholder: "常量名或数值", acceptedAnswers: ["MESSAGE_BOARD_LIMIT", "20"] }],
    explanation: {
      short: "MESSAGE_BOARD_LIMIT（值为 20）。",
      detail: "L11: messages.tsx import 了 MESSAGE_BOARD_LIMIT。messages.server.ts L8 定义 `export const MESSAGE_BOARD_LIMIT = 20;`。getApprovedMessages 的签名是 `getApprovedMessages(cursor, limit = MESSAGE_BOARD_LIMIT)`。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: SERVICE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "multi_choice",
    title: "Q9 loader 实际返回给前端的字段",
    prompt: "messages loader 的 return json(...) 中，哪些字段会真正到达浏览器？（多选；注意 messages.server.ts 的 MessageRow 含 user_id，但 loader 不会返回它）",
    options: [
      { id: "A", text: "messages（已审核留言列表）" },
      { id: "B", text: "userPendingMessages（当前用户待审核留言）" },
      { id: "C", text: "limitStatus（今日留言额度状态）" },
      { id: "D", text: "userId / email（用户原始身份标识）" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "A/B/C 正确；D 不会被返回。",
      detail: "L29-35: 返回字段为 messages / userPendingMessages / limitStatus / defaultAvatar / nextCursor / hasMore。虽然 messages.server.ts 内部 MessageRow 有 user_id，但 loader 只把 approvedMessages（本身含 username / content / status）传出，绝不暴露 userId / email。这是隐私边界。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "line_pick",
    title: "Q10 关键行: action 返回结果",
    prompt: "下面哪一行是 action 处理成功后把结果返回给前端的关键行?",
    code: `47 export const action = async ({ request }: ActionFunctionArgs) => {
48   const session = await getSessionCached(request);
49
50   if (!session?.user) {
51     return json({ error: "请先登录" }, { status: 401 });
52   }
53
54   try {
55     const result = await createPendingMessage(request, session.user, await request.formData());
56     return json(result.payload, { status: result.status });
57   } catch (error) {
58     console.error("[Message] Error creating message:", error);
59     return json({ error: "提交失败，请稍后重试" }, { status: 500 });
60   }
61 };`,
    options: [],
    linePickLines: [
      { id: "L55", lineNumber: 55, text: "const result = await createPendingMessage(request, session.user, await request.formData());" },
      { id: "L56", lineNumber: 56, text: "return json(result.payload, { status: result.status });" },
      { id: "L59", lineNumber: 59, text: 'return json({ error: "提交失败，请稍后重试" }, { status: 500 });' },
    ],
    correctAnswer: { lineId: "L56" },
    explanation: {
      short: "L56: action 成功时把 createPendingMessage 的 payload 与 status 包装成 JSON 返回。",
      detail: "L55 是业务调用，L59 是异常兜底。L56 是关键返回行：把服务端处理结果（含 success 文案或新 message 对象）以正确 HTTP status 回传，前端 fetcher.data 才能拿到 actionData。",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q11 action 异常兜底",
    prompt: "action 中 createPendingMessage throw 异常时，最终行为是?",
    options: [
      { id: "A", text: "catch → console.error → return json({ error: '提交失败，请稍后重试' }, { status: 500 })" },
      { id: "B", text: "直接抛给 ErrorBoundary，前端白屏" },
      { id: "C", text: "返回 200，假装成功" },
      { id: "D", text: "忽略错误，无响应" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "catch 中打印日志并返回 500 + 友好错误文案。",
      detail: "L57-60: try/catch 包裹 createPendingMessage。任何未预料异常都被捕获，console.error 留痕，前端拿到 `{ error: '提交失败，请稍后重试' }` 与 500 status。这样用户知道失败，ops 有日志可查。",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),

  // ─── 状态推理 (Q12–Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 匿名用户访问路径",
    prompt: "匿名用户访问 /messages，loader 的完整执行路径是?",
    options: [
      { id: "auth", text: "getSessionCached → 无用户" },
      { id: "approved", text: "getApprovedMessages(cursor, MESSAGE_BOARD_LIMIT)" },
      { id: "pending", text: "userPendingMessages = []（匿名无 pending）" },
      { id: "limit", text: "limitStatus = null" },
      { id: "cursor", text: "hasMore / nextCursor 计算" },
      { id: "return", text: "return json({ ... }, public cache)" },
    ],
    correctAnswer: { pathIds: ["auth", "approved", "pending", "limit", "cursor", "return"] },
    explanation: {
      short: "6 步：鉴权为空 → 公开列表 → 空 pending → 空 limit → 分页指针 → public 返回。",
      detail: "匿名用户不调用 getPendingMessagesForUser / getMessageLimitStatus，因为 session?.user 为 falsy，直接回退到空数组 / null。返回的 Cache-Control 是 public，可被 CDN 缓存。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "branch_trace",
    title: "Q13 登录用户访问路径",
    prompt: "登录用户访问 /messages，loader 的完整执行路径是?",
    options: [
      { id: "auth", text: "getSessionCached → 有用户" },
      { id: "approved", text: "getApprovedMessages(cursor, MESSAGE_BOARD_LIMIT)" },
      { id: "pending", text: "getPendingMessagesForUser(session.user.id)" },
      { id: "limit", text: "getMessageLimitStatus(session.user.id)" },
      { id: "cursor", text: "hasMore / nextCursor 计算" },
      { id: "return", text: "return json({ ... }, private, no-store)" },
    ],
    correctAnswer: { pathIds: ["auth", "approved", "pending", "limit", "cursor", "return"] },
    explanation: {
      short: "6 步：鉴权通过 → 公开列表 → 个人 pending → 额度状态 → 分页指针 → private 返回。",
      detail: "登录用户多走两个服务调用：getPendingMessagesForUser（拉自己的待审核留言）和 getMessageLimitStatus（今日剩余条数）。这些字段都是 user-specific，因此 Cache-Control 必须是 private, no-store，防止 CDN 共享。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q14 private vs public 的区分原因",
    prompt: "为什么登录用户用 private, no-store，匿名用户用 public, max-age=60?",
    options: [
      { id: "A", text: "登录用户的 pending / limitStatus 是 user-specific，不能被 CDN 共享缓存；匿名用户只看已审核公开内容，可以安全缓存" },
      { id: "B", text: "private 比 public 更安全，所以全部应该用 private" },
      { id: "C", text: "public 缓存更快，所以全部应该用 public" },
      { id: "D", text: "没有区别，取决于开发者偏好" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "user-specific 数据绝不可 public cache；公开列表可以。",
      detail: "L38-41: 这是数据敏感度与缓存策略的映射。public cache 按 URL 缓存，如果登录用户数据被 public 缓存，用户 B 访问相同 URL 会看到用户 A 的 pending 消息，造成隐私泄露。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 loader 抛异常时的兜底",
    prompt: "如果 messages loader 内部抛异常（如 D1 连接失败），最终用户会看到什么?",
    options: [
      { id: "A", text: "root.tsx 的 ErrorBoundary 捕获并渲染中文错误页，不会白屏" },
      { id: "B", text: "浏览器白屏" },
      { id: "C", text: "Remix 自动重试 loader" },
      { id: "D", text: "返回空 JSON {}" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ErrorBoundary 是最后一道防线，捕获未处理异常并渲染降级 UI。",
      detail: "项目 root.tsx 配置了 ErrorBoundary（中文文案）。任何 loader / action 未捕获的 throw 都会冒泡到最近的 ErrorBoundary，用户看到友好错误页，而不是白屏或裸露的 stack trace。",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/root.tsx"],
  }),

  // ─── AI 改坏 (Q16–Q20) ──────────────────────────────────────────────────
  {
    ...remixPublicCacheOnMessages({
      lessonSlug: "messages-route",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 0,
      primaryFile: PRIMARY,
    }),
    touchedFiles: [PRIMARY, "app/lib/cache-headers.server.ts"],
  },
  {
    ...remixFetcherToFetch({
      lessonSlug: "messages-route",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 0,
      primaryFile: CLIENT,
    }),
    touchedFiles: [CLIENT, PRIMARY],
  },
  {
    ...remixDropForwardLoaderCacheControl({
      lessonSlug: "messages-route",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 0,
    }),
    touchedFiles: ["app/entry.server.tsx", "app/lib/cache-headers.server.ts", PRIMARY],
  },
  {
    ...reactSubmitDomDisabledOnly({
      lessonSlug: "messages-route",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 0,
      primaryFile: CLIENT,
    }),
    touchedFiles: [CLIENT],
  },
  {
    ...cssBubbleTwoColMobile({
      lessonSlug: "messages-route",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 0,
      primaryFile: CLIENT,
    }),
    touchedFiles: [CLIENT, "app/styles/messages.css"],
  },

  // ─── 自由作答 (Q21–Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 服务端/客户端职责分离与三条不变量",
    prompt: "解释 messages.tsx 如何把服务端 (loader + action) 和客户端 (BubbleMessageBoard) 的职责分开，并说明这三条不变量如何共同保证消息板的安全与 UX 鲁棒：(1) 登录用户必须走 private cache；(2) loader 绝不返回 userId / email 等原始敏感字段，只返回公开可见的 username / content / status；(3) 提交状态必须从 fetcher.state 读取，不能用本地 useState 单独维护。",
    options: [],
    correctAnswer: {
      text: "messages.tsx 的 loader/action 负责数据获取、权限校验、缓存策略和敏感字段过滤：loader 根据 session 区分公开/私有数据并设置对应 Cache-Control；action 校验登录、调用 createPendingMessage 处理写操作，并统一返回 JSON。BubbleMessageBoard 只负责渲染与交互：接收 props 显示留言流，用 useFetcher 提交表单，用 fetcher.state 驱动 pending UI。三条不变量：(1) private cache 保证用户 B 不会从 CDN 读到用户 A 的 pending / limitStatus；(2) 不返回 userId/email 保证即使响应被截获也无法反向定位真实用户身份；(3) fetcher.state 是 Remix 维护的权威状态，跟它走能避免本地 useState 在网络错误/路由切换时漂移，防止重复提交或按钮卡死。",
    },
    explanation: {
      short: "服务端管数据+权限+缓存，客户端管渲染+交互；三条不变量分别防御缓存泄露、隐私泄露、状态漂移。",
      detail: "好的解释应能区分 loader（读、缓存、过滤）与 BubbleMessageBoard（渲染、fetcher 提交、UI 状态），并明确每条不变量的具体风险面。",
    },
    abilityTags: ["bridge.reactRouter.loader", "frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "shared",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 messages loader 的 Cache-Control 统一改成 'public, max-age=60'，理由是 '提升性能，减少回源'。写一条 review comment（1-2 句）。",
    options: [],
    correctAnswer: {
      comment: "登录用户的 userPendingMessages 与 limitStatus 是 user-specific 数据，设 public cache 会导致 CDN 按 URL 缓存并泄露给其他用户（§18.3-1 经典反例）。请保留登录用户 private, no-store 的分支，仅对匿名用户保留 public 缓存。",
    },
    explanation: {
      short: "审查点：user-specific loader 绝不能 public cache。",
      detail: "好的 review comment 应指出 (1) 泄露风险 (2) 引用具体反例 (3) 给出明确恢复建议。",
    },
    abilityTags: ["bridge.reactRouter.loader", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/cache-headers.server.ts"],
  }),
];
