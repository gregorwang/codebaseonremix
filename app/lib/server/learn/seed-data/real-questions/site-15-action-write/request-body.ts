/**
 * Real questions for site-15-action-write / request-body.
 *
 * Anchor: remix/app/services/nemesis-guard.server.ts L313-351 (validateNemesisRequest 内部
 *          request.json / try/catch / unknown 收窄).
 * 学习目标: Request body 解析模式 — json / text / formData / arrayBuffer, Content-Type,
 *          错误处理, unknown 收窄.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: nemesisLocalStorageUntrusted (§11.3-7) — 涉及 localStorage 注入与
 * normalizeRecentMessages 防御.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { nemesisLocalStorageUntrusted } from "../recipes";

const PRIMARY = "app/services/nemesis-guard.server.ts";
const ROUTE = "app/routes/api.nemesis.ts";
const TOUCHED = [PRIMARY, ROUTE];

export const requestBodyQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 request.json() 行为",
    prompt: "await request.json() 解析什么格式的 body?",
    options: [
      { id: "A", text: "Content-Type: application/json 的 JSON body, 解析为 unknown (TS 类型)" },
      { id: "B", text: "任何 body" },
      { id: "C", text: "string" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "request.json() 解析 application/json body, 返回 unknown.",
      detail: "Request.json() 是 Web 标准 API, 解析 Content-Type: application/json 的 body. 返回 Promise<any>, TS 4.4+ 用 unknown 强类型, 防止未收窄使用.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 request.json 抛错场景",
    prompt: "request.json() 抛什么错?",
    options: [
      { id: "A", text: "SyntaxError, 当 body 不是合法 JSON" },
      { id: "B", text: "TypeError" },
      { id: "C", text: "无" },
      { id: "D", text: "随机" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SyntaxError, body 不是合法 JSON 时抛错.",
      detail: "JSON.parse 失败抛 SyntaxError, request.json() 内部调用 JSON.parse, 因此抛 SyntaxError. 项目用 try/catch 收下, 返回 400 '请求格式错误'.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 Request body 解析 API",
    prompt: "Request 标准 body 解析 API 不包括?",
    options: [
      { id: "A", text: "request.json() / text() / formData() / arrayBuffer() / blob()" },
      { id: "B", text: "request.body (ReadableStream)" },
      { id: "C", text: "request.parseBody() (RR 7 早期 API)" },
      { id: "D", text: "request.clone()" },
    ],
    correctAnswer: { choiceId: "C" },
    explanation: {
      short: "parseBody 是 RR 7 早期 API, 1.x 后已废弃, 标准 Request API 是 json / text / formData / arrayBuffer / blob / body.",
      detail: "RR 7 v1.x 后推荐用 Web 标准 Request body API (json / text / formData), parseBody 已被弃用. RR 7 v2 完全移除 parseBody, 全用标准 API.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 Content-Type 期望值",
    prompt: "前端 fetch POST JSON, Content-Type 应该设?",
    options: [],
    correctAnswer: { values: { v: "application/json" } },
    blanks: [{ id: "v", placeholder: "MIME", acceptedAnswers: ["application/json", "application/json; charset=utf-8"] }],
    explanation: {
      short: "Content-Type: application/json 是 fetch POST JSON body 的标准 MIME.",
      detail: "前端 fetch POST JSON 必须设 Content-Type: application/json, 后端 request.json() 才能正确解析. 不设会触发 MIME 嗅探, 兼容性差.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 request.json() 与 Content-Type",
    prompt: "request.json() 在以下 Content-Type 表现? (多选)",
    options: [
      { id: "A", text: "application/json → 解析 JSON" },
      { id: "B", text: "application/json; charset=utf-8 → 解析 JSON" },
      { id: "C", text: "text/plain → 抛错或返回 string (非 JSON)" },
      { id: "D", text: "no Content-Type → 大部分实现会尝试 JSON.parse" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "request.json() 与 Content-Type 关系: json 解析, 字符集忽略, text/plain 抛错, 无 Content-Type 视实现.",
      detail: "Web 标准 request.json() 不严格检查 Content-Type, 而是 JSON.parse(body). text/plain body 也是 string, JSON.parse 会失败抛 SyntaxError. 实际项目建议检查 Content-Type 守门, 防止误用.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 body 不可重复读",
    prompt: "request.json() 第二次调用会?",
    options: [
      { id: "A", text: "抛错, body 已经被 stream 消耗, Request body 不可重复读" },
      { id: "B", text: "OK" },
      { id: "C", text: "返回空" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Request body 是 ReadableStream, 一次消耗, 第二次读抛错.",
      detail: "Web Request body 是 ReadableStream, json() / text() / formData() 都会 stream 消耗. 第二次调用拿到空 stream, JSON.parse('') 抛 SyntaxError. 要重复读必须 request.clone().",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: body 变量声明",
    prompt: "let body: unknown; 出现在 validateNemesisRequest 哪一行?",
    code: `1 export async function validateNemesisRequest(request: Request): Promise<NemesisRequestValidationResult> {
2   let body: unknown;
3
4   try {
5     body = await request.json();
6   } catch {`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "let body: unknown;" },
      { id: "L4", lineNumber: 4, text: "try {" },
      { id: "L5", lineNumber: 5, text: "body = await request.json();" },
    ],
    correctAnswer: { lineId: "L2" },
    explanation: {
      short: "第 2 行 let body: unknown 显式声明 unknown, 强制收窄.",
      detail: "body 类型 unknown 强制后续 typeof 守卫, 任何字段访问必须先收窄. 是 unknown-first 开发模式的标准, 防止 'any 跳过' 风险.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 try/catch 接 SyntaxError",
    prompt: "try { body = await request.json() } catch {} 为什么 catch 不绑定 error 变量?",
    options: [
      { id: "A", text: "项目不需要 error 详情, 直接返回 400 '请求格式错误', 简化逻辑" },
      { id: "B", text: "无意义" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "性能" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "项目不需要 error 详情, 直接返回 400 + 统一中文提示, 简化逻辑.",
      detail: "JSON parse 错误细节 (e.g. 行号 / 字段名) 不暴露给客户端, 防止信息泄露. catch 不绑定 error 也不 console.error, 静默处理, 适合低敏感场景.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 body 第二次访问",
    prompt: "validateNemesisRequest 末尾 normalizeRecentMessages(record.recentMessages) 访问 record 是 body 第二次访问, body 还能读吗?",
    options: [
      { id: "A", text: "能, Record<string, unknown> 强转已经缓存到 record 变量, 不需要再次 stream" },
      { id: "B", text: "不能" },
      { id: "C", text: "no-op" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Record<string, unknown> 强转已经把 body 数据缓存在 record 变量, 不需要再次 stream 读.",
      detail: "第 5 行 body = await request.json() 一次 stream 消耗解析, 缓存到内存. 之后 const record = body as Record<string, unknown> 是引用, 多次访问 record 都从内存读, 不再 stream. Request body 不可重复读, 但解析后的对象可以.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 收窄检查顺序",
    prompt: "validateNemesisRequest 的 typeof 守卫顺序? (多选相关)",
    options: [
      { id: "A", text: "body 必须先通过 typeof === 'object' 才转 Record" },
      { id: "B", text: "rawMessage 必须先通过 typeof === 'string' 才能 trim" },
      { id: "C", text: "顺序不可换: 外层失败不进入内层" },
      { id: "D", text: "可以并行" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "三道 typeof 守卫层层收窄, 外层失败不进入内层, 顺序不可并行.",
      detail: "TypeScript 编译期强制顺序: body 不是 object → 早返回 400, 不进入 record 强转. rawMessage 不是 string → 早返回 400, 不调用 trim(). 顺序保护类型安全.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 typeof 守卫三件套",
    prompt: "validateNemesisRequest 用了 typeof 三件套, 第三个是什么?",
    options: [
      { id: "A", text: "Array.isArray (recentMessages 数组守卫)" },
      { id: "B", text: "正则" },
      { id: "C", text: "无" },
      { id: "D", text: "instanceof" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Array.isArray 守卫 recentMessages 数组, 防止非数组访问 .map / .filter 抛错.",
      detail: "normalizeRecentMessages 内部用 Array.isArray 守 recentMessages, 非数组返回 []. 三件套: typeof object (body) + typeof string (message) + Array.isArray (recentMessages).",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 合法 JSON 完整路径",
    prompt: "用户 POST application/json body = '{\"message\":\"hi\"}', validateNemesisRequest 路径?",
    options: [
      { id: "json", text: "request.json() 成功, body={ message: 'hi' }, body 类型 unknown" },
      { id: "object", text: "typeof body === 'object' && body !== null, 通过" },
      { id: "record", text: "record = body as Record<string, unknown>" },
      { id: "string", text: "rawMessage = 'hi', typeof string + trim 长度 > 0, 通过" },
      { id: "ok", text: "ok=true, message='hi', recentMessages=[]" },
    ],
    correctAnswer: { pathIds: ["json", "object", "record", "string", "ok"] },
    explanation: {
      short: "JSON 解析 → object 守卫 → Record 强转 → message 守卫 → ok=true.",
      detail: "完整路径: json() 解析成功 → object 守卫通过 → Record 强转 (因为已收窄) → message 字段守卫通过 → ok=true + 归一化. recentMessages 字段缺失, 默认 undefined → normalizeRecentMessages 处理成 [].",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "branch_trace",
    title: "Q13 非法 JSON 路径",
    prompt: "用户 POST body = '{message:hi}' (无引号), 路径?",
    options: [
      { id: "json", text: "request.json() 抛 SyntaxError" },
      { id: "catch", text: "try/catch 收下, catch 不绑定 error" },
      { id: "return", text: "return ok=false, status=400, payload: { error: '请求格式错误。' }" },
    ],
    correctAnswer: { pathIds: ["json", "catch", "return"] },
    explanation: {
      short: "JSON 解析失败 → catch 收下 → 400 + 中文提示.",
      detail: "非法 JSON (无引号) 触发 SyntaxError, try/catch 收下, 返回 400 '请求格式错误'. 不会到 object 守卫, 不会泄露 SyntaxError 细节.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q14 body 是 array 时",
    prompt: "用户 POST body = '[1,2,3]' (JSON 数组), validateNemesisRequest 行为?",
    options: [
      { id: "A", text: "JSON 解析成功, typeof body === 'object' 命中 (array 也是 object), 进入 record 强转, record.message undefined, typeof !== 'string' 命中, 返回 400" },
      { id: "B", text: "500" },
      { id: "C", text: "no-op" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "array 也是 object, 进入 record 强转, record.message undefined, 字段守卫失败 400.",
      detail: "typeof [] === 'object' 是 true, array 绕过 object 守卫. 但 record.message 是 undefined, typeof undefined !== 'string', 字段守卫返回 400. 不依赖 array 守卫, 因为没必要.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 第二次访问 request.json",
    prompt: "validateNemesisRequest 末尾又 await request.json() 一次, 行为?",
    options: [
      { id: "A", text: "抛 SyntaxError, body stream 已被第一次消耗, JSON.parse('') 失败" },
      { id: "B", text: "OK" },
      { id: "C", text: "no-op" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Request body 不可重复读, 第二次抛 SyntaxError.",
      detail: "Request body 是 ReadableStream, 一次消耗. 第二次 json() 拿到空 string '', JSON.parse('') 抛 SyntaxError. 要重复读必须先 request.clone() 复制 stream.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 try/catch",
    prompt: "AI 改坏: AI 觉得 try/catch '啰嗦' 直接 body = await request.json(). 后果是?",
    options: [
      { id: "A", text: "非法 JSON 让 SyntaxError 冒到 ErrorBoundary, 整站 500" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "删 try/catch 后 SyntaxError 冒到 ErrorBoundary, 整站 500.",
      detail: "RR 7 action 抛错被 ErrorBoundary 捕获, 渲染 NotFound404 / RouteErrorBoundary. 用户看到 500 错误页, 体验糟. try/catch 是返回 400 + 友好提示的必需.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户 POST 非法 JSON 看到整站 500 错误页, 不知道是请求错了还是系统崩.",
    aiReviewRisk: "为'简洁'删 try/catch, 失去错误精确处理.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "删 try/catch 不是简洁.",
      D: "有错误处理破坏.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 用 request.text() 替代 json",
    prompt: "AI 改坏: AI 觉得 'text 更灵活' 改成 body = await request.text() + JSON.parse(body). 后果是?",
    options: [
      { id: "A", text: "JSON.parse 失败抛 SyntaxError 冒到 ErrorBoundary, 失去 try/catch 保护" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更灵活" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "request.text() + JSON.parse 抛 SyntaxError 冒到 ErrorBoundary, 失去 try/catch 保护.",
      detail: "request.json() 内部已经 try/catch + JSON.parse, 失败抛 SyntaxError, 但 request.json() 自己也 throw. 改成 text() + JSON.parse 暴露底层抛错, 必须自己 try/catch, 但 AI 漏了, 抛错冒到 ErrorBoundary.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "非法 JSON 抛 SyntaxError 冒到 ErrorBoundary, 整站 500, 失去 400 精确错误码.",
    aiReviewRisk: "为'灵活'用低层 API, 失去高层 API 的错误处理.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "text() + JSON.parse 反而更脆弱.",
      D: "有错误处理破坏.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 删 typeof object 守卫",
    prompt: "AI 改坏: AI 觉得 'json() 一定返回 object' 删 if (!body || typeof body !== 'object') 守卫. 后果是?",
    options: [
      { id: "A", text: "body 是 null / array / string 时, record.message 访问走 null/undefined 抛错" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "null / array / string body 时, record.message 抛错, 整站崩.",
      detail: "json() 解析后 body 类型是 unknown, 可能是 null (body 是 'null'), array (body 是 '[1,2]'), string (body 是 '\"hi\"'). 删 typeof object 守卫后, record = body as Record<string, unknown> 强转 (TS 编译过), 运行时 record.message 访问报 'cannot read property of undefined'.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户 POST body=null 或 array 时崩, 整站 500.",
    aiReviewRisk: "把 json() 假定为 always-object, 忽略 unknown 类型.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, Record 强转过.",
      C: "删守卫不是简洁.",
      D: "有严重运行时崩.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §11.3-7 localStorage 直接提交",
    prompt: nemesisLocalStorageUntrusted({
      lessonSlug: "request-body",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).prompt,
    options: nemesisLocalStorageUntrusted({
      lessonSlug: "request-body",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).options,
    correctAnswer: nemesisLocalStorageUntrusted({
      lessonSlug: "request-body",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: nemesisLocalStorageUntrusted({
      lessonSlug: "request-body",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, "app/hooks/useNemesisChat.client.ts"],
    realWorldImpact: "validateNemesisRequest 不调 normalizeRecentMessages, 攻击者改 localStorage 注入 50KB assistant 角色历史, 主模型 token 洪水 + prompt 注入.",
    aiReviewRisk: "把客户端存储当可信日志处理, 绕过所有 server-side 验证.",
    wrongAnswerFeedback: nemesisLocalStorageUntrusted({
      lessonSlug: "request-body",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 unknown 强转 any",
    prompt: "AI 改坏: AI 把 let body: unknown 改成 let body: any. 后果是?",
    options: [
      { id: "A", text: "失去 unknown-first 保护, 字段拼写错误不报, 字段访问 undefined 不警告" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "any 退化 unknown-first 保护, 字段错误不报, 失去强类型契约.",
      detail: "any 等于关掉 TS 检查, body.message 拼错成 body.mesage 不报. 是 AI 经典'为简洁退化'反模式, 失去 unknown-first 模式的最大价值.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "字段拼错编译过, 运行时 undefined, 排查耗时, 类型保护失效.",
    aiReviewRisk: "把 any 当成'灵活', 退化了 unknown-first 模式.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, any 关闭检查.",
      C: "any 退化了保护不是简洁.",
      D: "有类型保护损失.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 Request body 解析的安全设计",
    prompt: "用自己的话解释 validateNemesisRequest 为什么必须 (1) request.json() 而不是 request.text() (2) try/catch (3) unknown-first (4) typeof 层层守卫, 各自防什么.",
    options: [],
    correctAnswer: {
      text: "(1) request.json() 是高层 API, 内部 try/catch + JSON.parse, 比 request.text() + JSON.parse 更安全. (2) try/catch 收下非法 JSON 的 SyntaxError, 返回 400 + 中文提示, 不让抛错冒到 ErrorBoundary. (3) unknown-first 强制后续 typeof 守卫, 字段拼写错误 TS 报. (4) typeof 层层守卫: object → message 是 string + 非空 → recentMessages 是 array. 任何一项被删都引入新漏洞: 删 try/catch → 整站 500; 删 unknown → any 退化; 删 typeof → 字段访问抛错; 删任一守卫 → 非法 body 进入下游.",
    },
    explanation: {
      short: "四道防御: 高层 API + try/catch + unknown-first + typeof 层层守卫.",
      detail: "四道围绕'unknown input 必须 server-side 校验'设计, 配合形成完整防御链.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 let body: unknown 改成 let body: any, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "any 关掉 unknown-first 保护, body.message 拼错 body.mesage 编译过, 运行时拿 undefined, 排查耗时. unknown-first 是项目核心安全模式, body 来自不可信 request, 必须 unknown 强制 typeof 收窄. 这条 PR 会让请求体校验失去 TS 保护, 必须保留 unknown.",
    },
    explanation: {
      short: "审查点: unknown-first 是不可信输入的标准模式, 不可 any 退化.",
      detail: "好的 review 指出 (1) any 退化的具体后果 (2) unknown-first 设计意图 (3) 真实可观察的 bug (字段拼错).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
];
