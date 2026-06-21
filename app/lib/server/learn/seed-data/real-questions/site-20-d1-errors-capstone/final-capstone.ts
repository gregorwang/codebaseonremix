/**
 * Real questions for site-20-d1-errors-capstone / final-capstone.
 *
 * Anchor: 整个 remix/ 项目的毕业大考 — 聊天 + 主题 + 登录 三大子系统的端到端文件清单与因果追踪.
 *   app/routes/api.nemesis.ts (最 cross-cutting 的入口)
 *   app/services/nemesis-guard.server.ts
 *   app/services/nemesis-rate-limit.server.ts
 *   app/services/nemesis.server.ts
 *   app/services/nemesis-reply.server.ts
 *   app/services/nemesis-guard-events.server.ts
 *   app/lib/nemesis-sse.server.ts
 *   app/hooks/useNemesisChat.client.ts
 *   app/root.tsx
 *   app/utils/theme.server.ts
 *   app/lib/auth.server.ts
 *   app/services/nemesis-auth.server.ts
 *
 * 学习目标: 能独立列举"改聊天 / 改主题 / 改登录"涉及的文件, 并能在 PR review 中指出
 * api.nemesis.ts 的任何改动如何级联到 rate-limit / guard / SSE / audit / fallback / client.
 *
 * 题目数: 22.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import {
  nemesisRateLimitAfterGuard,
  tsServerImportInClient,
  remixPublicCacheOnMessages,
  nemesisAuditWaitUntil,
  pipelinePlatformIdWiden,
} from "../recipes";

const PRIMARY = "app/routes/api.nemesis.ts";
const GUARD = "app/services/nemesis-guard.server.ts";
const RATE = "app/services/nemesis-rate-limit.server.ts";
const SERVICE = "app/services/nemesis.server.ts";
const REPLY = "app/services/nemesis-reply.server.ts";
const AUDIT = "app/services/nemesis-guard-events.server.ts";
const SSE_SERVER = "app/lib/nemesis-sse.server.ts";
const CHAT_HOOK = "app/hooks/useNemesisChat.client.ts";
const ROOT = "app/root.tsx";
const THEME = "app/utils/theme.server.ts";
const AUTH = "app/lib/auth.server.ts";
const NEMESIS_AUTH = "app/services/nemesis-auth.server.ts";

const TOUCHED = [
  PRIMARY,
  GUARD,
  RATE,
  SERVICE,
  REPLY,
  AUDIT,
  SSE_SERVER,
  CHAT_HOOK,
  ROOT,
  THEME,
  AUTH,
  NEMESIS_AUTH,
];

export const finalCapstoneQuestions: RealQ[] = [
  // ─── 基础识别 (Q1–Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 主题子系统文件清单",
    prompt: "主题切换子系统由哪些文件组成?",
    options: [
      {
        id: "A",
        text: "app/root.tsx (loader 读 theme / action 写 cookie / script 防 FOUC) + app/utils/theme.server.ts (createCookie / getTheme / setTheme)",
      },
      { id: "B", text: "只有 tailwind.css" },
      { id: "C", text: "只有 root.tsx" },
      { id: "D", text: "app/routes/theme.tsx" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "主题 = root.tsx + theme.server.ts, 无独立 route.",
      detail: "root.tsx loader L34 读 getTheme, action L59-74 写 setTheme, Layout L91-99 内嵌 script 读取 cookie 防 FOUC. theme.server.ts 负责 createCookie('theme'). 改主题只需动这两处.",
    },
    abilityTags: ["backend.session.cookie", "ai.review.architecture"],
    sourceFilePath: ROOT,
    layer: "basic",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [ROOT, THEME],
  }),
  q({
    type: "single_choice",
    title: "Q2 登录子系统文件清单",
    prompt: "登录与身份子系统由哪些文件组成?",
    options: [
      {
        id: "A",
        text: "app/lib/auth.server.ts (better-auth 配置 + session 缓存 + requireAuth/requireAdmin) + app/services/nemesis-auth.server.ts (requireNemesisUser 包装) + app/routes/api.auth.$.ts (better-auth API 端点) + root.tsx (loader 注入 session 到 Outlet context)",
      },
      { id: "B", text: "只有 auth.server.ts" },
      { id: "C", text: "只有 LoginDialog.tsx" },
      { id: "D", text: "只有 api.auth.$.ts" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "登录 = auth.server.ts + nemesis-auth.server.ts + api.auth.$.ts + root.tsx Outlet context.",
      detail: "auth.server.ts 配置 better-auth (google/microsoft/magicLink), WeakMap 缓存 session, requireAuth/requireAdmin 分层守门. nemesis-auth.server.ts 把 auth 用户包装成 NemesisUser. api.auth.$.ts 是 better-auth 的 API 路由. root.tsx 把 public session 注入 Outlet context, 子路由通过 useOutletContext 消费.",
    },
    abilityTags: ["backend.auth.required", "ai.review.architecture"],
    sourceFilePath: AUTH,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [AUTH, NEMESIS_AUTH, ROOT],
  }),
  q({
    type: "single_choice",
    title: "Q3 聊天子系统文件清单",
    prompt: "Nemesis 聊天子系统由哪些文件组成?",
    options: [
      {
        id: "A",
        text: "app/routes/api.nemesis.ts (SSE action 入口) + app/services/nemesis.server.ts (业务编排 + 路由选择) + app/lib/nemesis-ai-gateway.server.ts (网关 + provider key) + app/lib/nemesis-sse.server.ts (流式包装) + app/hooks/useNemesisChat.client.ts (UI hook)",
      },
      { id: "B", text: "只有 api.nemesis.ts" },
      { id: "C", text: "只有 useNemesisChat.client.ts" },
      { id: "D", text: "app/routes/chat.tsx 单独完成全部逻辑" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "聊天 = api.nemesis + nemesis.server + ai-gateway + sse.server + useNemesisChat.",
      detail: "api.nemesis.ts 是唯一入口; nemesis.server.ts 负责模型选择 / fallback / 路由; ai-gateway.server.ts 管理 provider URL 和 secret; sse.server.ts 把 handler 包装成 ReadableStream; useNemesisChat.client.ts 消费 SSE 事件并管理 UI 状态. 5 个文件缺一不可.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, SERVICE, "app/lib/nemesis-ai-gateway.server.ts", SSE_SERVER, CHAT_HOOK],
  }),
  q({
    type: "single_choice",
    title: "Q4 auth.server.ts session 缓存设计",
    prompt: "auth.server.ts 中 `getSessionCached` 与 `requestHasAuthSessionCookie` 的设计意图?",
    options: [
      {
        id: "A",
        text: "WeakMap 按 Request 缓存 session Promise, 同一请求内多次查询只走一次 D1; requestHasAuthSessionCookie 先嗅探 cookie 名, 无 auth cookie 的请求直接跳过 D1 读取",
      },
      { id: "B", text: "用 localStorage" },
      { id: "C", text: "用 Redis" },
      { id: "D", text: "无缓存, 每次查 D1" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "WeakMap + cookie 嗅探 = 同一请求去重 + 无 session 请求零 D1 开销.",
      detail: "auth.server.ts L269-314: sessionCache 是 WeakMap<Request, Promise>, 保证 loader / action / 子调用在同一次 HTTP 请求内共享同一个 session Promise. L286-296: requestHasAuthSessionCookie 检查 Cookie 头是否含 better-auth 标记, 没有则直接返回 false, root.tsx loader L37 据此跳过 getSessionCached, 匿名请求零 D1 查询.",
    },
    abilityTags: ["backend.auth.required", "ai.review.architecture"],
    sourceFilePath: AUTH,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [AUTH, ROOT],
  }),
  q({
    type: "single_choice",
    title: "Q5 theme.server.ts cookie 设计",
    prompt: "theme.server.ts 中的 cookie 关键配置?",
    options: [
      {
        id: "A",
        text: "createCookie('theme', { httpOnly: false, sameSite: 'lax', maxAge: 31_536_000 }) — 非 httpOnly 让前端 script 能读, lax 防 CSRF, 一年有效期",
      },
      { id: "B", text: "httpOnly: true" },
      { id: "C", text: "sameSite: 'strict'" },
      { id: "D", text: "maxAge: 3600" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "theme cookie: httpOnly=false (客户端可读), lax, 一年.",
      detail: "theme.server.ts L7-13: httpOnly=false 是因为 root.tsx L94-97 的防 FOUC script 需要 document.cookie 读取主题; sameSite='lax' 保证正常导航带 cookie; maxAge=31536000 (1年) 让主题持久化. 改 httpOnly=true 会导致 FOUC script 读不到, 页面闪烁.",
    },
    abilityTags: ["backend.session.cookie", "ai.review.architecture"],
    sourceFilePath: THEME,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [THEME, ROOT],
  }),
  q({
    type: "single_choice",
    title: "Q6 api.nemesis 端到端 4 步骤",
    prompt: "api.nemesis POST 的端到端 4 步?",
    options: [
      {
        id: "A",
        text: "1. 鉴权 (requireNemesisUser) + 校验 body (validateNemesisRequest) 2. 限流 (checkNemesisRateLimit) 3. 守门 (guardNemesisMessage) 4. 主模型调用 + fallback + parseReply + 附件白名单 + SSE emit + D1 audit",
      },
      { id: "B", text: "1. 调主模型 2. 返回" },
      { id: "C", text: "1. 读 D1 2. 返回" },
      { id: "D", text: "无 4 步" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "4 步: 鉴权+校验 / 限流 / 守门 / 主模型+parse+白名单+SSE+audit.",
      detail: "api.nemesis.ts L28-49: 鉴权 + 校验 + 限流. L53-179: SSE 包裹内 emit status guard → guardNemesisMessage → modeReply 早返回 → callNemesisModel (含 fallback) → parseNemesisReply → ensureNemesisFoodVideoAttachment → emit done + recordAudit. 这是毕业必须背下来的主干.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action", "backend.rateLimit"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),

  // ─── 代码阅读 (Q7–Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: SSE 包裹 createNemesisSseResponse",
    prompt: "下面哪一行是 'action 返回 ReadableStream 响应' 的关键?",
    code: `1 export async function action({ request, context }: ActionFunctionArgs) {
2   if (request.method !== "POST") {
3     return json({ error: "Method not allowed" }, { status: 405, headers: NO_STORE_HEADERS });
4   }
5
6   let user;
7   try {
8     user = await requireNemesisUser(request);
9   } catch (error) {
10    if (error instanceof Response) {
11      return json({ error: "请先登录后再使用 Nemesis。" }, { status: error.status, headers: NO_STORE_HEADERS });
12    }
13    throw error;
14  }
15
16  const cloudflare = (context as CloudflareLoadContext).cloudflare;
17
18  return createNemesisSseResponse(async (emit) => {`,
    options: [],
    linePickLines: [
      { id: "L3", lineNumber: 3, text: "return json({ error: 'Method not allowed' }, { status: 405, headers: NO_STORE_HEADERS });" },
      { id: "L11", lineNumber: 11, text: "return json({ error: '请先登录后再使用 Nemesis。' }, { status: error.status, headers: NO_STORE_HEADERS });" },
      { id: "L18", lineNumber: 18, text: "return createNemesisSseResponse(async (emit) => {" },
    ],
    correctAnswer: { lineId: "L18" },
    explanation: {
      short: "L18: action 返回 SSE ReadableStream, RR 直接送流.",
      detail: "L3 / L11 是 JSON 错误返回. L18 是关键 — RR action 收到 Response 对象直接送出, 内部 handler 闭包按需 emit SSE 事件. 这是 RR + Worker 的标准 SSE 姿势: action 是异步流式响应, 边走边 emit.",
    },
    abilityTags: ["bridge.reactRouter.action", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SSE_SERVER],
  }),
  q({
    type: "line_pick",
    title: "Q8 关键行: audit waitUntil",
    prompt: "下面哪一行把审计写入 D1 设为后台 fire-and-forget?",
    code: `1     const recordAudit = (input: {
2       assistantMessage?: string | null;
3       modelResult?: { provider: string; route: string; model: string; };
4     } = {}) => {
5       if (!guard.shouldAudit) {
6         return;
7       }
8
9       const auditPromise = recordNemesisGuardEvent({
10        userId: user.id,
11        userEmail: user.email,
12        message: validation.message,
13        assistantMessage: input.assistantMessage,
14        recentMessages: validation.recentMessages,
15        decision: guard,
16        modelResult: input.modelResult,
17      }).catch((error) => {
18        console.error("[NemesisGuardAudit] Failed to record event:", error);
19      });
20
21      cloudflare?.ctx?.waitUntil(auditPromise);
22    };`,
    options: [],
    linePickLines: [
      { id: "L5", lineNumber: 5, text: "if (!guard.shouldAudit) { return; }" },
      { id: "L9", lineNumber: 9, text: "const auditPromise = recordNemesisGuardEvent({...})" },
      { id: "L21", lineNumber: 21, text: "cloudflare?.ctx?.waitUntil(auditPromise);" },
    ],
    correctAnswer: { lineId: "L21" },
    explanation: {
      short: "L21: ctx.waitUntil 让审计跑后台, 不阻塞 SSE 主响应.",
      detail: "L5 决定要不要审计; L9 构造审计 Promise; L21 是关键 — 用 ctx.waitUntil 把 D1 写变成 fire-and-forget, 主响应继续走 emit done. 如果改成 await, 审计 IO 会拖慢用户看到的响应时间. 这是 Workers 背景任务的标准用法.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, AUDIT],
  }),
  q({
    type: "line_pick",
    title: "Q9 关键行: rate-limit  gate",
    prompt: "下面哪一行是限流闸门?",
    code: `1   const validation = await validateNemesisRequest(request);
2   if (!validation.ok) {
3     return json(validation.payload, { status: validation.status, headers: JSON_NO_STORE_HEADERS });
4   }
5
6   const limitResult = await checkNemesisRateLimit(user);
7   if (!limitResult.allowed) {
8     const message =
9       limitResult.reason === "minute"
10        ? "请求过于频繁，请稍后再试。"
11        : "今天的 Nemesis 使用次数已达上限，明天再来吧。";
12    return json({ error: message }, { status: 429, headers: NO_STORE_HEADERS });
13  }`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "const validation = await validateNemesisRequest(request);" },
      { id: "L6", lineNumber: 6, text: "const limitResult = await checkNemesisRateLimit(user);" },
      { id: "L12", lineNumber: 12, text: "return json({ error: message }, { status: 429, headers: NO_STORE_HEADERS });" },
    ],
    correctAnswer: { lineId: "L6" },
    explanation: {
      short: "L6: checkNemesisRateLimit 是第二道闸门, 紧跟鉴权+校验之后.",
      detail: "L1 是校验; L6 是限流; L12 是限流拒绝返回. 限流必须早于守门和主模型, 否则被限流请求仍消耗 Gemini 分类器配额. 顺序是设计, 不是代码组织偏好.",
    },
    abilityTags: ["backend.rateLimit", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, RATE],
  }),
  q({
    type: "line_pick",
    title: "Q10 关键行: guard 调用",
    prompt: "下面哪一行触发守门分类器?",
    code: `1     emit("status", { step: "guard", state: "running", label: "正在做安全判断…" });
2
3     const guard = await guardNemesisMessage(cloudflare?.env ?? {}, validation.message, validation.recentMessages);
4     if (process.env.NODE_ENV !== "production") {
5       console.log("[NemesisGuard]", { mode: guard.mode, category: guard.category });
6     }`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "emit('status', { step: 'guard', state: 'running', label: '正在做安全判断…' });" },
      { id: "L3", lineNumber: 3, text: "const guard = await guardNemesisMessage(cloudflare?.env ?? {}, validation.message, validation.recentMessages);" },
      { id: "L5", lineNumber: 5, text: "console.log('[NemesisGuard]', { mode: guard.mode, category: guard.category });" },
    ],
    correctAnswer: { lineId: "L3" },
    explanation: {
      short: "L3: guardNemesisMessage 是第三道闸门, 调用规则守卫 + Gemini 分类器.",
      detail: "L1 只是 emit UI 状态; L3 是实际守门调用, 返回 mode/category/stage/shouldAudit 等决策; L5 是开发环境日志. guard 决定后续走早返回、主模型还是拒绝.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, GUARD],
  }),
  q({
    type: "line_pick",
    title: "Q11 关键行: parseReply",
    prompt: "下面哪一行把模型原始输出收敛成受控结构?",
    code: `1     try {
2       const result = await callNemesisModel({ env, message, recentMessages, responseMode: "normal", onProgress: emit });
3       const parsed = parseNemesisReply(result.text);
4       const attachments = ensureNemesisFoodVideoAttachment(parsed.attachments, validation.message);
5
6       recordAudit({ assistantMessage: parsed.text, modelResult: result });
7       emit("done", { text: parsed.text, attachments, modelRoute: result.route });
8     } catch (error) {`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "const result = await callNemesisModel({ env, message, recentMessages, responseMode: 'normal', onProgress: emit });" },
      { id: "L3", lineNumber: 3, text: "const parsed = parseNemesisReply(result.text);" },
      { id: "L4", lineNumber: 4, text: "const attachments = ensureNemesisFoodVideoAttachment(parsed.attachments, validation.message);" },
    ],
    correctAnswer: { lineId: "L3" },
    explanation: {
      short: "L3: parseNemesisReply 把不可信模型字符串解析成 { text, attachments }.",
      detail: "L2 调主模型; L3 是收敛层 — 模型输出不可信, 必须解析 + 容错 + 收窄; L4 是白名单过滤. parseNemesisReply 缺失时, 模型注入的恶意 URL / 畸形 JSON 会直接流到前端.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, REPLY],
  }),

  // ─── 状态推理 (Q12–Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 roast persona 失效的文件 walk",
    prompt: "用户反馈 'roast 模式突然变温柔了'. 走一遍 7 步文件链, 找出哪里可能坏掉.",
    options: [
      { id: "chat", text: "1. useNemesisChat.client.ts 发送用户消息到 /api/nemesis" },
      { id: "action", text: "2. api.nemesis.ts action 接收 POST, 鉴权通过后进入 SSE handler" },
      { id: "select", text: "3. nemesis.server.ts selectNemesisModel 调用 routeNemesisQuery 做意图分类" },
      { id: "router", text: "4. query-router 检测到 roast 触发词, 返回 preferredRoute='grok_roast'" },
      { id: "gateway", text: "5. nemesis-ai-gateway.server.ts 解析 XAI_API_KEY + Grok gateway URL" },
      { id: "prompt", text: "6. grok-roast-prompt.server.ts 提供 '贴吧老哥嘴臭模式' system prompt" },
      { id: "break", text: "7. 若 env 缺少 XAI_API_KEY 或 prompt 被误改, roast 风格丢失或 fallback 到 Gemini 温柔回复" },
    ],
    correctAnswer: { pathIds: ["chat", "action", "select", "router", "gateway", "prompt", "break"] },
    explanation: {
      short: "7 步: chat → action → select → router → gateway → prompt → 环境/配置故障.",
      detail: "roast 不是前端开关, 是后端路由决策. 任何一步断裂都会让 roast 失效: (5) XAI_API_KEY 缺失会抛错走 fallback; (6) prompt 被改成普通 system prompt 会温柔; (4) query router 阈值调高会导致路由到 gemini_lite. 排查需从 gateway 日志 → env → prompt → router 阈值倒推.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 messages 页面 pending 串用户泄漏路径",
    prompt: "AI 改坏 messages loader, 把 Cache-Control 改成全部 public. 走一遍 7 步泄漏链.",
    options: [
      { id: "loader", text: "1. messages.tsx loader 查询 userPendingMessages + limitStatus" },
      { id: "session", text: "2. getSessionCached 确认用户 A 已登录" },
      { id: "private", text: "3. 正常应返回 Cache-Control: private, no-store" },
      { id: "bug", text: "4. AI 改成 'public, max-age=60', CDN 开始缓存" },
      { id: "cdn", text: "5. 用户 A 的 /messages 响应被 CDN 按 URL 缓存" },
      { id: "userb", text: "6. 用户 B 访问 /messages, CDN 命中缓存, 直接返回 A 的数据" },
      { id: "leak", text: "7. 用户 B 看到 A 的 pending 消息和 limitStatus, 隐私泄漏" },
    ],
    correctAnswer: { pathIds: ["loader", "session", "private", "bug", "cdn", "userb", "leak"] },
    explanation: {
      short: "public cache 把 user-specific loader 变成共享缓存, 导致跨用户泄漏.",
      detail: "messages.tsx L38-41 的条件缓存是安全关键: 登录用户 → private, no-store; 匿名 → public. AI 一刀切改 public 等于把 pending / limitStatus 暴露给 CDN. 这是 §18.3-1 的经典反例: user-specific loader 绝不能 public cache.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.loader"],
    sourceFilePath: "app/routes/messages.tsx",
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: ["app/routes/messages.tsx", "app/lib/cache-headers.server.ts", ROOT],
  }),
  q({
    type: "single_choice",
    title: "Q14 cookie 名 theme 的 1-click 来源",
    prompt: "用一次搜索就能定位 cookie 名 `theme` 是在哪里定义的?",
    options: [
      { id: "A", text: "app/utils/theme.server.ts 中的 createCookie('theme', ...)" },
      { id: "B", text: "root.tsx 的 <html className={theme}>" },
      { id: "C", text: "tailwind.config.ts" },
      { id: "D", text: ".env" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "theme cookie 名定义在 theme.server.ts createCookie('theme').",
      detail: "搜索 createCookie('theme') 只有一处: theme.server.ts L7. root.tsx 消费它, tailwind 不感知 cookie 名, .env 里没有 theme. 改 cookie 名必须改 createCookie 的第一个参数.",
    },
    abilityTags: ["backend.session.cookie", "ai.review.architecture"],
    sourceFilePath: THEME,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [THEME, ROOT],
  }),
  q({
    type: "single_choice",
    title: "Q15 登录身份如何链到 api.nemesis",
    prompt: "登录用户打开 /chat 并发消息, 身份验证链经过哪些文件?",
    options: [
      {
        id: "A",
        text: "api.nemesis.ts → requireNemesisUser → requireAuth → getSessionCached → better-auth session cookie → D1 user 表",
      },
      { id: "B", text: "useNemesisChat.client.ts 自己判断" },
      { id: "C", text: "localStorage 存用户 ID" },
      { id: "D", text: "URL 参数传 email" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "身份链: api.nemesis → nemesis-auth → auth → getSessionCached → cookie → D1.",
      detail: "前端不存身份凭证; fetch 自动带 cookie; 服务端 requireNemesisUser (nemesis-auth.server.ts) 包装 requireAuth (auth.server.ts); requireAuth 走 getSessionCached → better-auth API → D1 session 表. 整条链 0 信任前端, 全在服务端完成.",
    },
    abilityTags: ["backend.auth.required", "bridge.reactRouter.loader", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, NEMESIS_AUTH, AUTH],
  }),

  // ─── AI 改坏 (Q16–Q20) ──────────────────────────────────────────────────
  {
    ...nemesisRateLimitAfterGuard({
      lessonSlug: "final-capstone",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 15,
      primaryFile: PRIMARY,
    }),
    layer: "ai-review",
    touchedFiles: TOUCHED,
  },
  {
    ...tsServerImportInClient({
      lessonSlug: "final-capstone",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 16,
      primaryFile: CHAT_HOOK,
    }),
    layer: "ai-review",
    touchedFiles: TOUCHED,
  },
  {
    ...remixPublicCacheOnMessages({
      lessonSlug: "final-capstone",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 17,
      primaryFile: "app/routes/messages.tsx",
    }),
    layer: "ai-review",
    touchedFiles: TOUCHED,
  },
  {
    ...nemesisAuditWaitUntil({
      lessonSlug: "final-capstone",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 18,
      primaryFile: PRIMARY,
    }),
    layer: "ai-review",
    touchedFiles: TOUCHED,
  },
  {
    ...pipelinePlatformIdWiden({
      lessonSlug: "final-capstone",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 19,
      primaryFile: "app/data/game.ts",
    }),
    layer: "ai-review",
    touchedFiles: TOUCHED,
  },

  // ─── 自由作答 (Q21–Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 添加新 chat persona 的文件清单",
    prompt:
      "假设要新增一个 'tech-mentor' persona, 让 Nemesis 以资深工程师口吻回答技术问题. " +
      "走一遍贡献者必须端到端改动的文件列表, 并说明每处改什么.",
    options: [],
    correctAnswer: {
      text:
        "添加 tech-mentor persona 需要改 7+ 个文件:\n" +
        "1. app/nemesis/system-prompt.server.ts — 新增 tech-mentor system prompt 段落;\n" +
        "2. app/nemesis/guard-replies.ts — 若 guard 对 tech 话题有固定回复, 需补充 mode 对应的文案;\n" +
        "3. app/services/nemesis-query-router.server.ts — 教意图分类器识别 'tech-mentor' 触发词, 返回 preferredRoute='tech_mentor';\n" +
        "4. app/services/nemesis.server.ts — 在 selectNemesisModel / routeToDecision 里新增 tech_mentor 分支, 指定 provider + model;\n" +
        "5. app/lib/nemesis-ai-gateway.server.ts — 若 tech_mentor 走新 provider, 添加 env key 解析 (如 OPENAI_API_KEY) 和网关路由;\n" +
        "6. app/hooks/useNemesisChat.client.ts — 在 UI 增加 persona 切换标签/下拉框, 把选择带到请求体;\n" +
        "7. app/services/nemesis-guard-events.server.ts — 若 audit 表需要记录 persona 字段, 更新 schema 和写入逻辑;\n" +
        "8. app/routes/api.nemesis.ts — 把前端传来的 persona 参数透传给 callNemesisModel. " +
        "任何一步遗漏都会导致 persona 不生效、路由走错、或审计缺失.",
    },
    explanation: {
      short: "7-8 个文件端到端: prompt / guard / router / service / gateway / client / audit / route.",
      detail:
        "好的回答能列出 (1) system prompt (2) guard-replies (3) query-router (4) nemesis.server route decision " +
        "(5) ai-gateway env (6) client UI label (7) audit schema (8) api.nemesis 透传. 这是全栈改造的典型检查清单.",
    },
    abilityTags: ["project.modify.fullstack", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "mixed-risk",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 PR review: 不许简化 api.nemesis.ts",
    prompt:
      "PR 标题: 'small refactor: simplify api.nemesis.ts — 提取几个小函数让代码更整洁'. " +
      "写一条 stern review comment (1-2 句), 解释为什么这个文件不允许'小重构'.",
    options: [],
    correctAnswer: {
      comment:
        "api.nemesis.ts 是 12 个文件的交汇点: 限流顺序必须早于守门, SSE emit 契约被 useNemesisChat 严格消费, " +
        "audit 通过 ctx.waitUntil 后台写 D1, fallback 链在 callNemesisModel 内部但异常处理在 action catch, " +
        "parseReply + attachment 白名单是安全最后一道门. 任何'简化'如果破坏这些顺序或契约, 都会跨 rate-limit / guard / SSE / audit / fallback / client 产生级联故障. " +
        "请把重构范围缩小到单一职责函数提取, 不要改动 action 主流程时序.",
    },
    explanation: {
      short: "审查点: api.nemesis.ts 是架构契约文件, 不是普通业务代码.",
      detail:
        "好的 review 指出 (1) 该文件的 cross-cutting 地位 (2) 时序不可变 (限流>守门>模型) (3) SSE/audit/fallback/parse 是多文件契约 " +
        "(4) 给出明确替代方案 (只提取函数, 不改时序). 这是毕业级 review 素养.",
    },
    abilityTags: ["project.modify.fullstack", "ai.review.architecture", "backend.rateLimit"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
];
