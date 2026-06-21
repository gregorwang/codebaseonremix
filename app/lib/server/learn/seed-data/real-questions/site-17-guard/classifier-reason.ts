/**
 * Real questions for site-17-guard / classifier-reason.
 *
 * Anchor: remix/app/services/nemesis-guard.server.ts GuardDecision.classifierReason +
 *          api.nemesis.ts L60-87 (guard 调用 + debug log + emit status).
 * 学习目标: guard.classifierReason 字段处理 — 内部审计用, 不返回前端.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: nemesisClassifierReasonLeak (§11.3-3) — 直接相关.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { nemesisClassifierReasonLeak } from "../recipes";

const PRIMARY = "app/services/nemesis-guard.server.ts";
const ROUTE = "app/routes/api.nemesis.ts";
const TOUCHED = [PRIMARY, ROUTE];

export const classifierReasonQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 classifierReason 含义",
    prompt: "GuardDecision.classifierReason 字段含义?",
    options: [
      { id: "A", text: "Gemini 分类器返回的内部理由 (e.g. 'prompt 包含注入关键词 X'), 仅审计用, 不返回前端" },
      { id: "B", text: "前端显示" },
      { id: "C", text: "随机" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "classifierReason 是 Gemini 分类器返回的内部理由, 仅审计用, 不返回前端.",
      detail: "classifierReason 包含分类器内部判断依据, 暴露给前端会泄露安全分类规则, 让用户反向调 prompt. 审计用, 不进 public 响应.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 classifierReason 存放位置",
    prompt: "classifierReason 在 GuardDecision 哪里?",
    options: [
      { id: "A", text: "字段, 与 mode / category / stage / classifierConfidence 平级" },
      { id: "B", text: "嵌套" },
      { id: "C", text: "全局" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "classifierReason 是 GuardDecision 顶层字段, 与 mode / category 平级.",
      detail: "guard.classifierReason 顶层访问, 与 classifierConfidence / classifierVersion 平级. 是 audited metadata 的一部分, audit 阶段 (recordNemesisGuardEvent) 整条决策写到 D1.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 classifierReason 流向",
    prompt: "classifierReason 在 api.nemesis.ts 哪里被使用?",
    options: [
      { id: "A", text: "dev 环境的 console.log, audit record, 不进 emit status / done 事件" },
      { id: "B", text: "前端" },
      { id: "C", text: "无" },
      { id: "D", text: "随机" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "classifierReason 用于 dev console.log 与 audit 记录, 不进 SSE emit status / done 事件.",
      detail: "api.nemesis.ts L62-74 在 dev 环境 console.log 整条 guard 决策 (含 classifierReason), 用于本地调试. L107 recordAudit 写到 D1. emit status 用 mode / stage / label 等公开字段, classifierReason 不进.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ROUTE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, ROUTE],
  }),
  q({
    type: "fill_blank",
    title: "Q4 classifierReason 类型",
    prompt: "classifierReason 字段类型? (string | undefined)",
    options: [],
    correctAnswer: { values: { v: "string | undefined" } },
    blanks: [{ id: "v", placeholder: "类型", acceptedAnswers: ["string | undefined", "string?", "string | undefined"] }],
    explanation: {
      short: "classifierReason 类型 string | undefined, RULE_GUARD 阶段可能没有.",
      detail: "RULE_GUARD 阶段 (空 / 超长) 不调 Gemini 分类器, classifierReason 是 undefined. GEMINI 阶段调过分类器, classifierReason 是 string. TS 用 string | undefined 收窄, 访问时 null check.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 classifierReason 内容",
    prompt: "classifierReason 可能包含? (多选)",
    options: [
      { id: "A", text: "'prompt 包含注入关键词'" },
      { id: "B", text: "'jailbreak pattern matched'" },
      { id: "C", text: "Gemini 分类器的内部推理摘要" },
      { id: "D", text: "前端用户输入" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "classifierReason 是 Gemini 分类器内部推理摘要, 包含分类依据, 不应暴露给前端.",
      detail: "Gemini 分类器返回的 reason 字段含分类依据 ('prompt 包含注入关键词 X', 'jailbreak pattern matched' 等), 帮助管理员审计. 用户输入 message 不在 reason 字段, 在 recordAudit 单独字段.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 mode 公开 vs classifierReason 内部",
    prompt: "mode 是公开字段, classifierReason 是内部字段, 区别?",
    options: [
      { id: "A", text: "mode 决定 UI 行为 (PASS_TO_GEMINI / CLARIFY / REFUSE), classifierReason 是分类依据, 两者粒度不同" },
      { id: "B", text: "无区别" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "mode 是粗粒度公开决策, classifierReason 是细粒度内部依据, 不同受众不同粒度.",
      detail: "mode (PASS_TO_GEMINI / CLARIFY / REFUSE) 是 4 个字面量, 用户能理解, 公开. classifierReason 是 Gemini 内部推理, 含分类关键词, 用户知道后能反向调 prompt, 内部. 不同受众不同粒度, 是审计设计原则.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: emit status detail",
    prompt: "emit('status', { step: 'guard', state: 'done', ... detail }) 出现在 api.nemesis.ts 哪一行?",
    code: `1 const guard = await guardNemesisMessage(cloudflare?.env ?? {}, validation.message, validation.recentMessages);
2 if (process.env.NODE_ENV !== "production") {
3   console.log("[NemesisGuard]", {
4     messageLength: validation.message.length,
5     recentMessageCount: validation.recentMessages.length,
6     recentRoles: validation.recentMessages.map((item) => item.role),
7     mode: guard.mode,
8     category: guard.category,
9     stage: guard.stage,
10    ruleId: guard.ruleId,
11    ruleName: guard.ruleName,
12    ruleStrength: guard.ruleStrength,
13    classifierLabel: guard.classifierLabel,
14    classifierConfidence: guard.classifierConfidence,
15    classifierReason: guard.classifierReason,
16    reason: guard.reason,
17  });
18 }
19
20 emit("status", {
21   step: "guard",
22   state: "done",
23   label: "安全判断完成",
24   mode: guard.mode,
25   detail:
26     guard.stage === "GEMINI"
27       ? \`Gemini 安全分类器 \${guard.classifierVersion ?? "gemini-v1"} · \${guard.mode}\`
28       : guard.stage === "RULE_GUARD"
29         ? "规则守卫"
30         : undefined,
31 });`,
    options: [],
    linePickLines: [
      { id: "L20", lineNumber: 20, text: "emit('status', {" },
      { id: "L21", lineNumber: 21, text: "step: 'guard'," },
      { id: "L25", lineNumber: 25, text: "detail:" },
      { id: "L27", lineNumber: 27, text: "guard.stage === 'GEMINI' ? \`Gemini 安全分类器 \${guard.classifierVersion ?? 'gemini-v1'} · \${guard.mode}\`" },
    ],
    correctAnswer: { lineId: "L20" },
    explanation: {
      short: "第 20 行 emit status, detail 只含 stage / version / mode, 不含 classifierReason.",
      detail: "emit('status', ...) 公开字段: step / state / label / mode / detail. detail 是 stage + version + mode 拼接的字符串, 故意不含 classifierReason. dev 环境 console.log 才打印 classifierReason.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ROUTE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, ROUTE],
  }),
  q({
    type: "single_choice",
    title: "Q8 classifierReason 写在哪里",
    prompt: "api.nemesis.ts L107 recordAudit(...) 把 guard 整条写入哪里?",
    options: [
      { id: "A", text: "D1 (recordNemesisGuardEvent), classifierReason 走 audit 表, 不进 SSE 事件" },
      { id: "B", text: "前端" },
      { id: "C", text: "console" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "recordAudit 把 guard 整条写 D1, classifierReason 走 audit 表, 不进 SSE 事件.",
      detail: "recordNemesisGuardEvent 接收 decision: guard 整条, 写到 D1 guard_event 表. 管理员可以查 D1 看 classifierReason, 但前端 SSE 事件拿不到. 关注点分离: 审计在 D1, 用户界面在 SSE.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ROUTE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, ROUTE, "app/services/nemesis-guard-events.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q9 modeReply 来自哪里",
    prompt: "getNemesisModeReply(guard.mode) 返回 NEMESIS_GUARD_FIXED_REPLIES[mode] 的来源?",
    options: [
      { id: "A", text: "app/nemesis/guard-replies.ts, 预写固定文案, 不调主模型" },
      { id: "B", text: "AI 动态生成" },
      { id: "C", text: "数据库" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "NEMESIS_GUARD_FIXED_REPLIES 来自 app/nemesis/guard-replies.ts 预写固定文案, 不调主模型.",
      detail: "拒绝 / 澄清时返回预写固定文案, 防止主模型看到分类上下文. 预写文案是项目可维护的常量, 管理员可以直接调整不需要重新训练模型.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/nemesis/guard-replies.ts"],
  }),
  q({
    type: "multi_choice",
    title: "Q10 emit done 字段",
    prompt: "api.nemesis.ts L131 emit('done', { text: modeReply, mode }) 字段? (多选)",
    options: [
      { id: "A", text: "text: modeReply (固定文案)" },
      { id: "B", text: "mode: guard.mode (CLARIFY / REFUSE)" },
      { id: "C", text: "classifierReason (公开?)" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "emit done 公开 text + mode, 不含 classifierReason.",
      detail: "emit('done', { text: modeReply, mode: guard.mode }) 只暴露固定文案 + mode, classifierReason 不进. 前端用户看到固定文案 + 拒因, 但看不到 Gemini 内部推理. 是公开 vs 内部粒度分离的设计.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ROUTE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, ROUTE],
  }),
  q({
    type: "single_choice",
    title: "Q11 console.log 触发条件",
    prompt: "if (process.env.NODE_ENV !== 'production') console.log('[NemesisGuard]', ...) 触发条件?",
    options: [
      { id: "A", text: "dev / staging 环境, 生产环境不打印防止泄露 classifierReason 到日志" },
      { id: "B", text: "always" },
      { id: "C", text: "随机" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "dev / staging 打印便于调试, 生产不打印防止 classifierReason 泄露到日志 (Workers logs 会被 Cloudflare 收集).",
      detail: "process.env.NODE_ENV !== 'production' 守卫, dev / staging 打印完整 guard 决策含 classifierReason, 生产不打印. 是'调试信息'与'生产日志'分离的设计, 防止敏感信息进 Cloudflare logs.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ROUTE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, ROUTE],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 PROMPT_EXTRACTION 完整路径",
    prompt: "Gemini 分类 PROMPT_EXTRACTION, classifierReason = 'prompt 包含注入关键词', 路径?",
    options: [
      { id: "classify", text: "Gemini 返回 mode=REFUSE, category=PROMPT_EXTRACTION, confidence=0.9, reason='prompt 包含注入关键词'" },
      { id: "route", text: "routeClassifierDecision 看到高置信度, 返回 REFUSE" },
      { id: "console", text: "dev 环境 console.log 整条, classifierReason 进 stdout" },
      { id: "audit", text: "recordAudit 写 D1, classifierReason 进 audit 表" },
      { id: "emit", text: "emit status / done 不含 classifierReason, 只发 mode + 固定文案" },
    ],
    correctAnswer: { pathIds: ["classify", "route", "console", "audit", "emit"] },
    explanation: {
      short: "Gemini 分类 → routeClassifier → dev console.log (含 reason) → recordAudit (D1) → emit status/done (不含 reason).",
      detail: "完整路径: Gemini 分类返回完整 reason → 路由判断 REFUSE → dev console.log 打印含 classifierReason → recordAudit 写 D1 audit 表 → emit SSE 事件只发 mode + 固定文案, classifierReason 不暴露给前端.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ROUTE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 production 环境 audit 失败",
    prompt: "production 环境, recordAudit 抛错 (D1 不可用), 行为?",
    options: [
      { id: "audit-throw", text: "recordAudit 内 .catch((error) => console.error(...)) 收下, 不冒到上层" },
      { id: "ctx-wait", text: "ctx.waitUntil(auditPromise) 异步执行, 不阻塞主响应" },
      { id: "user", text: "用户看到正常响应, 不感知 audit 失败" },
    ],
    correctAnswer: { pathIds: ["audit-throw", "ctx-wait", "user"] },
    explanation: {
      short: "audit 内部 .catch 收下 + ctx.waitUntil 异步, 不阻塞主响应.",
      detail: "recordAudit 内 .catch console.error 收下, 配合 ctx.waitUntil(auditPromise) 异步执行. audit 失败不影响主响应, 用户看到正常结果, 管理员可以从 console.error 看到 audit 失败率. 是 'audit 失败不应阻断主响应' 的设计.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ROUTE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, ROUTE],
  }),
  q({
    type: "single_choice",
    title: "Q14 NORMAL 消息的 classifierReason",
    prompt: "Gemini 分类 NORMAL 时, classifierReason 内容?",
    options: [
      { id: "A", text: "可能是 '正常对话' / 'user query is benign' / 类似的肯定判断" },
      { id: "B", text: "无" },
      { id: "C", text: "空" },
      { id: "D", text: "随机" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "NORMAL 时 classifierReason 包含分类器对正常对话的肯定判断, 例如 'user query is benign'.",
      detail: "Gemini 分类器对所有消息都返回 reason 字段, 包括 NORMAL. NORMAL 消息的 reason 是肯定判断 ('user query is benign' / 'no security concerns detected'), 让管理员审计时也能看到分类器如何判断正常消息.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 MODE_GUARD 时的 classifierReason",
    prompt: "RULE_GUARD 阶段 (超长 REFUSE) 时, classifierReason 是什么?",
    options: [
      { id: "A", text: "undefined, 因为没调 Gemini 分类器" },
      { id: "B", text: "空" },
      { id: "C", text: "无" },
      { id: "D", text: "随机" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "RULE_GUARD 阶段没调 Gemini, classifierReason 是 undefined, 字段类型 string | undefined 收窄.",
      detail: "RULE_GUARD 阶段直接规则判断, 没调 Gemini 分类器, classifierReason / classifierConfidence / classifierVersion 都是 undefined. TS 字段类型 string | undefined 收窄, audit 写 D1 时这些字段是 null.",
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
    title: "Q16 AI 把 classifierReason 暴露给前端",
    prompt: "AI 改坏: AI 觉得 '让用户知道为什么被拒' 把 guard.classifierReason 加进 emit status. 后果是? (timu.MD §11.3-3)",
    options: [
      { id: "A", text: "用户看到 Gemini 内部推理 'prompt 包含注入关键词 X', 立刻知道如何改写 prompt 绕过" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更友好" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "暴露 classifierReason 让用户知道分类依据, 反向调 prompt 绕过守门.",
      detail: "timu.MD §11.3-3 经典反例: 把 guard.classifierReason 返回给前端, 用户看到 'classifierReason: 你包含注入关键词 X' 之类字段, 立刻知道如何改写 prompt 绕过. 拒绝文案必须是预写 public 字符串, classifierReason 留在服务端日志.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROUTE,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, ROUTE],
    realWorldImpact: "用户看到分类器内部理由, 立刻知道如何改写 prompt 绕过, 严重时 Memory Canon 摘要外泄.",
    aiReviewRisk: "把内部审计字段当用户反馈字段处理, 破坏安全分层.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "暴露安全分类依据不是友好.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把 dev console.log 放到 production",
    prompt: "AI 改坏: AI 觉得 '调试需要' 把 console.log 守卫删掉, production 也打印. 后果是?",
    options: [
      { id: "A", text: "classifierReason 进 Cloudflare Workers logs, 可能被 Cloudflare 收集 / 第三方访问, 泄露分类依据" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更可观测" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "production 打印 classifierReason 进 Cloudflare logs, 可能被收集 / 第三方访问, 泄露分类依据.",
      detail: "Cloudflare Workers logs 是可观测性平台, 可能被 Cloudflare 自身或第三方 (e.g. logpush) 访问. classifierReason 包含分类关键词, 暴露后攻击者可分析分类器规则. 必须 NODE_ENV 守卫, dev / staging 打印, production 不打印.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROUTE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, ROUTE],
    realWorldImpact: "Workers logs 收集 classifierReason, 攻击者分析分类器规则, 针对性构造绕过 prompt.",
    aiReviewRisk: "把 dev 调试信息当通用日志, 泄露生产环境的分类依据.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "可观测性不应泄露敏感信息.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 recordAudit 改成同步 await",
    prompt: "AI 改坏: AI 觉得 'ctx.waitUntil 复杂' 改成 await recordAudit(...). 后果是?",
    options: [
      { id: "A", text: "audit 阻塞主响应, 用户等更久, D1 慢时整体延迟翻倍" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更可靠" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "await 阻塞主响应, D1 慢时整体延迟翻倍, 失去 audit 不阻断主响应的设计.",
      detail: "ctx.waitUntil(auditPromise) 让 audit 跑后台, 不阻塞主响应. 改成 await 让 audit 同步等, D1 慢时用户等更久. 是 'audit 是关键正确性 vs fire-and-forget' 的设计选择, 视业务定, 但很多场景 audit 不需要阻塞.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROUTE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [ROUTE],
    realWorldImpact: "D1 慢时主响应 p99 翻倍, 用户体验下降, 严重时守卫响应迟钝.",
    aiReviewRisk: "为'简单'改 await, 失去 ctx.waitUntil 的 fire-and-forget 设计.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "await 不一定更可靠, 取决于业务.",
      D: "有性能影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §11.3-3 分类器理由外泄",
    prompt: nemesisClassifierReasonLeak({
      lessonSlug: "classifier-reason",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).prompt,
    options: nemesisClassifierReasonLeak({
      lessonSlug: "classifier-reason",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).options,
    correctAnswer: nemesisClassifierReasonLeak({
      lessonSlug: "classifier-reason",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: nemesisClassifierReasonLeak({
      lessonSlug: "classifier-reason",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROUTE,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [ROUTE, PRIMARY],
    realWorldImpact: "用户前端弹窗显示 '为什么被拒绝: prompt 包含注入关键词 X', 立刻知道如何改写绕过.",
    aiReviewRisk: "把内部审计字段当用户反馈字段处理, 破坏安全分层.",
    wrongAnswerFeedback: nemesisClassifierReasonLeak({
      lessonSlug: "classifier-reason",
      courseSlug: "site-17-guards-rate-limit",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 modeReply 改 AI 生成",
    prompt: "AI 改坏: AI 觉得 '固定文案不灵活' 改成 REFUSE 时调主模型生成'更自然的拒绝文案'. 后果是? (timu.MD §11.3-2)",
    options: [
      { id: "A", text: "主模型看到 guard.classifierReason / 内部提示 / Memory Canon, 把敏感上下文写进'自然'文案返回前端" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更灵活" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "主模型看到分类上下文, 写进'自然'文案返回前端, 严重泄露 guard 内部信息.",
      detail: "timu.MD §11.3-2 经典反例: 主模型一旦看到 guard.classifierReason / 内部提示 / Memory Canon, 就有可能把敏感上下文写进'自然'文案返回前端, 直接破坏安全边界. 拒绝必须走预写文案.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis.server.ts"],
    realWorldImpact: "用户在前端看到分类器内部理由, 反向调 prompt 绕过安全规则.",
    aiReviewRisk: "把拒绝处理当成'文学生成任务', 失去安全事件严肃性.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "主模型看到分类上下文不是灵活.",
      D: "有严重安全影响.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 classifierReason 的公开 vs 内部粒度分离",
    prompt: "用自己的话解释 classifierReason 字段为什么必须 server-internal only, 不能进 SSE 事件, 但要走 dev console.log + recordAudit D1.",
    options: [],
    correctAnswer: {
      text: "classifierReason 是 Gemini 分类器的内部推理, 含分类关键词 ('prompt 包含注入关键词 X' 等), 用户看到后能反向调 prompt 绕过. 必须 server-internal only: (1) 不进 SSE 事件: 前端用户看到拒绝文案 + mode, 不知道分类依据. (2) 进 dev console.log: 方便本地调试, 看到分类器如何判断. (3) 不进 production console.log: 防止 Cloudflare logs 收集分类依据. (4) 进 recordAudit D1: 管理员从 D1 查分类依据, 调整守门规则 / 分类器 prompt. 三层粒度分离: 前端用户 / 开发者 / 管理员各自看到合适粒度.",
    },
    explanation: {
      short: "三层粒度: 前端用户 (无) / 开发者 (dev console) / 管理员 (D1 audit).",
      detail: "classifierReason 设计核心是'不同受众不同粒度', 安全分类依据不暴露给攻击面, 开发者与管理员各自看到需要的粒度.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: ROUTE,
    layer: "free-response",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, ROUTE],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 guard.classifierReason 加进 emit status, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "classifierReason 是 Gemini 分类器内部推理, 含分类关键词, 用户看到后能反向调 prompt 绕过守门 (timu.MD §11.3-3 经典反例). 必须保持 server-internal only, SSE 事件只发 mode + 固定文案, classifierReason 走 dev console.log + recordAudit D1. 这条 PR 直接暴露安全分类规则, 必须回退.",
    },
    explanation: {
      short: "审查点: classifierReason 不可进 SSE, 是 server-internal only.",
      detail: "好的 review 指出 (1) timu.MD §11.3-3 反例 (2) 三层粒度分离 (3) 实际绕过攻击路径 (4) 给出明确回退.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROUTE,
    layer: "free-response",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, ROUTE],
  }),
];
