/**
 * Real questions for site-20-d1-errors-capstone / cross-module.
 *
 * Anchor: 跨模块端到端, 串联 route → service → gateway → D1.
 *   app/routes/api.nemesis.ts (入口 + SSE)
 *   app/services/nemesis-guard.server.ts (守门)
 *   app/services/nemesis-rate-limit.server.ts (限流)
 *   app/services/nemesis.server.ts (业务编排)
 *   app/services/nemesis-reply.server.ts (响应解析)
 *   app/services/nemesis-guard-events.server.ts (D1 audit)
 *   app/nemesis/video-catalog.ts (附件白名单)
 *
 * 学习目标: 端到端走一遍 api.nemesis POST 全部数据流, 出错路径、限制、
 * persona、附件白名单、模型选择、fallback、audit 的综合理解.
 *
 * 题目数: 22.
 *
 * 引用 recipe: tsServerImportInClient (§12.2-TS-3) + remixFetcherToFetch (§18.3-3).
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { tsServerImportInClient, remixFetcherToFetch } from "../recipes";

const PRIMARY = "app/routes/api.nemesis.ts";
const GUARD = "app/services/nemesis-guard.server.ts";
const RATE = "app/services/nemesis-rate-limit.server.ts";
const SERVICE = "app/services/nemesis.server.ts";
const REPLY = "app/services/nemesis-reply.server.ts";
const AUDIT = "app/services/nemesis-guard-events.server.ts";
const VIDEO = "app/nemesis/video-catalog";
const SSE_CLIENT = "app/lib/nemesis-sse.client.ts";
const TOUCHED = [PRIMARY, GUARD, RATE, SERVICE, REPLY, AUDIT, VIDEO, SSE_CLIENT];

export const crossModuleQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 端到端 4 步骤",
    prompt: "api.nemesis POST 端到端 4 步?",
    options: [
      { id: "A", text: "1. 鉴权 + 校验 body 2. 限流 3. 守门 (classifier + rule guard) 4. 主模型调用 + fallback + parse + 附件白名单 + SSE emit + D1 audit" },
      { id: "B", text: "1. 调主模型 2. 返回" },
      { id: "C", text: "1. 读 D1 2. 返回" },
      { id: "D", text: "无 4 步" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "4 步: 鉴权 + 校验 / 限流 / 守门 / 主模型 + fallback + parse + 白名单 + SSE + audit.",
      detail: "api.nemesis L21-49: 鉴权 (requireNemesisUser) + 校验 body (validateNemesisRequest) + 限流 (checkNemesisRateLimit). L53-179: createNemesisSseResponse 包裹, 内部 emit status guard → guardNemesisMessage → getNemesisModeReply (early return) → callNemesisModel (含 fallback 链) → parseNemesisReply → ensureNemesisFoodVideoAttachment (白名单) → emit done + recordAudit.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 validateNemesisRequest 职责",
    prompt: "validateNemesisRequest 做了什么?",
    options: [
      { id: "A", text: "body 解析 + 结构校验 + recentMessages 收敛 (role / text 长度 / 截断), 返回 { ok, message, recentMessages, payload?, status? }" },
      { id: "B", text: "调主模型" },
      { id: "C", text: "写 D1" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "validateNemesisRequest 把 body 解析 + recentMessages 归一化收敛, 失败返回 status + payload.",
      detail: "L36-39: validation = await validateNemesisRequest(request). 不 ok 时返回 json(validation.payload, { status: validation.status, headers: JSON_NO_STORE_HEADERS }). 业务路由不需要知道怎么解析 body, 责任封装在 guard/validation 内部, 失败时已构造好用户可读 JSON 错误.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: GUARD,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q3 checkNemesisRateLimit 维度",
    prompt: "checkNemesisRateLimit 的限流维度?",
    options: [
      { id: "A", text: "minute (短期) + day (长期), reason 字段区分 — 失败时 minute 给'请求过于频繁' / day 给'今天已达上限'" },
      { id: "B", text: "无" },
      { id: "C", text: "只按 IP" },
      { id: "D", text: "只按天" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "minute + day 双层, reason 区分, 错误文案分场景.",
      detail: "L41-49: limitResult = checkNemesisRateLimit(user). reason === 'minute' → '请求过于频繁，请稍后再试。', reason === 'day' → '今天的 Nemesis 使用次数已达上限，明天再来吧。'. 文案区分 + 不同 429 隐含语义: minute 是'慢点', day 是'明天再来', 给用户清晰的 retry 时机.",
    },
    abilityTags: ["backend.rateLimit", "ai.review.architecture"],
    sourceFilePath: RATE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, RATE],
  }),
  q({
    type: "single_choice",
    title: "Q4 guardNemesisMessage 出口",
    prompt: "guardNemesisMessage 返回的关键字段?",
    options: [
      { id: "A", text: "mode (allow | reject | safe | quick) + category + stage (RULE_GUARD | GEMINI) + ruleId + classifierConfidence + classifierReason + shouldAudit + reason" },
      { id: "B", text: "无字段" },
      { id: "C", text: "只返回 boolean" },
      { id: "D", text: "boolean + message" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "mode + category + stage + ruleId + classifierConfidence + classifierReason + shouldAudit + reason 8 字段.",
      detail: "guard 返回结构化结果: mode 决定后续走主模型 / 预写文案 / 拒绝; stage 区分走规则还是 Gemini 分类器; classifierConfidence + classifierReason 是审计线索 (但不暴露给前端, 只留日志). shouldAudit 决定 recordAudit 调不调.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: GUARD,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q5 shouldAudit 触发",
    prompt: "guard.shouldAudit 决定什么?",
    options: [
      { id: "A", text: "是否走 ctx.waitUntil(recordNemesisGuardEvent) — 不是所有请求都 audit, 只守门 reject / 复杂分类时 audit" },
      { id: "B", text: "是否限流" },
      { id: "C", text: "是否调主模型" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "shouldAudit 决定 D1 audit 写不写 — 只在守门 reject / Gemini 分类路径写, 规则守卫 + allow 跳过.",
      detail: "L103-126: recordAudit 函数内 if (!guard.shouldAudit) return. 只在需要审计 (Gemini 分类走过的 / 守门 reject) 路径写 D1. 规则守卫 + allow 路径不写 audit, 因为成本高 (D1 写) 且无审计价值. 这是性能 + 价值的工程权衡.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, AUDIT],
  }),
  q({
    type: "single_choice",
    title: "Q6 modeReply 早返回",
    prompt: "getNemesisModeReply(guard.mode) 返回非空时, api.nemesis 行为?",
    options: [
      { id: "A", text: "audit + emit done 早返回, 不调主模型 — safe / quick / reject 模式用预写文案" },
      { id: "B", text: "继续调主模型" },
      { id: "C", text: "throw 500" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "modeReply 非空时 audit + emit done, 跳过 callNemesisModel, 早返回.",
      detail: "L128-133: modeReply = getNemesisModeReply(guard.mode); if (modeReply) { recordAudit({ assistantMessage: modeReply }); emit('done', { text: modeReply, mode: guard.mode }); return; }. 守门 reject / safe / quick 直接走预写文案, 不浪费主模型 quota. 流程是: guard → 预写 → done, 用户看到 '我需要更多信息' / '好的收到' 等直接文案.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, GUARD],
  }),
  // ─── 代码阅读 (Q7-Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: SSE 包裹 createNemesisSseResponse",
    prompt: "下面哪一行是 'action 函数返回 ReadableStream 响应' 的关键?",
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
      short: "L18: return createNemesisSseResponse — action 把 ReadableStream Response 直接返回给 RR.",
      detail: "L3 / L11 是 JSON 错误返回 (4xx 路径). L18 是关键 — RR action 收到 Response 对象直接送出, 内部 handler 闭包按需 emit SSE 事件. 这是 RR + Worker 的标准 SSE 姿势: action 是异步流式响应, 边走边 emit.",
    },
    abilityTags: ["bridge.reactRouter.action", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/nemesis-sse.server.ts"],
  }),
  q({
    type: "multi_choice",
    title: "Q8 recordAudit 实际写 D1 字段",
    prompt: "recordNemesisGuardEvent 实际写入 D1 的核心字段? (多选)",
    options: [
      { id: "A", text: "userId / userEmail / message / assistantMessage / recentMessages" },
      { id: "B", text: "decision.mode / decision.category / decision.stage / decision.ruleId / decision.classifierConfidence" },
      { id: "C", text: "modelResult.provider / modelResult.route / modelResult.model / modelResult.fallbackUsed / modelResult.finishReason" },
      { id: "D", text: "secret / apiKey / modelCredential" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "D1 audit 写 3 类: 用户 / 守门决策 / 模型结果; secret 永不入库.",
      detail: "L107-117 + AUDIT 函数: (1) 用户维度: userId, userEmail, message, assistantMessage, recentMessages — 锚定'谁问了什么' + '谁回答了什么'; (2) 守门决策: decision.* 整对象 — 守门链路完整证据; (3) 模型结果: provider / route / model / fallbackUsed / finishReason — 还原当时模型. secret / apiKey 永远不进 D1, 防止泄露.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: AUDIT,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, AUDIT],
  }),
  q({
    type: "fill_blank",
    title: "Q9 recordAudit 时机",
    prompt: "recordAudit() 在 (1) modeReply 早返回 (2) 主模型成功后 (3) catch 异常时, 这 3 个时机的行为差异是?",
    options: [],
    correctAnswer: { values: { v: "(1) 传 assistantMessage=modeReply / (2) 传 assistantMessage=parsed.text + modelResult=result / (3) 不传参数 (只记决策不记文本)" } },
    blanks: [{ id: "v", placeholder: "三时机参数差异", acceptedAnswers: [
      "(1) 传 assistantMessage=modeReply / (2) 传 assistantMessage=parsed.text + modelResult=result / (3) 不传参数 (只记决策不记文本)",
      "1 传 modeReply 2 传 parsed.text + modelResult 3 不传",
      "modeReply / parsed.text + result / 无",
    ] }],
    explanation: {
      short: "1 传 modeReply / 2 传 parsed.text + modelResult=result / 3 不传 (只记决策不记文本).",
      detail: "(1) L130: recordAudit({ assistantMessage: modeReply }) — 预写文案, 守门 reject 的样本; (2) L155: recordAudit({ assistantMessage: parsed.text, modelResult: result }) — 完整主模型结果, 最有审计价值; (3) L170: recordAudit() — 异常路径只记录守门决策 + 错误信息, assistantMessage 为空.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, AUDIT],
  }),
  q({
    type: "single_choice",
    title: "Q10 parseNemesisReply 职责",
    prompt: "parseNemesisReply(result.text) 做了什么?",
    options: [
      { id: "A", text: "解析模型输出: 提取 text + attachments, 容错 (模型漏了 [] 时补空数组), 把不规则 markdown 收窄成受控结构" },
      { id: "B", text: "调主模型" },
      { id: "C", text: "写 D1" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "parseNemesisReply 解析 + 容错 + 收窄, 输出 { text, attachments } 受控结构.",
      detail: "L152: const parsed = parseNemesisReply(result.text). 模型输出是不可信 string, parseNemesisReply 是收敛层: (1) 提取主文本; (2) 解析 JSON 附件数组; (3) 容错 (attachments 缺失时补 []); (4) 收窄到 ChatAttachment union (sticker / audio / video). 模型输出永远走 parse, 不能直接信任.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: REPLY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [REPLY],
  }),
  q({
    type: "single_choice",
    title: "Q11 ensureNemesisFoodVideoAttachment 角色",
    prompt: "ensureNemesisFoodVideoAttachment 作用?",
    options: [
      { id: "A", text: "白名单守卫: 检查 parsed.attachments 里的 video URL 是否在受控 catalog, 不在则过滤掉, 防止模型注入外链" },
      { id: "B", text: "调主模型" },
      { id: "C", text: "写 D1" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "白名单守卫: 过滤 video URL, 仅保留受控 catalog 内的附件.",
      detail: "L153: const attachments = ensureNemesisFoodVideoAttachment(parsed.attachments, validation.message). 模型可以输出任意 video URL, 信任它等于接受 prompt 注入 — 用户可能被引到外站 (钓鱼 / 跟踪像素). 白名单 catalog 是受控视频列表, 不在表里的被丢弃, 配合 aiSchemas / parseNemesisReply 形成 '模型输出 → 收敛 → 白名单 → emit done' 的安全管线.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: VIDEO,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [VIDEO, REPLY],
  }),
  // ─── 状态推理 (Q12-Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 完整端到端成功路径",
    prompt: "登录用户发问, Gemini Lite 主模型成功 — 完整 7 步?",
    options: [
      { id: "1", text: "1. requireNemesisUser 拿到 user" },
      { id: "2", text: "2. validateNemesisRequest ok, recentMessages 收敛" },
      { id: "3", text: "3. checkNemesisRateLimit allowed" },
      { id: "4", text: "4. emit status guard running, guardNemesisMessage 返回 mode=allow, shouldAudit=true" },
      { id: "5", text: "5. emit status guard done; emit status route running; callNemesisModel 选 gemini_lite" },
      { id: "6", text: "6. emit status generate running/done; parseNemesisReply + ensureNemesisFoodVideoAttachment" },
      { id: "7", text: "7. recordAudit + emit done { text, attachments, modelRoute, ... }; controller.close" },
    ],
    correctAnswer: { pathIds: ["1", "2", "3", "4", "5", "6", "7"] },
    explanation: {
      short: "7 步: 鉴权 → 校验 → 限流 → 守门 → 路由+主模型 → parse+白名单 → audit+done.",
      detail: "完整 happy path. 每步都校验, 任何失败早返回. shouldAudit=true 让 L107-117 走 ctx.waitUntil(recordNemesisGuardEvent) 把守门决策 + 模型结果写 D1 (fire-and-forget). 客户端 reader 收到 done 后流关闭, 打字动画启动.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 守门 reject 路径",
    prompt: "用户问'教我黑入系统', 守门 reject. 路径?",
    options: [
      { id: "auth", text: "鉴权通过" },
      { id: "validate", text: "validate ok" },
      { id: "rate", text: "rateLimit allowed" },
      { id: "s-guard", text: "emit status guard running" },
      { id: "guard-reject", text: "guardNemesisMessage mode=reject, shouldAudit=true" },
      { id: "s-guard-d", text: "emit status guard done, mode=reject" },
      { id: "mode-reply", text: "getNemesisModeReply('reject') = '我无法帮助这个。'" },
      { id: "audit", text: "recordAudit({ assistantMessage: '我无法帮助这个。' }) — ctx.waitUntil" },
      { id: "done", text: "emit done { text, mode: reject }" },
    ],
    correctAnswer: { pathIds: ["auth", "validate", "rate", "s-guard", "guard-reject", "s-guard-d", "mode-reply", "audit", "done"] },
    explanation: {
      short: "鉴权 → 校验 → 限流 → guard reject → modeReply → audit → done, 9 步.",
      detail: "reject 路径不调主模型, 直接走预写文案 + audit. 关键: 守门 reject 必须被审计, 用于回顾 (1) 规则是否合理 (2) 是否有大量相似 prompt 攻击. 主模型调用成本 = 0, 但 audit 成本 = 1 次 D1 write. 这就是 '限流早于守门' + '守门 reject 必审计' 的设计闭环.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 主模型 fallback 链触发",
    prompt: "gemini_lite 失败 (429) → 走 fallback gemini_flash → 还失败 (500) → fallback deepseek → 成功. 哪些层在调用?",
    options: [
      { id: "A", text: "全部在 callNemesisModel 内部 (routes 层只看到 1 次 callNemesisModel 调用 + 1 个 emit done), fallback 是 service 内部关注点" },
      { id: "B", text: "route 层多次 await" },
      { id: "C", text: "gateway 层多次 fetch" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "fallback 在 service 层 (callNemesisModel) 内部, route 只看到 1 个 callNemesisModel 调用.",
      detail: "callNemesisModel 内部 selectNemesisModel + fallbackRoutes 链 + shouldTryFallback 状态码判断, 循环尝试. onProgress 在每次 attempt 时 emit status fallback. route 层 (api.nemesis) 不感知 fallback 存在, 只看到 1 次 await + emit done. 这是关注点分离 — 业务路由只关心'有没有结果', 业务服务管'怎么拿到结果'.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: SERVICE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE, PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 客户端 SSE 消费",
    prompt: "useNemesisChat.client.ts 收到 SSE 事件时, 不同 event 类型的 UI 影响?",
    options: [
      { id: "A", text: "status → setRequestStage 更新进度条; done → setMessages + setTypingMessageId 启动打字动画; error → setError 显示错误条" },
      { id: "B", text: "全部 alert" },
      { id: "C", text: "无影响" },
      { id: "D", text: "全部 reload page" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "3 类事件 → 3 类 UI: 进度条 / 打字动画 / 错误条.",
      detail: "SSE 客户端 (SSE_CLIENT) 按 event 路由: status → 调用 setRequestStage 回调, UI 进度条按 step 推进; done → 调用 buildAssistantMessage 构造 message, setMessages + setTypingMessageId 启动打字动画; error → throw Error(message) 让外层 catch 走 setError. 关注点分离: SSE 解析层与 UI 状态层解耦, 通过回调 / throw 通信.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: "app/lib/nemesis-sse.client.ts",
    layer: "state-reasoning",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [SSE_CLIENT, PRIMARY],
  }),
  // ─── AI 改坏 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把限流挪到主模型调用后",
    prompt: "AI 改坏: AI 觉得 'rate limit 在 action 顶部比较突兀', 把它挪到 callNemesisModel 之后. 后果是?",
    options: [
      { id: "A", text: "守门 + parse + 主模型 + fallback 全部白跑, 被限流请求消耗所有上游资源; 这与 §11.3-1 同类反例" },
      { id: "B", text: "更整洁" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "限流必须早于守门 / 主模型, 否则被限流请求消耗算力 + D1 audit + Gemini 分类器配额.",
      detail: "与 §11.3-1 完全同构: 限流挪到主模型后, 攻击者刷 1000 次, 每次都跑 (1) requireNemesisUser (2) validateNemesisRequest (3) guardNemesisMessage (Gemini 分类) (4) callNemesisModel (5) recordAudit. 即使全部被限流拒绝, Gemini 分类器已经被打 1000 次, D1 audit 写 1000 条. 限流 = 第一道闸门, 必须在所有昂贵操作前.",
    },
    abilityTags: ["backend.rateLimit", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, RATE, GUARD],
    realWorldImpact: "攻击者用脚本高频刷, Gemini 分类器配额 5 分钟打爆, 月度账单涨 100x.",
    aiReviewRisk: "为'代码组织'破坏限流的第一道闸门位置.",
    wrongAnswerFeedback: {
      B: "整洁 ≠ 正确, 限流必须早.",
      C: "TS 不会报错.",
      D: "有严重成本 + 安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 引用 §12.2-TS-3 client 导入 server 模块",
    prompt: "AI 改坏: AI 觉得 '前端需要知道当前 model', 在 useNemesisChat.client.ts 顶部 import { getGeminiLiteModel } from '~/services/nemesis.server'. 后果是?",
    options: [
      { id: "A", text: "client 把 nemesis.server 整树拉进 bundle, system prompt / AI Gateway / provider key 全暴露在浏览器, 严重安全事件" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更方便" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "client 导入 .server.ts 把服务端依赖打进浏览器, secret 暴露, 严重泄露.",
      detail: "vite 强制 .server.ts 后缀是隔离边界. 即便只 import 一个常量, 整棵 import tree (nemesis.server → gemini-classifier / ai-gateway / provider 凭证) 都被 bundler 拉进 client bundle. 攻击者打开 dev tools 看到 system prompt, 可以调出绕过 prompt; provider key 泄露可以让别人用你的 quota.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [SERVICE, PRIMARY],
    realWorldImpact: "开发者打开 dev tools 看到 system prompt '你是一个讽刺的吐槽 AI', 反向调 prompt 拿到完整安全规则; provider key 泄露到生产 bundle.",
    aiReviewRisk: "为了'调试方便' 跨边界 import, 破坏 secret 隔离.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 这是 Vite 的边界约束, 不是 TS.",
      C: "方便 = 灾难, secret 暴露.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 引用 §18.3-3 useFetcher 改 fetch",
    prompt: "AI 改坏: AI 把 useNemesisChat 的 requestNemesisReply 内部 fetch 改成普通 fetch (不带 credentials: include), 后果是?",
    options: [
      { id: "A", text: "session cookie 跨域不发送, 用户被静默登出 (服务端 401), 但 fetch 不抛错, UI 看到空 done 事件" },
      { id: "B", text: "更快" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "credentials: 'include' 必须显式声明, 否则 cookie 不发送, 服务端 401, 客户端 UI 卡死.",
      detail: "useFetcher 自动管理 cookie 凭据, 普通 fetch 默认 same-origin, 跨子域 / 跨 cookie 配置需要 credentials: 'include'. 不写的话服务端 requireNemesisUser 401, 但客户端 fetch 不会自动抛错, 要看业务怎么处理 4xx. 改 useFetcher → fetch 等于重写一半 RR mutation (actionData / pending / error 状态), 见 §18.3-3.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, "app/lib/nemesis-chat-api.client.ts"],
    realWorldImpact: "用户在生产站发问, 服务端 401, UI 卡在 loading, 用户怀疑崩溃.",
    aiReviewRisk: "把 RR 的 fetch wrapper 换成原生, 丢失自动 credential + revalidate + state 管理.",
    wrongAnswerFeedback: {
      B: "fetch 不一定更快, 失去 RR 的 progressive enhancement.",
      C: "TS 不会报错.",
      D: "有严重可用性影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 AI 把 modelResult 整对象塞进 D1 audit",
    prompt: "AI 改坏: AI 觉得 '多记一点好', 把 result 整对象 (含 secret) 塞进 recordNemesisGuardEvent 的 modelResult. 后果是?",
    options: [
      { id: "A", text: "D1 audit 写入 secret (API key / token), 通过 Wrangler / D1 console / 任何审计查询都能看到, 严重泄露" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更详细" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "result 是公开对象, 但内部字段可能含 secret; audit 持久化后无法撤销, 严重泄露.",
      detail: "result 是 callNemesisModel 返回的'公开'对象, 但如果 callNemesisModel 内部某个新字段 (如 model.apiKey) 被塞进 result, 一旦整对象写 D1, secret 永远进审计. 即使现在 result 没有 secret, '整对象透传' 的代码风格会让未来 PR 悄悄泄露. 正确做法: 显式选字段 ({ provider, route, model, fallbackUsed, finishReason, incomplete }).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE, AUDIT, PRIMARY],
    realWorldImpact: "某天有人在 callNemesisModel 内部加 debug 字段, 没人察觉, audit 表里突然出现 API key, ops 才发现已经泄露几个月.",
    aiReviewRisk: "把 '多记一点' 当成审计友好, 忽略持久化是不可逆的.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "详细 = 危险, 字段必须白名单.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 ensureNemesisFoodVideoAttachment 删除",
    prompt: "AI 改坏: AI 觉得 'parseNemesisReply 已经收敛了, 白名单多余', 删了 ensureNemesisFoodVideoAttachment 直接用 parsed.attachments. 后果是?",
    options: [
      { id: "A", text: "模型被 prompt 注入后输出 'https://attacker.example/x.mp4', 渲染成外站视频, 触发钓鱼 / 跟踪 / 资源耗尽" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "parseNemesisReply 只做 JSON 解析, 不验证 URL 来源; 白名单是独立的边界, 删了等于开门.",
      detail: "parseNemesisReply 收到的是 string 解析结果, 它不知道哪些 URL 是安全的. ensureNemesisFoodVideoAttachment 是独立白名单层, 对照受控 video-catalog 过滤. 删了等于把'模型可输出任意 URL' 暴露给前端. 与 §11.3-6 同构: URL 必须走白名单 catalog, 不能信任模型字符串.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: REPLY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [REPLY, VIDEO, PRIMARY],
    realWorldImpact: "模型被注入返回 'https://attacker.example/track.mp4', 用户点击播放, 攻击者拿到 IP / 浏览器指纹 / XSS.",
    aiReviewRisk: "把'parse 已收敛'等同于'安全', 忽略白名单是独立边界.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 字段类型一致.",
      C: "简洁 = 失去白名单边界, 严重.",
      D: "有安全事件风险.",
    },
  }),
  // ─── 自由作答 (Q21-Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释端到端 5 道闸门",
    prompt: "用自己的话解释 api.nemesis 端到端的 5 道闸门设计: (1) 鉴权 (2) 校验 (3) 限流 (4) 守门 (5) 附件白名单. 这 5 道闸门如何共同防御 prompt 注入 / quota 滥用 / 资源耗尽 / 数据污染.",
    options: [],
    correctAnswer: {
      text: "5 道闸门端到端防御: (1) 鉴权: requireNemesisUser 把未登录请求挡在门外, 防止匿名调用消耗资源; (2) 校验: validateNemesisRequest 收敛 body + recentMessages, 防止客户端注入 50KB text / 伪造 role; (3) 限流: checkNemesisRateLimit minute + day 双层, 防止刷量打爆 Gemini / DeepSeek 配额; (4) 守门: guardNemesisMessage rule + Gemini 分类器, 拒绝不安全 prompt, 决定是否调主模型; (5) 附件白名单: ensureNemesisFoodVideoAttachment 过滤 video URL, 防止模型输出外链. 5 道顺序是工程优化 — 越靠前越便宜 (鉴权是 cookie 解析, 白名单是数组 contains), 越靠后越贵 (守门要调 Gemini, 主模型要调 Gemini / DeepSeek). 把限流挪后 = 攻击者打爆配额; 把白名单删 = 模型注入外链. 5 道缺一不可, 顺序也是设计.",
    },
    explanation: {
      short: "5 道闸门 + 顺序 = 防御深度 + 成本优化.",
      detail: "好的解释能联起 (1) 鉴权 (2) 校验 (3) 限流 (4) 守门 (5) 白名单, 并说明顺序的工程意义 (便宜在前). 这是端到端设计的核心.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 checkNemesisRateLimit 挪到 callNemesisModel 之后, 理由是 'action 顶部代码太多'. 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "限流必须早于守门 + 主模型, 否则被限流请求消耗 Gemini 分类器配额 + D1 audit 写入 + 守门 IO (timu.MD §11.3-1 经典反例). 限流 = 第一道闸门, 顺序是设计, 不是代码组织偏好. 请恢复限流到 action 顶部, 紧跟鉴权 + 校验之后.",
    },
    explanation: {
      short: "审查点: 限流是闸门位置, 不是代码组织偏好.",
      detail: "好的 review 指出 (1) 限流顺序的工程意义 (2) 时序反例 (3) 攻击者利用 (4) 给出明确恢复位置. 顶 5 道闸门是设计契约, PR 改顺序 = 改设计.",
    },
    abilityTags: ["backend.rateLimit", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, RATE],
  }),
];
