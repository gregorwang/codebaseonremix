/**
 * Real questions for site-06-routing / api-routes.
 *
 * Anchor: remix/app/routes/api.nemesis.ts L21-180 (action) + L182-190 (loader).
 * 学习目标: 资源路由模式 (api.*.ts 文件), method 守门, action/loader 边界.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: remixFetcherToFetch (§18.3-3) — 涉及 action vs 普通 fetch.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { remixFetcherToFetch } from "../recipes";

const PRIMARY = "app/routes/api.nemesis.ts";
const CACHE = "app/lib/cache-headers.server.ts";
const TOUCHED = [PRIMARY, CACHE, "app/lib/nemesis-sse.server.ts"];

export const apiRoutesQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 api.nemesis.ts 文件命名",
    prompt: "api.nemesis.ts 文件路径决定的 URL?",
    options: [
      { id: "A", text: "/api/nemesis (RR 7 文件系统路由)" },
      { id: "B", text: "/nemesis/api" },
      { id: "C", text: "/api" },
      { id: "D", text: "/nemesis" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "app/routes/api.nemesis.ts 映射到 /api/nemesis URL.",
      detail: "RR 7 文件系统路由: app/routes/ 下的 . 点分隔符就是 URL 路径分隔符. api.nemesis.ts 映射到 /api/nemesis.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 ActionFunctionArgs 来源",
    prompt: "action 签名 ({ request, context }: ActionFunctionArgs) 来自?",
    options: [
      { id: "A", text: "@remix-run/cloudflare" },
      { id: "B", text: "react-router" },
      { id: "C", text: "node" },
      { id: "D", text: "vite" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ActionFunctionArgs 来自 @remix-run/cloudflare, 与 loadContext 集成.",
      detail: "RR 7 Cloudflare preset 的 ActionFunctionArgs 类型, 包含 request / params / context. context.cloudflare.env / ctx 是 Cloudflare 特有绑定.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 method 守门状态码",
    prompt: "if (request.method !== 'POST') return json({ error: ... }, { status: 405, headers: NO_STORE_HEADERS }) 用 405 而不是 400?",
    options: [
      { id: "A", text: "405 Method Not Allowed 是 RFC 标准, 表示 '方法不支持', 比 400 更精确" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "405 Method Not Allowed 是 RFC 7231 标准, 比 400 更精确.",
      detail: "400 Bad Request 是通用客户端错误, 405 是'方法不允许'专用. RR action 走 POST, GET / PUT / DELETE 都返回 405 是正确语义. 实际项目里 GET 走 loader 不走 action, 但 DELETE / PUT 仍走 405.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 NO_STORE_HEADERS 来源",
    prompt: "NO_STORE_HEADERS 来自? (模块路径)",
    options: [],
    correctAnswer: { values: { v: "app/lib/cache-headers.server.ts" } },
    blanks: [{ id: "v", placeholder: "路径", acceptedAnswers: ["app/lib/cache-headers.server.ts", "~/lib/cache-headers.server", "cache-headers.server.ts"] }],
    explanation: {
      short: "NO_STORE_HEADERS 来自 app/lib/cache-headers.server.ts, Cache-Control: no-store 标准头.",
      detail: "项目把 Cache-Control 头集中放 cache-headers.server.ts, NO_STORE_HEADERS 是不缓存 (敏感响应), JSON_NO_STORE_HEADERS 加上 Content-Type: application/json.",
    },
    abilityTags: ["backend.session.cookie"],
    sourceFilePath: CACHE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [CACHE],
  }),
  q({
    type: "multi_choice",
    title: "Q5 api.nemesis.ts 内部 import",
    prompt: "api.nemesis.ts import 了? (多选相关模块)",
    options: [
      { id: "A", text: "@remix-run/cloudflare (json, ActionFunctionArgs)" },
      { id: "B", text: "~/lib/cache-headers.server (NO_STORE_HEADERS)" },
      { id: "C", text: "~/lib/nemesis-sse.server (createNemesisSseResponse)" },
      { id: "D", text: "~/services/nemesis.server (callNemesisModel)" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "@remix-run/cloudflare + cache-headers + nemesis-sse + nemesis 服务 + guard 全部涉及.",
      detail: "api.nemesis.ts 是 Nemesis 核心入口, 集成 8+ 模块: RR cloudflare preset / cache headers / SSE / auth / guard / rate limit / model / reply / video catalog.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q6 loader 用途",
    prompt: "api.nemesis.ts 末尾 loader 返回 { message: 'Nemesis API', method: 'POST' }, 用途?",
    options: [
      { id: "A", text: "GET /api/nemesis 时返回 API 自描述, 方便调试与文档" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "GET 返回 API 自描述, 调试 / 文档 / 健康检查.",
      detail: "开发者访问 GET /api/nemesis 看到 { message, method: 'POST' } 知道这是 POST 端点. 简单 health check + API discovery, 比 404 / 405 友好.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: method 守门",
    prompt: "if (request.method !== 'POST') 出现在 api.nemesis.ts action 哪一行?",
    code: `1 export async function action({ request, context }: ActionFunctionArgs) {
2   if (request.method !== "POST") {
3     return json({ error: "Method not allowed" }, { status: 405, headers: NO_STORE_HEADERS });
4   }
5
6   let user;`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "if (request.method !== 'POST') {" },
      { id: "L3", lineNumber: 3, text: "return json({ error: 'Method not allowed' }, { status: 405, headers: NO_STORE_HEADERS });" },
      { id: "L4", lineNumber: 4, text: "}" },
    ],
    correctAnswer: { lineId: "L2" },
    explanation: {
      short: "第 2 行 method 守门, 非 POST 返回 405.",
      detail: "method 守门是 action 入口第一道, 把 GET / PUT / DELETE 拦在外面. 与 loader 共存时, GET 走 loader, 其他方法走 405.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 requireNemesisUser 抛错处理",
    prompt: "user = await requireNemesisUser(request) try/catch 内, error instanceof Response 怎么处理?",
    options: [
      { id: "A", text: "requireNemesisUser 失败时 throw Response (RR 7 模式), catch 里读 status 透传" },
      { id: "B", text: "性能" },
      { id: "C", text: "装饰" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "throw Response 是 RR 7 短响应模式, catch 用 instanceof Response 判断.",
      detail: "RR 7 的 requireAuth / requireUser 类约定: 失败时 throw new Response(...) 而不是 throw new Error, 上层 catch 用 instanceof Response 拿到 status / body. 是 RR 数据流的契约.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis-auth.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q9 validation.payload 与 status",
    prompt: "validateNemesisRequest 返回 validation = { ok, payload, status }, ok=false 时?",
    options: [
      { id: "A", text: "返回 json(validation.payload, { status: validation.status }), 让前端拿到具体错误信息" },
      { id: "B", text: "抛错" },
      { id: "C", text: "no-op" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "validation 模式: ok 布尔 + payload 错误信息 + status 状态码, 三件套结构化返回.",
      detail: "validateNemesisRequest 返回 discriminated union, ok=true 携带正常数据, ok=false 携带错误信息. action 不抛错, 用 json 返回结构化错误, 让前端 fetcher.actionData 拿到.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis-guard.server.ts"],
  }),
  q({
    type: "multi_choice",
    title: "Q10 守门链顺序",
    prompt: "api.nemesis.ts action 守门链顺序? (多选相关)",
    options: [
      { id: "A", text: "method 守门 (L22) → auth 守门 (L28) → validation (L36) → rateLimit (L41) → guard (L60)" },
      { id: "B", text: "顺序不可换, 越靠前越 cheap" },
      { id: "C", text: "rateLimit 在 validation 之后是因为 validation 才能拿到 user.id 用于限流 key" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "method → auth → validation → rateLimit → guard, 越靠前越 cheap, 守门按代价排序.",
      detail: "守门链顺序不是随便排的: method 是字符串比较, 最 cheap; auth 涉及 D1, 较贵; validation 涉及字段解析; rateLimit 涉及计数器; guard 涉及 Gemini 分类器, 最贵. 越 cheap 越前面, 大量请求被前面守门拦截, 越贵的守门只跑必要请求.",
    },
    abilityTags: ["backend.rateLimit"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 cloudflare 强转",
    prompt: "const cloudflare = (context as CloudflareLoadContext).cloudflare; 为何强转?",
    options: [
      { id: "A", text: "ActionFunctionArgs context 是 RR 标准类型, 没有 cloudflare 字段, 需要强转到 Cloudflare preset 的 loadContext" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "RR 标准 ActionFunctionArgs 不带 cloudflare 字段, 强转到 Cloudflare preset 类型.",
      detail: "RR 7 cloudflare preset 扩展了 loadContext, 加 cloudflare.env / ctx. 强转让 TS 知道 cloudflare?.env 存在. 强转是 RR preset 集成的常见模式.",
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
    title: "Q12 登录用户发消息完整路径",
    prompt: "已登录用户 POST /api/nemesis { message: 'hello' }, 完整路径?",
    options: [
      { id: "method", text: "method 守门通过" },
      { id: "auth", text: "requireNemesisUser 通过, 拿 user" },
      { id: "validation", text: "validateNemesisRequest 解析 message 字段" },
      { id: "rate", text: "checkNemesisRateLimit 通过" },
      { id: "sse", text: "createNemesisSseResponse 流式返回 guard / model / done 事件" },
    ],
    correctAnswer: { pathIds: ["method", "auth", "validation", "rate", "sse"] },
    explanation: {
      short: "method → auth → validation → rate → SSE 流, 5 步全过.",
      detail: "完整路径: method 通过 → auth 拿 user → validation 解析 → rate 检查 → SSE 响应. 用户看到流式 status / done 事件, 体验顺滑.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "branch_trace",
    title: "Q13 未登录用户 POST",
    prompt: "未登录用户 POST /api/nemesis, 完整路径?",
    options: [
      { id: "method", text: "method 通过" },
      { id: "auth", text: "requireNemesisUser 失败, throw Response(401)" },
      { id: "catch", text: "action catch 拿到 Response, status=401" },
      { id: "return", text: "return json({ error: '请先登录后再使用 Nemesis。' }, { status: 401 })" },
    ],
    correctAnswer: { pathIds: ["method", "auth", "catch", "return"] },
    explanation: {
      short: "method 过 → auth 抛 401 → catch 透传 → 返回 401 + 友好提示.",
      detail: "未登录用户在 auth 守门被拦, throw Response(401) 是 RR 7 标准, catch 透传 status, action 返回 401 + 中文提示. 不会到 validation / rateLimit / SSE.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis-auth.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q14 GET 访问时",
    prompt: "用户 GET /api/nemesis (浏览器地址栏), 行为?",
    options: [
      { id: "A", text: "走 loader, 返回 { message: 'Nemesis API', method: 'POST' }, 自描述" },
      { id: "B", text: "走 action, 405" },
      { id: "C", text: "404" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "GET 走 loader, 不会到 action 的 method 守门, 返回 API 自描述.",
      detail: "RR 7 路由模块: GET 走 loader, POST / PUT / DELETE 走 action. GET /api/nemesis 触发 loader, action 不跑. 浏览器地址栏 / 健康检查 / API discovery 都走这条路径.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 DELETE 访问时",
    prompt: "用户 DELETE /api/nemesis, 行为?",
    options: [
      { id: "A", text: "走 action, method !== 'POST' 命中, 返回 405 Method Not Allowed" },
      { id: "B", text: "走 loader" },
      { id: "C", text: "404" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "DELETE 走 action, method 守门命中, 返回 405.",
      detail: "RR 7 routing: DELETE 也走 action, 与 POST 同一条 handler. action 第一行 if (request.method !== 'POST') 把 DELETE 拦下, 返回 405 + NO_STORE_HEADERS.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 method 守门",
    prompt: "AI 改坏: AI 觉得 'loader 已经处理 GET' 删 method 守门. 后果是?",
    options: [
      { id: "A", text: "DELETE / PUT 请求走到 validation, 报 'Invalid method' 而不是 405, 错误码不准确" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "删 method 守门后, DELETE 走 validation 报 'Invalid method' 而不是 405, 错误码不准确.",
      detail: "method 守门是 action 入口第一道, 把非 POST 拦截在最早的 cheap 阶段. 删了之后请求继续走 validation, 错误信息 'Invalid method' 与 HTTP 405 Method Not Allowed 含义不同, 客户端处理逻辑会乱.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "客户端 API 错误处理依赖标准 HTTP 状态码, 405 改成 400 让错误处理代码失效.",
    aiReviewRisk: "把 method 守门当成'冗余', 实际是 RFC 标准错误码的入口.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "删守门不是简洁.",
      D: "有 RFC 错误码影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把 action 改普通 fetch handler",
    prompt: "AI 改坏: AI 觉得 'action 复杂' 改用 express-style fetch handler, 在 fetch 内部判断 method / auth / validation. 后果是?",
    options: [
      { id: "A", text: "失去 RR 7 的 method 路由 (GET 走 loader, POST 走 action), 错误处理 / cache / suspense 全部破坏" },
      { id: "B", text: "更对称" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "失去 RR 7 路由模式, loader / action 分发 / Suspense 全部破坏.",
      detail: "RR 7 的 action / loader 不是 express-style handler, 是 RR 路由模块的命名 export, 框架按 HTTP method 自动分发. 改成 fetch handler 失去 RR 数据流 / revalidate / Suspense 集成.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "GET /api/nemesis 走 fetch handler, 不再走 loader, 自描述失效, dev server 行为不一致.",
    aiReviewRisk: "把 RR 路由模式当 express 处理, 失去框架集成.",
    wrongAnswerFeedback: {
      B: "更对称不是 RR 路由目标.",
      C: "TS 不会报错.",
      D: "有严重 RR 集成损失.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 删 NO_STORE_HEADERS",
    prompt: "AI 改坏: AI 觉得 'NO_STORE 性能差' 删除 headers 选项. 后果是?",
    options: [
      { id: "A", text: "CDN / 浏览器缓存敏感响应, 用户 A 的 401 错误信息被用户 B 命中" },
      { id: "B", text: "性能更好" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "删 NO_STORE 头后, 敏感响应被 CDN / 浏览器缓存, 用户 A 的 401 信息被用户 B 命中.",
      detail: "NO_STORE_HEADERS 包含 Cache-Control: no-store, 是 user-specific 响应的必备. 删了之后 CDN 按 URL 缓存, 第二个用户命中同 URL 拿到第一个用户的错误信息, 严重隐私事故.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: CACHE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [CACHE],
    realWorldImpact: "用户 A 收到 401 '请先登录', CDN 缓存, 用户 B 登录后访问同 URL 看到 '请先登录', 体验错乱. 严重时泄露 session 错误信息.",
    aiReviewRisk: "把 user-specific 响应的 cache header 当成'性能优化'删掉.",
    wrongAnswerFeedback: {
      B: "NO_STORE 是正确选择, 不是性能问题.",
      C: "TS 不会报错.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §18.3-3 useFetcher 改 fetch",
    prompt: remixFetcherToFetch({
      lessonSlug: "api-routes",
      courseSlug: "site-06-file-routing",
      orderIndex: 18,
    }).prompt,
    options: remixFetcherToFetch({
      lessonSlug: "api-routes",
      courseSlug: "site-06-file-routing",
      orderIndex: 18,
    }).options,
    correctAnswer: remixFetcherToFetch({
      lessonSlug: "api-routes",
      courseSlug: "site-06-file-routing",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: remixFetcherToFetch({
      lessonSlug: "api-routes",
      courseSlug: "site-06-file-routing",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, "app/hooks/useNemesisChat.client.ts"],
    realWorldImpact: "客户端 chat UI 用 fetch 调 api.nemesis, 失去 fetcher.state / actionData / pending UI, 重复提交 + 错误状态丢失.",
    aiReviewRisk: "把 RR fetcher 当普通 fetch, 破坏 mutation 语义和 UI 状态.",
    wrongAnswerFeedback: remixFetcherToFetch({
      lessonSlug: "api-routes",
      courseSlug: "site-06-file-routing",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 requireNemesisUser try/catch 去掉",
    prompt: "AI 改坏: AI 觉得 try/catch '啰嗦', 直接 user = await requireNemesisUser(request) 不用 try/catch. 后果是?",
    options: [
      { id: "A", text: "未登录用户 throw Response 向上冒, 整个 action 走 ErrorBoundary, 用户看到整站 500" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "throw Response 不 catch 走 ErrorBoundary, 整站 500 而不是友好 401.",
      detail: "requireNemesisUser 失败 throw Response(401) 是 RR 7 短响应契约, 上层 catch 用 instanceof Response 透传. 不 catch 让 throw 冒到 RR 框架, 走 ErrorBoundary 渲染整站错误页, 用户看到 500 而不是友好的 '请先登录'.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis-auth.server.ts"],
    realWorldImpact: "未登录用户看到 500 错误页, 不知道是没登录还是系统出错, 体验糟.",
    aiReviewRisk: "把 RR throw Response 契约当普通 throw, 失去精确错误码透传.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "删 try/catch 不是简洁是错误处理破坏.",
      D: "有错误处理破坏.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 api.nemesis.ts 5 道守门链设计",
    prompt: "用自己的话解释 api.nemesis.ts 5 道守门 (method / auth / validation / rateLimit / guard) 为什么按这个顺序, 调换顺序会出什么问题.",
    options: [],
    correctAnswer: {
      text: "守门链按 '代价从低到高' 排序: method 字符串比较最 cheap, 放最前; auth 涉及 D1 / session 存储, 次 cheap; validation 字段解析与 D1 schema, 中等; rateLimit 计数器, 中等; guard 涉及 Gemini 分类器, 最贵. 调换顺序会 (1) rateLimit 在 auth 之前: 未登录请求也计数, 浪费 quota; (2) guard 在 rateLimit 之前: 攻击者刷量, 即使被限流也消耗 Gemini 配额 (timu.MD §11.3-1 风险); (3) validation 在 auth 之前: 恶意请求可能构造大 body 撞 D1 schema. 顺序错误, 性能 / 安全 / 费用都会爆.",
    },
    explanation: {
      short: "5 道守门按代价从低到高排序, 调换顺序破坏性能 / 安全 / 费用.",
      detail: "守门链是后端核心设计, 顺序不是装饰, 每道守门在特定位置有不可替代的作用. 调换顺序可能引入新漏洞.",
    },
    abilityTags: ["backend.rateLimit"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 action 的 requireNemesisUser try/catch 去掉, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "requireNemesisUser 失败 throw Response(401) 是 RR 7 短响应契约, 必须用 instanceof Response catch 透传 status. 删 try/catch 让 throw 冒到 ErrorBoundary, 未登录用户看到整站 500, 体验糟. try/catch 是精确错误码透传的必需.",
    },
    explanation: {
      short: "审查点: RR throw Response 必须 catch 透传, 不能冒到 ErrorBoundary.",
      detail: "好的 review 指出 (1) throw Response 契约 (2) 不 catch 的后果 (3) try/catch 的设计意图.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis-auth.server.ts"],
  }),
];
