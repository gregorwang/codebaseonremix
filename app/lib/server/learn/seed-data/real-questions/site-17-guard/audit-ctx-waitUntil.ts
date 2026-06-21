/**
 * Real questions for site-17-guard / audit-ctx-waitUntil.
 *
 * Anchor: remix/app/routes/api.nemesis.ts L89-126 (recordAudit 闭包 + ctx.waitUntil) +
 *          remix/app/services/nemesis-guard-events.server.ts L115 (recordNemesisGuardEvent 写 D1).
 * 学习目标: ctx.waitUntil 让 audit 跑后台不阻塞主响应, shouldAudit 决定是否记,
 *          D1 写失败 catch 收下.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: nemesisAuditWaitUntil (§11.3-4) — 直接相关.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { nemesisAuditWaitUntil } from "../recipes";

const PRIMARY = "app/routes/api.nemesis.ts";
const EVENTS = "app/services/nemesis-guard-events.server.ts";
const TOUCHED = [PRIMARY, EVENTS, "app/services/nemesis-guard.server.ts"];

export const auditCtxWaitUntilQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 ctx.waitUntil 作用",
    prompt: "cloudflare?.ctx?.waitUntil(auditPromise) 作用?",
    options: [
      { id: "A", text: "让 audit Promise 跑在 Cloudflare Worker 后台, 不阻塞主响应, Worker 关闭后继续完成" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ctx.waitUntil 让 Promise 跑在 Worker 后台, 不阻塞主响应, Worker 关闭后继续完成.",
      detail: "Cloudflare Workers ctx.waitUntil 接收 Promise, 让 Worker 不立即关闭, 等待 Promise 完成. audit Promise 异步写 D1, 用户立即拿到响应, audit 在后台完成.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 shouldAudit 含义",
    prompt: "GuardDecision.shouldAudit 字段决定什么?",
    options: [
      { id: "A", text: "是否值得记到 D1 guard_event 表, true 时 recordAudit 才执行" },
      { id: "B", text: "前端" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "shouldAudit 决定是否值得记 D1, true 时 recordAudit 才执行, false 时跳过.",
      detail: "shouldAudit 是 audit 开关, NORMAL 消息不记 (量大, 没价值), REFUSE / CLARIFY / suspectedOverStrict 记. 控制 D1 写入量与管理员可读性.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis-guard.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q3 recordAudit 闭包设计",
    prompt: "api.nemesis.ts L89 recordAudit = (input: {...} = {}) => { ... } 设计目的?",
    options: [
      { id: "A", text: "闭包捕获 user / guard / cloudflare 等上下文, 多次调用复用, 不用每次传" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "闭包捕获 user / guard / cloudflare, 多次调用 (REFUSE 路径 / 主模型成功 / 异常) 复用上下文, 不用每次传.",
      detail: "recordAudit 是 IIFE-like 闭包, 捕获外层 user / guard / cloudflare / validation 等, 内部 recordNemesisGuardEvent 调用复用. 是 DRY 原则 + 关注点分离的设计.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 audit 表",
    prompt: "recordNemesisGuardEvent 写哪个 D1 表?",
    options: [],
    correctAnswer: { values: { v: "nemesis_guard_events" } },
    blanks: [{ id: "v", placeholder: "表名", acceptedAnswers: ["nemesis_guard_events", "nemesis_guard_events 表"] }],
    explanation: {
      short: "写 D1 表 nemesis_guard_events, 字段 user_id / mode / category / reason / metadata 等.",
      detail: "recordNemesisGuardEvent 内部 db.prepare INSERT INTO nemesis_guard_events, 字段覆盖整条 guard 决策含 classifierReason / ruleId / modelResult 等. 管理员从 D1 查询分析守门表现.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: EVENTS,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [EVENTS],
  }),
  q({
    type: "multi_choice",
    title: "Q5 recordAudit 调用点",
    prompt: "api.nemesis.ts 中 recordAudit 调用的位置? (多选)",
    options: [
      { id: "A", text: "L130 modeReply REFUSE 时 (拒绝路径)" },
      { id: "B", text: "L155 主模型成功后 (成功路径)" },
      { id: "C", text: "L170 catch (error) 异常路径" },
      { id: "D", text: "D1 写不进去" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "recordAudit 在 REFUSE / 主模型成功 / 异常三个路径都调用, 保证每条请求都有 audit 记录.",
      detail: "三条调用路径: (1) REFUSE 路径 (modeReply 触发) (2) 主模型成功路径 (parsed.text + result) (3) 异常路径 (error 兜底). 保证 audit 完整, 管理员可查每条请求的最终结果.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 shouldAudit 触发",
    prompt: "哪些情况下 shouldAudit = true?",
    options: [
      { id: "A", text: "REFUSE / CLARIFY / suspectedOverStrict / Gemini 失败 fallback / mode !== 'PASS_TO_GEMINI' 时" },
      { id: "B", text: "always" },
      { id: "C", text: "随机" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "REFUSE / CLARIFY / suspectedOverStrict / Gemini 失败 / mode !== 'PASS_TO_GEMINI' 都触发 shouldAudit = true.",
      detail: "shouldAudit 触发条件: (1) Gemini 失败 fallback (CLARIFY/UNKNOWN) (2) mode !== PASS_TO_GEMINI (REFUSE / CLARIFY) (3) suspectedOverStrict (边界 / 低置信). PASS_TO_GEMINI 正常路径不记, 控制 D1 量.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis-guard.server.ts"],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: ctx.waitUntil",
    prompt: "cloudflare?.ctx?.waitUntil(auditPromise) 出现在 api.nemesis.ts 哪一行?",
    code: `1 const recordAudit = (input: {...} = {}) => {
2   if (!guard.shouldAudit) {
3     return;
4   }
5
6   const auditPromise = recordNemesisGuardEvent({
7     userId: user.id,
8     userEmail: user.email,
9     message: validation.message,
10    assistantMessage: input.assistantMessage,
11    recentMessages: validation.recentMessages,
12    decision: guard,
13    modelResult: input.modelResult,
14  }).catch((error) => {
15    console.error("[NemesisGuardAudit] Failed to record event:", {
16      userId: user.id,
17      stage: guard.stage,
18      mode: guard.mode,
19      category: guard.category,
20      error,
21    });
22  });
23
24  cloudflare?.ctx?.waitUntil(auditPromise);
25 };`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "if (!guard.shouldAudit) {" },
      { id: "L3", lineNumber: 3, text: "return;" },
      { id: "L6", lineNumber: 6, text: "const auditPromise = recordNemesisGuardEvent({...}).catch(...)" },
      { id: "L24", lineNumber: 24, text: "cloudflare?.ctx?.waitUntil(auditPromise);" },
    ],
    correctAnswer: { lineId: "L24" },
    explanation: {
      short: "第 24 行 ctx.waitUntil(auditPromise), 让 audit 跑后台不阻塞主响应.",
      detail: "ctx.waitUntil 接收 auditPromise (已经 .catch 收下), Worker 等待 audit 完成才关闭. 用户立即拿到响应, audit 在后台完成. fire-and-forget 模式.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 audit catch 位置",
    prompt: "recordNemesisGuardEvent(...).catch((error) => { console.error(...) }) 的 catch 位置?",
    options: [
      { id: "A", text: "在 recordAudit 闭包内, 不让 audit 错误冒到 ctx.waitUntil" },
      { id: "B", text: "全局" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "catch 在 recordAudit 闭包内, 防止 audit 错误冒到 ctx.waitUntil.",
      detail: ".catch 收下 recordNemesisGuardEvent 抛错, console.error 记录, 不让 audit 错误冒到 ctx.waitUntil (虽然 ctx.waitUntil 接 Promise 也不会主动 throw, 但 catch 让代码意图更明确).",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 shouldAudit 早返回",
    prompt: "if (!guard.shouldAudit) return; 早返回的作用?",
    options: [
      { id: "A", text: "不调 recordNemesisGuardEvent, 不写 D1, 节省 D1 写入量" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "shouldAudit=false 时早返回, 不调 recordNemesisGuardEvent, 节省 D1 写入.",
      detail: "PASS_TO_GEMINI 正常路径 shouldAudit=false, 早返回, 不调 recordNemesisGuardEvent, 节省 D1 写入量与 ctx.waitUntil 调度. 大量正常对话不污染 D1.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 recordNemesisGuardEvent 字段",
    prompt: "recordNemesisGuardEvent INSERT 的字段? (多选相关)",
    options: [
      { id: "A", text: "user_id, user_email_masked (maskEmail 脱敏)" },
      { id: "B", text: "message, message_digest (createMessageDigest 摘要)" },
      { id: "C", text: "mode, category, stage, reason (guard 决策)" },
      { id: "D", text: "AI 写不进去" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "D1 字段含 user_id + email_masked + message + digest + mode/category/stage/reason 等完整 guard 决策.",
      detail: "recordNemesisGuardEvent INSERT 字段: user_id / user_email_masked (maskEmail 脱敏 email) / message / message_digest (HMAC 摘要) / stage / label / mode / category / rule_id / rule_strength / classifier_confidence / reason / suggested_change / model_* (modelResult) / assistant_message / recent_messages / metadata (JSON 字符串).",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: EVENTS,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [EVENTS],
  }),
  q({
    type: "single_choice",
    title: "Q11 maskEmail 作用",
    prompt: "maskEmail(input.userEmail) 把 email 脱敏, 例子?",
    options: [
      { id: "A", text: "alice@example.com → a***@example.com" },
      { id: "B", text: "无" },
      { id: "C", text: "随机" },
      { id: "D", text: "装饰" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "maskEmail 保留首字符 + domain, 中间用 ***, 防止审计表暴露完整 email.",
      detail: "alice@example.com → a***@example.com, 保留 prefix 首字符 + 完整 domain. 管理员从审计表能识别用户大群 (alice / bob), 但不能拿到完整 email 钓鱼. PII 脱敏标准模式.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: EVENTS,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [EVENTS],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 REFUSE 完整 audit 路径",
    prompt: "用户触发 PROMPT_EXTRACTION REFUSE, audit 完整路径?",
    options: [
      { id: "decision", text: "guard.mode='REFUSE', shouldAudit=true" },
      { id: "call", text: "recordAudit({ assistantMessage: modeReply }) 调用" },
      { id: "audit-write", text: "recordNemesisGuardEvent 调 db.prepare INSERT" },
      { id: "ctx-wait", text: "ctx.waitUntil(auditPromise), audit 跑后台" },
      { id: "user", text: "用户立即收到 emit done modeReply, audit 在后台完成" },
    ],
    correctAnswer: { pathIds: ["decision", "call", "audit-write", "ctx-wait", "user"] },
    explanation: {
      short: "decision → call → audit-write → ctx-wait → user 立即响应.",
      detail: "完整路径: guard REFUSE + shouldAudit=true → recordAudit 闭包调用 → recordNemesisGuardEvent 写 D1 → ctx.waitUntil(auditPromise) → 用户立即拿到 SSE done, audit 在后台完成 D1 写入.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 NORMAL 消息 audit 路径",
    prompt: "用户正常对话, NORMAL 消息, audit 路径?",
    options: [
      { id: "decision", text: "guard.mode='PASS_TO_GEMINI', shouldAudit=false (routeClassifierDecision 默认 PASS_TO_GEMINI 不 audit)" },
      { id: "early", text: "recordAudit 闭包首行 if (!guard.shouldAudit) return, 早返回" },
      { id: "no-d1", text: "不调 recordNemesisGuardEvent, 不写 D1, 不调 ctx.waitUntil" },
      { id: "user", text: "用户正常拿到主模型响应, 没有任何 audit 写入" },
    ],
    correctAnswer: { pathIds: ["decision", "early", "no-d1", "user"] },
    explanation: {
      short: "PASS_TO_GEMINI + shouldAudit=false → 早返回 → 不写 D1 → 用户无 audit 写入.",
      detail: "正常对话 NORMAL 消息 shouldAudit=false, recordAudit 早返回, 不写 D1, 节省 D1 写入量. 大量正常对话不污染 D1, 管理员查 D1 只看到 REFUSE / CLARIFY / 异常.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 audit 失败时",
    prompt: "D1 不可用, recordNemesisGuardEvent 抛错, 行为?",
    options: [
      { id: "A", text: ".catch((error) => console.error(...)) 收下, 用户正常拿到响应, audit 失败被记录到 console" },
      { id: "B", text: "整站 500" },
      { id: "C", text: "throw" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "audit 失败被 .catch 收下, 用户正常拿到响应, 失败进 console.error.",
      detail: "audit 失败是次要问题, 主响应不应该被 audit 拖死. .catch 收下 + console.error 让管理员看到 audit 失败率, 用户感知正常. 是 'audit 是 best-effort' 的设计.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q15 Cloudflare ctx 缺失时",
    prompt: "cloudflare 是 undefined (Worker 不在 CF 环境), ctx.waitUntil 行为?",
    options: [
      { id: "A", text: "ctx?.waitUntil 是可选链, undefined 不调 waitUntil, audit Promise 仍然异步跑 (没有 ctx 等待)" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "整站 500" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ctx?.waitUntil 可选链守 undefined, 不调用 waitUntil, audit Promise 仍然异步跑 (没 ctx 等待, 立即 fire-and-forget).",
      detail: "cloudflare?.ctx?.waitUntil(auditPromise) 是三层可选链, 任一 undefined 整段不执行. audit Promise 仍然被 .catch 包装, 即使没 ctx 等待也跑 (microtask 队列). 是 RR 7 Cloudflare preset 集成 + 防御性编程.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 ctx.waitUntil 改 await",
    prompt: "AI 改坏: AI 觉得 'ctx.waitUntil 复杂' 改成 await recordNemesisGuardEvent(...). 后果是? (timu.MD §11.3-4)",
    options: [
      { id: "A", text: "audit 变成主响应阻塞点, D1 慢时整体延迟翻倍, 用户等更久" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更可靠" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "audit 变成主响应阻塞点, D1 慢时整体延迟翻倍, 用户等更久.",
      detail: "ctx.waitUntil 是 fire-and-forget, audit 在后台跑不阻塞主响应. 改成 await 让 audit 同步等, D1 慢时用户等更久. timu.MD §11.3-4 强调'业务取舍, 不是死背': audit 关键正确性 → await, audit 只是事后分析 → ctx.waitUntil.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "D1 慢时主响应 p99 翻倍, 守卫响应迟钝, 严重时 audit 失败阻塞整个请求.",
    aiReviewRisk: "为'简单'改 await, 失去 ctx.waitUntil 的 fire-and-forget 设计.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "await 不一定更可靠, 取决于业务.",
      D: "有性能影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 删 shouldAudit 守卫",
    prompt: "AI 改坏: AI 觉得 'shouldAudit 复杂' 删 if (!guard.shouldAudit) return, 改成所有消息都记 audit. 后果是?",
    options: [
      { id: "A", text: "D1 写入量暴涨, 正常对话也写, D1 账单 + 管理员可读性双崩" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更全面" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "D1 写入量暴涨, 正常对话也写, D1 账单 + 管理员可读性双崩.",
      detail: "删 shouldAudit 守卫后, 正常对话也写 D1, D1 行数 = 用户消息数. 高频用户 1 天 1000 条, 1000 用户 100 万行, D1 账单 + 索引大小暴涨. 管理员查 D1 看到大量 PASS_TO_GEMINI 噪声, REFUSE / CLARIFY 真实审计被淹没.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, EVENTS],
    realWorldImpact: "D1 账单暴涨 + 索引慢 + 管理员查 D1 找不到关键审计.",
    aiReviewRisk: "为'全面'记所有消息, 失去 selective audit 设计.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "全面不是好, 噪声淹没关键审计.",
      D: "有性能与可读性影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 删 maskEmail 脱敏",
    prompt: "AI 改坏: AI 觉得 '脱敏影响调试' 直接 INSERT user_email 而不 maskEmail. 后果是?",
    options: [
      { id: "A", text: "审计表暴露完整 email, D1 一旦泄露 / Cloudflare logpush / 第三方访问, 用户被钓鱼" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更可调试" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "审计表暴露完整 email, 一旦泄露 (D1 logpush / 第三方访问 / 内部人员滥用), 用户被钓鱼.",
      detail: "审计表是 server-internal 存储, 完整 email 是 PII. 任何内部访问 (devops / 数据分析 / 审计人员) 都能看到完整 email. maskEmail 是 PII 脱敏标准, 防止审计表被滥用.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: EVENTS,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [EVENTS],
    realWorldImpact: "审计表泄露导致用户被定向钓鱼, 内部人员滥用, 违反 GDPR / CCPA.",
    aiReviewRisk: "为'调试方便'把 PII 暴露在审计表, 失去脱敏保护.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "调试方便不是泄露 PII 的理由.",
      D: "有合规与隐私影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §11.3-4 审计 waitUntil 边界",
    prompt: nemesisAuditWaitUntil({
      lessonSlug: "audit-ctx-waitUntil",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).prompt,
    options: nemesisAuditWaitUntil({
      lessonSlug: "audit-ctx-waitUntil",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).options,
    correctAnswer: nemesisAuditWaitUntil({
      lessonSlug: "audit-ctx-waitUntil",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: nemesisAuditWaitUntil({
      lessonSlug: "audit-ctx-waitUntil",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, EVENTS],
    realWorldImpact: "audit 阻塞主响应, 守卫延迟翻倍, 严重时 D1 故障导致整个请求挂死.",
    aiReviewRisk: "为'简单'改 await, 失去 ctx.waitUntil 的 fire-and-forget 设计.",
    wrongAnswerFeedback: nemesisAuditWaitUntil({
      lessonSlug: "audit-ctx-waitUntil",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 audit 改 fire-and-forget 不 .catch",
    prompt: "AI 改坏: AI 删 .catch 包装 recordNemesisGuardEvent, 直接 cloudflare?.ctx?.waitUntil(auditPromise). 后果是?",
    options: [
      { id: "A", text: "audit 抛错 (D1 不可用) 触发 unhandledRejection, Worker 报 unhandledRejection 警告" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "audit 抛错触发 unhandledRejection, Worker 报警告, audit 失败不静默.",
      detail: ".catch 包装是 Promise 错误处理的标准模式, 没有 .catch 抛错触发 unhandledRejection. Cloudflare Workers 会输出 'unhandled promise rejection' 警告, audit 失败信息丢失. 应该 .catch 记录 console.error.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, EVENTS],
    realWorldImpact: "audit 失败不静默, unhandledRejection 警告噪音, 管理员看不到具体 audit 失败原因.",
    aiReviewRisk: "为'简洁'删 .catch, 失去 Promise 错误处理.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "删 .catch 不是简洁.",
      D: "有可观测性损失.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 ctx.waitUntil + shouldAudit + .catch 三件套",
    prompt: "用自己的话解释 recordAudit 为什么必须 (1) shouldAudit 守卫 (2) .catch 包装 (3) ctx.waitUntil 异步, 各自防什么.",
    options: [],
    correctAnswer: {
      text: "(1) shouldAudit 守卫: PASS_TO_GEMINI 正常对话不写 D1, 控制 D1 写入量与管理员可读性, 防止噪声淹没关键审计. (2) .catch 包装: audit 抛错 (D1 不可用) 不触发 unhandledRejection, console.error 记录失败率, 不阻断主响应. (3) ctx.waitUntil 异步: audit 跑后台不阻塞主响应, 用户立即拿到 SSE done, D1 慢时主响应不受影响. 三件套围绕 'audit 是 best-effort + 不阻塞 + selective' 设计, 任何一项被删都破坏可观测性 / 性能 / 用户体验.",
    },
    explanation: {
      short: "三件套: selective + fire-and-forget + .catch.",
      detail: "三件套围绕 audit 设计的'三不原则': 不写噪声 / 不阻塞主响应 / 不抛错中断. 任何一项破坏都引入新问题.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, EVENTS],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 ctx.waitUntil(auditPromise) 改成 await recordNemesisGuardEvent(...), 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "audit 是 best-effort fire-and-forget, await 改成同步阻塞, D1 慢时主响应 p99 翻倍, 严重时 audit 失败阻塞整个请求 (timu.MD §11.3-4 强调业务取舍). 必须保留 ctx.waitUntil, audit 在后台跑, .catch 收下错误. 这条 PR 直接破坏守门响应延迟承诺.",
    },
    explanation: {
      short: "审查点: audit 必须 fire-and-forget, await 破坏主响应延迟.",
      detail: "好的 review 指出 (1) timu.MD §11.3-4 业务取舍 (2) await 实际后果 (3) ctx.waitUntil 设计意图 (4) 给出明确改法.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, EVENTS],
  }),
];
