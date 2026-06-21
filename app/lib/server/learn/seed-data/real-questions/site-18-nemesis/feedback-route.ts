/**
 * Real questions for site-18-nemesis-api-chain / feedback-route.
 *
 * Anchor: remix/app/routes/api.nemesis-feedback.ts (整文件 126 行).
 * 学习目标: 旁路 API 路由,与主路由 api.nemesis 解耦,只接受登录用户提交反馈,
 * 写 D1 audit (recordNemesisFeedbackEvent),不调主模型,不走 SSE.
 *
 * 题目数: 22.
 *
 * 引用 recipe: nemesisAuditWaitUntil (§11.3-4 audit waitUntil 边界).
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { nemesisAuditWaitUntil } from "../recipes";

const PRIMARY = "app/routes/api.nemesis-feedback.ts";
const GUARD_EVENTS = "app/services/nemesis-guard-events.server.ts";
const NEMESIS_AUTH = "app/services/nemesis-auth.server.ts";
const TOUCHED = [PRIMARY, GUARD_EVENTS, NEMESIS_AUTH];

export const feedbackRouteQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 feedback API 角色",
    prompt: "api.nemesis-feedback.ts 的角色是?",
    options: [
      { id: "A", text: "用户对 Nemesis 回复的反馈入口, 旁路写 D1 audit, 不调主模型不走 SSE" },
      { id: "B", text: "主模型生成入口" },
      { id: "C", text: "守门分类器" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "feedback 路由是 audit 旁路: 接受用户反馈, 写 D1, 不调主模型.",
      detail: "api.nemesis-feedback 仅做一件事 — 接收用户对某条 assistant 回复的评价 (hallucination / persona_mismatch 等), 配合 conversationId / messageId 写入 D1 audit, 让管理员能基于真实样本回顾 prompt / model. 它与 api.nemesis (主模型) 完全解耦, 没有 SSE 没有模型调用.",
    },
    abilityTags: ["bridge.reactRouter.action", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 method 限制",
    prompt: "request.method !== 'POST' 时返回?",
    options: [
      { id: "A", text: "405 Method not allowed, NO_STORE_HEADERS" },
      { id: "B", text: "200 OK" },
      { id: "C", text: "404" },
      { id: "D", text: "继续处理" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "feedback 仅 POST, 其他方法 405 + no-store.",
      detail: "L66-68: GET / PUT 等返回 405 Method not allowed. 反馈是 mutation, 必须 POST. NO_STORE_HEADERS 防止 CDN 把错误响应缓存.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 鉴权方式",
    prompt: "feedback 路由的鉴权?",
    options: [
      { id: "A", text: "requireNemesisUser(request), 失败时把 Response 转成中文 401 错误 + NO_STORE_HEADERS" },
      { id: "B", text: "无鉴权, 公开 API" },
      { id: "C", text: "只校验 cookie" },
      { id: "D", text: "Bearer token" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "requireNemesisUser; throw Response 时统一返回 '请先登录后再提交反馈。'",
      detail: "L70-79: try requireNemesisUser, 它在未登录时 throw Response(401/403). 路由 catch 把它包装成可读 JSON 错误 + 复用原 status, 既保留 HTTP 语义又给前端友好文案. 非 Response 错误重新 throw, 让 entry.server 兜底.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, NEMESIS_AUTH],
  }),
  q({
    type: "single_choice",
    title: "Q4 FEEDBACK_CATEGORIES 集合",
    prompt: "FEEDBACK_CATEGORIES 包含哪些值?",
    options: [
      { id: "A", text: "hallucination / contradiction / persona_mismatch / low_quality / unsafe / other" },
      { id: "B", text: "good / bad" },
      { id: "C", text: "any string" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "6 类: hallucination / contradiction / persona_mismatch / low_quality / unsafe / other.",
      detail: "L12-19: 受控集合用 Set<NemesisFeedbackCategory>. 任何不在集合内的输入都被 normalizeCategory 收敛到 'other', 防止前端塞入任意 string 污染 D1 audit 维度.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q5 MAX_TEXT_LENGTH",
    prompt: "MAX_TEXT_LENGTH / MAX_NOTE_LENGTH 含义?",
    options: [
      { id: "A", text: "MAX_TEXT_LENGTH=4000 (用户消息 / 助手消息上限), MAX_NOTE_LENGTH=1000 (反馈备注上限)" },
      { id: "B", text: "都是 100" },
      { id: "C", text: "无" },
      { id: "D", text: "未设上限" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "正文 4000, 备注 1000, slice 截断而非拒绝.",
      detail: "L10-11: 通过 asTrimmedString(value, maxLength) slice 截断超长. 选择 slice 而非 reject 是 UX 取舍 — 用户写了 5000 字反馈不希望全废,只截前 1000 字写 audit 即可.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 FeedbackRecentMessage 字段",
    prompt: "FeedbackRecentMessage 类型?",
    options: [
      { id: "A", text: "{ role: 'user' | 'model'; text: string }, 只保留 2 个字段" },
      { id: "B", text: "和 Message 一样,完全兼容前端" },
      { id: "C", text: "{ id; role; content; timestamp; attachments }" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "feedback 上下文只要 role + text,不复用前端 Message 全字段.",
      detail: "L21-24: audit 关心的是'哪段对话引发了反馈',不需要 attachments / id / timestamp. 字段最小化既减小 D1 行体积, 也避免把客户端不可信字段写入 audit (例如假 id / 篡改的 attachments).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  // ─── 代码阅读 (Q7-Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: 鉴权 try/catch",
    prompt: "下面哪一行展示了'把 throw 的 Response 转成 401 中文文案'这一关键模式?",
    code: `1 export async function action({ request }: ActionFunctionArgs) {
2   if (request.method !== "POST") {
3     return json({ error: "Method not allowed" }, { status: 405, headers: NO_STORE_HEADERS });
4   }
5
6   let user;
7   try {
8     user = await requireNemesisUser(request);
9   } catch (error) {
10    if (error instanceof Response) {
11      return json({ error: "请先登录后再提交反馈。" }, { status: error.status, headers: NO_STORE_HEADERS });
12    }
13
14    throw error;
15  }`,
    options: [],
    linePickLines: [
      { id: "L8", lineNumber: 8, text: "user = await requireNemesisUser(request);" },
      { id: "L11", lineNumber: 11, text: 'return json({ error: "请先登录后再提交反馈。" }, { status: error.status, headers: NO_STORE_HEADERS });' },
      { id: "L14", lineNumber: 14, text: "throw error;" },
    ],
    correctAnswer: { lineId: "L11" },
    explanation: {
      short: "L11 把 Response throw 转成 JSON 错误 + 中文文案 + NO_STORE.",
      detail: "L8 触发, L10 守卫 instanceof Response, L11 是关键转换 — 复用原 status (401/403) 但响应体改成可读中文 + no-store. L14 处理非 Response 错误, 让 entry.server 兜底以保留 stack trace.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 body 解析失败时",
    prompt: "await request.json() throw 时的处理?",
    options: [
      { id: "A", text: "catch 后返回 400 '请求格式错误。' + NO_STORE_HEADERS" },
      { id: "B", text: "let crash, 让 entry.server 兜底" },
      { id: "C", text: "重试" },
      { id: "D", text: "返回 200" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "L82-86: 显式 catch JSON 解析错, 返回 400.",
      detail: "request.json() 在非法 JSON 时 throw, 必须显式 catch — 否则 5xx 会被记成服务器错误而不是客户端错误. 同时 ! body || typeof body !== 'object' 双重守卫 (null / 数组 / 数字 等合法 JSON 但非对象的输入).",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q9 必填字段守卫",
    prompt: "L93-97 检查 message + assistantMessage 都非空, 任一为空时返回 ___ 状态码 + 中文错误.",
    options: [],
    correctAnswer: { values: { v: "400" } },
    blanks: [{ id: "v", placeholder: "状态码", acceptedAnswers: ["400", "400 Bad Request"] }],
    explanation: {
      short: "缺 message / assistantMessage 时 400 + '反馈需要包含用户问题和 Nemesis 回复。'",
      detail: "feedback 必须有用户原话 + 助手原话才有 audit 价值, 缺任一都是 client error 400. 不是 422 因为这是必填字段缺失而非语义错误.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 normalizeRecentMessages 行为",
    prompt: "normalizeRecentMessages 做了什么? (多选)",
    options: [
      { id: "A", text: "Array.isArray 不通过返回 []" },
      { id: "B", text: "value.slice(-10) 只取最后 10 条" },
      { id: "C", text: "role !== 'user' && role !== 'model' 时丢弃" },
      { id: "D", text: "text 用 asTrimmedString(record.text, 1000) 截到 1000" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "类型守卫 + slice -10 + role 白名单 + text 1000 截断 + filter null.",
      detail: "L41-63 五重收敛: (1) 非数组返回 []; (2) 只取最后 10 条防 50KB 注入; (3) role 必须是 user / model; (4) text 必须非空且 ≤1000; (5) filter Boolean 把 null 项剔掉. 客户端 localStorage 不可信, 这是必经收敛.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 modelResult 字段来源",
    prompt: "recordNemesisFeedbackEvent 里 modelResult.{provider, route, model, fallbackUsed, finishReason, incomplete} 来自?",
    options: [
      { id: "A", text: "前端传入的 record.modelProvider 等, 经 optionalString / typeof boolean 收敛" },
      { id: "B", text: "服务端重新调主模型获取" },
      { id: "C", text: "硬编码常量" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "前端把 SSE done 里的公开字段回传, 服务端只做收敛.",
      detail: "L110-117: 主路由 done 事件返回 modelProvider / modelRoute / modelName / fallbackUsed 等公开字段, 前端收到后存在 message 上, 提交反馈时回传. 路由用 optionalString / typeof boolean 收敛, 把任何非法值变 null. 这避免重调主模型 (省钱 + 真实还原当时上下文).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, GUARD_EVENTS],
  }),
  // ─── 状态推理 (Q12-Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 完整成功路径",
    prompt: "用户登录后提交合法 feedback, 完整路径?",
    options: [
      { id: "method", text: "method=POST 通过守卫" },
      { id: "auth", text: "requireNemesisUser 返回 user" },
      { id: "json", text: "request.json() 成功" },
      { id: "validate", text: "message + assistantMessage 都非空" },
      { id: "normalize", text: "normalizeRecentMessages / Category / optional 字段" },
      { id: "record", text: "await recordNemesisFeedbackEvent(...)" },
      { id: "ok", text: "return json({ ok: true }, JSON_NO_STORE_HEADERS)" },
    ],
    correctAnswer: { pathIds: ["method", "auth", "json", "validate", "normalize", "record", "ok"] },
    explanation: {
      short: "method → auth → json → validate → normalize → record → ok.",
      detail: "线性管道, 每一步失败都早返回. record 用 await (非 waitUntil) 因为 feedback 写失败必须让用户看到错误而不是 fire-and-forget — 与守门 audit 的 waitUntil 设计相反, 因为业务语义不同 (feedback 失败 = 用户行为没生效).",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, GUARD_EVENTS],
  }),
  q({
    type: "branch_trace",
    title: "Q13 未登录路径",
    prompt: "未登录用户提交 feedback, 路径?",
    options: [
      { id: "method", text: "method=POST 通过" },
      { id: "auth-throw", text: "requireNemesisUser throw Response(401)" },
      { id: "catch", text: "catch 中 error instanceof Response = true" },
      { id: "401-json", text: "返回 json({ error: '请先登录后再提交反馈。' }, status=401)" },
    ],
    correctAnswer: { pathIds: ["method", "auth-throw", "catch", "401-json"] },
    explanation: {
      short: "method → auth throw → catch Response → 401 中文 JSON.",
      detail: "throw Response 是 RR 的标准早返回模式. 这里 catch 后包装成 JSON 是 (1) 给 SPA fetch 一致结构 (2) 把 'no-store' 写明确, 防止 401 被 CDN 错缓存.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, NEMESIS_AUTH],
  }),
  q({
    type: "single_choice",
    title: "Q14 await record 的语义选择",
    prompt: "为什么 feedback 写 D1 用 await 而不是 ctx.waitUntil?",
    options: [
      { id: "A", text: "feedback 写失败 = 用户行为没生效, 必须给用户错误反馈; 与守门 audit (事后分析, 可 waitUntil) 业务语义不同" },
      { id: "B", text: "Worker 不支持 waitUntil" },
      { id: "C", text: "feedback 写很快不需要 waitUntil" },
      { id: "D", text: "没区别" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "feedback 是关键正确性 (失败必须告诉用户), 守门 audit 是事后分析.",
      detail: "守门 audit 用 ctx.waitUntil 是因为它失败不影响主响应正确性 — 用户拿到回复就完成了交互. feedback 提交是主响应本身, await 让前端按 ok / error 区分 toast. 这正是 §11.3-4 的 '业务判断' 而非死记.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, GUARD_EVENTS],
  }),
  q({
    type: "single_choice",
    title: "Q15 GET loader 用途",
    prompt: "L123-125 export loader 的作用?",
    options: [
      { id: "A", text: "GET 时返回 { message: 'Nemesis feedback API', method: 'POST' } + JSON_NO_STORE — 自描述路由用途" },
      { id: "B", text: "服务端预渲染" },
      { id: "C", text: "fetch 缓存" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "loader 给 GET 提供自描述响应, 同时显式声明 no-store.",
      detail: "RR 7 默认 GET 走 loader, 不写就 405. 这里写一个最小 loader 既避免噪音 405, 又给开发者 / 健康检查 / 工具浏览时一个'此路由用 POST'的自描述. JSON_NO_STORE_HEADERS 防止 GET 响应被 CDN 误缓存.",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  // ─── AI 改坏 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把 feedback 路由也加上 SSE",
    prompt: "AI 改坏: AI 觉得 'feedback 也应该有进度感',改成 createNemesisSseResponse + emit 多次状态. 后果是?",
    options: [
      { id: "A", text: "毫无意义的复杂度 — feedback 是单次 D1 insert 不需要流式; SSE 反而让前端必须解析 event-stream, 且 audit 写失败的错误处理被吞" },
      { id: "B", text: "更现代" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "feedback 是 mutation 而非长任务, SSE 是过度工程, 还吞错误.",
      detail: "SSE 用于流式 token / 长任务进度, feedback 是 50ms 级 D1 insert. 改成 SSE 后: (1) 前端从 fetch().then(json) 改成 ReadableStream 解析; (2) createNemesisSseResponse 的 catch 把任何错误都 emit 'error' event, status 永远是 200, 客户端无法用 status 判断成功; (3) 前端 audit toast 逻辑全部需要重写.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "feedback 提交失败时前端不知道, 用户重复点击, audit 表写空记录.",
    aiReviewRisk: "把 SSE 当成 '现代 API 标配', 没区分流式 vs mutation 的语义.",
    wrongAnswerFeedback: {
      B: "现代 ≠ 更好, SSE 是工具不是徽章.",
      C: "TS 不会报错.",
      D: "改流式后错误处理路径完全变, 影响很大.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 删除 normalizeRecentMessages 直接落库",
    prompt: "AI 改坏: AI 觉得 'normalize 麻烦' 直接 record.recentMessages 写入 audit. 后果是?",
    options: [
      { id: "A", text: "客户端不可信输入直接落 D1: 50KB 注入 / 假 role / 任意字段, audit 维度被污染, D1 行体积爆炸" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更快" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "客户端 array 必须收敛: -10 / role 白名单 / 1000 截断 / filter null.",
      detail: "audit 表是查询基线, 一旦写入 50KB 长 text / 伪造 role='system' / 嵌套对象 等脏数据, (1) 后续聚合查询全乱 (2) D1 行大小超限 / 性能下降 (3) 审计失去可信度. normalize 是结构化日志的入口纪律.",
    },
    abilityTags: ["ai.review.architecture", "backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "管理员看 audit, 看到 role='admin' / text 50KB / 嵌套对象, 判断不出真实分布.",
    aiReviewRisk: "把客户端数组当可信输入, 等于把 SQL 注入面打开.",
    wrongAnswerFeedback: {
      B: "TS 不会报, recentMessages 类型是 unknown 后由 record.recentMessages 透传.",
      C: "省去几行代码不是工程优化.",
      D: "数据可信度受重伤.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 await record 改 ctx.waitUntil",
    prompt: nemesisAuditWaitUntil({
      lessonSlug: "feedback-route",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 17,
      primaryFile: PRIMARY,
    }).prompt,
    options: nemesisAuditWaitUntil({
      lessonSlug: "feedback-route",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 17,
      primaryFile: PRIMARY,
    }).options,
    correctAnswer: nemesisAuditWaitUntil({
      lessonSlug: "feedback-route",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 17,
      primaryFile: PRIMARY,
    }).correctAnswer,
    explanation: nemesisAuditWaitUntil({
      lessonSlug: "feedback-route",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 17,
      primaryFile: PRIMARY,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, GUARD_EVENTS],
    realWorldImpact: "feedback 接口对'失败必须可见'的语义敏感, 一刀切 fire-and-forget 让用户看到 ok 实际写库失败.",
    aiReviewRisk: "把 audit 一律 ctx.waitUntil 而不分场景, 忽略 feedback 是关键正确性.",
    wrongAnswerFeedback:
      nemesisAuditWaitUntil({
        lessonSlug: "feedback-route",
        courseSlug: "site-18-nemesis-api-chain",
        orderIndex: 17,
        primaryFile: PRIMARY,
      }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q19 AI 把 user.id 替换成前端传入的 conversationId",
    prompt: "AI 改坏: AI 把 recordNemesisFeedbackEvent({ userId: user.id, ... }) 改成 userId: record.userId. 后果是?",
    options: [
      { id: "A", text: "用户身份被前端伪造, 任何登录用户都能伪造他人 feedback, audit 完全不可信" },
      { id: "B", text: "更灵活" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "用户身份必须来自服务端会话, 不能信任客户端字段.",
      detail: "requireNemesisUser 返回的 user 是从 cookie/session 解析出的可信身份. 用 record.userId 等于把鉴权废了 — 攻击者可以伪造任意 userId 提交 feedback, audit 表里出现的'某 user 抱怨' 实际是攻击者写的. 服务端身份和服务端输入是两个边界.",
    },
    abilityTags: ["backend.auth.required", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, NEMESIS_AUTH, GUARD_EVENTS],
    realWorldImpact: "攻击者批量 POST feedback 伪造 userId='admin@example.com', 把竞品账号的 audit 维度全部带歪.",
    aiReviewRisk: "把 'userId 在 body 里' 当成 REST 习惯, 忽略服务端会话才是身份的真实来源.",
    wrongAnswerFeedback: {
      B: "灵活 = 可伪造, 灾难.",
      C: "TS 不会报错.",
      D: "audit 不可信, 安全事件.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 feedback 写入合并到 api.nemesis 主路由",
    prompt: "AI 改坏: AI 觉得 '两个路由太多' 把 feedback 逻辑塞进 api.nemesis 主路由, 通过 body.kind === 'feedback' 分流. 后果是?",
    options: [
      { id: "A", text: "破坏 route contract: 主路由变成多职责, SSE 和 JSON 响应混合, 限流共用让正常聊天与反馈互相挤占额度" },
      { id: "B", text: "更简洁" },
      { id: "C", text: "更快" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "feedback 与主调用是不同路由契约 (响应类型 / 限流维度 / 审计字段), 合并破坏单一职责.",
      detail: "api.nemesis 是 SSE + 主模型 + 重限流; api.nemesis-feedback 是 JSON + 仅写 D1 + 轻量限流. 合并后 (1) 响应类型靠 body.kind 分流容易写错 (2) 主路由的 checkNemesisRateLimit 把 feedback 流量也卡进 minute/day 配额, 用户提交反馈被限流 (3) audit 字段含义混淆.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/routes/api.nemesis.ts"],
    realWorldImpact: "用户反馈被主限流卡住; SSE 响应类型在 JSON 路径上抛错; audit 字段冲突.",
    aiReviewRisk: "为'文件少'破坏路由职责边界, 实际反而难维护.",
    wrongAnswerFeedback: {
      B: "简洁 ≠ 合并不同契约.",
      C: "性能差异不是问题.",
      D: "限流冲突立即影响用户.",
    },
  }),
  // ─── 自由作答 (Q21-Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释为什么 feedback 单独成路由",
    prompt: "用自己的话说明 (1) 为什么 feedback 是单独 api.nemesis-feedback 而不是合并到 api.nemesis (2) 为什么用 await 而不是 ctx.waitUntil (3) 为什么 modelResult 字段从前端回传而不是服务端重算.",
    options: [],
    correctAnswer: {
      text: "(1) 路由契约不同: 主路由是 SSE + 重限流 + 主模型调用, feedback 是 JSON + 轻限流 + 仅写 D1, 合并会让响应类型靠 body.kind 分流且共享限流配额, 互相挤占. (2) feedback 写失败 = 用户行为没生效, 必须 await 拿到 ok 后才能给前端 toast 成功; ctx.waitUntil 是 fire-and-forget, 守门 audit 是事后分析适用, feedback 不适用. (3) modelResult 是 SSE done 事件返回到前端的公开字段 (provider/model/route/...), 前端缓存到 message 上提交反馈时回传; 服务端重算需要再调一次主模型, 浪费 quota 而且无法还原'当时那一次' 的随机性 — 反馈的价值就在'锚定那一次回复'.",
    },
    explanation: {
      short: "三件事一个主题: 单一职责 + 关键正确性 + 锚定原始上下文.",
      detail: "好的解释能联起 (1) 路由职责分离 (2) await 与 waitUntil 业务取舍 (3) audit 锚定真实上下文. 三件事共同保证 feedback 是可信、可见、可还原的.",
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
    prompt: "PR 把 normalizeRecentMessages 直接换成 record.recentMessages 透传, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "客户端 recentMessages 不可信 (localStorage 可被篡改), 必须经 normalizeRecentMessages 走 -10 截断 / role 白名单 / text 1000 收敛 / filter null. 直接透传等于把任意 50KB 注入 / 伪造 role / 嵌套对象 写入 D1 audit, 维度被污染、行体积爆炸、审计失去可信度. 请保留 normalize 调用.",
    },
    explanation: {
      short: "审查点: 客户端数组必须收敛, 不能信任.",
      detail: "好的 review 指出 (1) 客户端不可信 (2) 收敛 4 项 (3) 落 D1 后果 (4) 给出明确保留方向.",
    },
    abilityTags: ["ai.review.architecture", "backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
];
