/**
 * Real questions for site-15-action-write / api-nemesis-post.
 *
 * Anchor: remix/app/routes/api.nemesis.ts L36-49 (validation) +
 *          remix/app/services/nemesis-guard.server.ts L313-351 (validateNemesisRequest).
 * 学习目标: validateNemesisRequest 字段校验 + NemesisRequestValidationResult discriminated union.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: tsModelJsonDirectCast (§12.2-TS-1) — 涉及 unknown 收窄.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { tsModelJsonDirectCast } from "../recipes";

const PRIMARY = "app/routes/api.nemesis.ts";
const GUARD = "app/services/nemesis-guard.server.ts";
const TOUCHED = [PRIMARY, GUARD];

export const apiNemesisPostQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 NemesisRequestValidationResult 形状",
    prompt: "NemesisRequestValidationResult 是?",
    options: [
      { id: "A", text: "discriminated union: { ok: true; message; recentMessages } | { ok: false; status; payload }" },
      { id: "B", text: "string" },
      { id: "C", text: "any" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "discriminated union 用 ok 字段区分成功 / 失败分支, 编译期强制.",
      detail: "TS 联合类型, ok=true 携带 message + recentMessages, ok=false 携带 status + payload. 模式匹配时 TS 自动收窄类型, 字段访问强类型保护.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q2 400 触发条件",
    prompt: "validateNemesisRequest 在什么情况下返回 status: 400?",
    options: [
      { id: "A", text: "JSON 解析失败 / body 不是 object / message 不是 string / message 为空" },
      { id: "B", text: "always" },
      { id: "C", text: "server 错" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "JSON 解析失败 + body 不是 object + message 字段缺失或非字符串 + message 全空白, 都 400.",
      detail: "三层校验: (1) request.json() 抛错 (2) body 不是 object (3) message 字段. 任一失败返回 400 + 中文错误信息.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q3 message 字段 trim",
    prompt: "const message = rawMessage.trim(); 为什么 trim?",
    options: [
      { id: "A", text: "用户输入可能含前后空白 / 换行, 后续归一化需要去掉" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "用户输入可能含前后空白 / 换行, trim 归一化让审计 / log 干净.",
      detail: "用户从 textarea 粘贴可能含 \\n / 全角空格 / 零宽字符, trim 归一化让后续 token 计数 / 限流 / 守门判断一致. 同时防止'纯空白消息'绕过非空检查.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "fill_blank",
    title: "Q4 maxMessageLength 默认值",
    prompt: "DEFAULT_MAX_MESSAGE_LENGTH 默认值? (数字)",
    options: [],
    correctAnswer: { values: { v: "1000" } },
    blanks: [{ id: "v", placeholder: "数字", acceptedAnswers: ["1000"] }],
    explanation: {
      short: "默认 1000 字符, env NEMESIS_MAX_MESSAGE_LENGTH 可覆盖.",
      detail: "项目用 getMaxMessageLength() 读 env, 拿不到或无效时退到 DEFAULT_MAX_MESSAGE_LENGTH=1000. 1000 字符是 token 友好长度, 也是守门 / rate limit 共同基准.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "multi_choice",
    title: "Q5 normalizeRecentMessages 作用",
    prompt: "validateNemesisRequest 末尾 normalizeRecentMessages(record.recentMessages) 作用? (多选)",
    options: [
      { id: "A", text: "把 localStorage 拿来的 recentMessages 数组归一化: 过滤非法项 / 限制数量 / 校验 role 与 text" },
      { id: "B", text: "防止客户端存储注入 / 篡改" },
      { id: "C", text: "性能" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "归一化 recentMessages 数组, 防止 localStorage 注入 / 篡改.",
      detail: "客户端 localStorage 不可信, 旧客户端残留字段 / 用户改 localStorage 都可能. normalizeRecentMessages 过滤掉非法 role / 空 text / 超长项, 限制数量 (MAX_RECENT_MESSAGES=10), 防止污染 AI 上下文.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "basic",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q6 ok=true 携带字段",
    prompt: "ok=true 时 validation.message 与 validation.recentMessages 是什么?",
    options: [
      { id: "A", text: "message: trim 后的字符串, recentMessages: 归一化后的 NemesisRecentMessage[]" },
      { id: "B", text: "string" },
      { id: "C", text: "any" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ok=true 携带 trim 后的 message + 归一化后的 recentMessages.",
      detail: "validation.message 是 trim 后的字符串, validation.recentMessages 是 normalizeRecentMessages 处理过的数组, 都是 trusted 状态, 可以直接交给下游 guard / model.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: json 解析 try/catch",
    prompt: "body = await request.json() 出现在 validateNemesisRequest 哪一行?",
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
      { id: "L6", lineNumber: 6, text: "} catch {" },
    ],
    correctAnswer: { lineId: "L5" },
    explanation: {
      short: "第 5 行 await request.json() + try/catch, 解析失败返回 400.",
      detail: "request.json() 可能抛 SyntaxError (body 不是 JSON), try/catch 收下, 返回 400 + '请求格式错误'. body 类型 unknown, 收窄后判 object.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q8 body 类型守卫",
    prompt: "if (!body || typeof body !== 'object') 的作用?",
    options: [
      { id: "A", text: "收窄 body 类型, 排除 null / array / primitive, 只接受 object" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "typeof body !== 'object' 排除 null / array / string / number, 只接受 plain object.",
      detail: "request.json() 解析后 body 可能是 null / array / object / primitive, 走 typeof === 'object' && body !== null 收窄到 plain object. 是 unknown 收窄的标准模式.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q9 rawMessage typeof 守卫",
    prompt: "if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) 守卫?",
    options: [
      { id: "A", text: "排除非 string 与空字符串 / 纯空白, message 必须是带内容的字符串" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "typeof + trim 双重守卫, 排除非 string / 空串 / 纯空白, 必须有内容.",
      detail: "rawMessage 是 unknown, typeof === 'string' 收窄, trim() 排除纯空白. 两个条件 OR, 任一不满足返回 400 '请输入消息内容'.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "multi_choice",
    title: "Q10 unknown 收窄模式",
    prompt: "validateNemesisRequest 用到的 unknown 收窄模式? (多选)",
    options: [
      { id: "A", text: "let body: unknown 后 typeof 守卫" },
      { id: "B", text: "Record<string, unknown> 强转" },
      { id: "C", text: "field 访问后再 typeof 守卫" },
      { id: "D", text: "as NemesisRequest 强转" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "三件套: unknown + typeof + Record + 嵌套 typeof, 标准 unknown 收窄.",
      detail: "let body: unknown → typeof === 'object' 守卫 → Record<string, unknown> 强转 (因为已收窄) → 嵌套 typeof 守卫. 没有 'as NemesisRequest' 这种跨越, 逐步收窄, 编译期严格.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q11 ok 字段命名",
    prompt: "discriminated union 用 'ok' 而不是 'success' 作为判别字段?",
    options: [
      { id: "A", text: "ok 是 TS 社区惯用, ok=true / ok=false 比 success=true 简洁, 语义'结果可用'" },
      { id: "B", text: "无区别" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ok 是社区惯用, 简洁, 语义'结果是否可继续'.",
      detail: "TS 社区 Result<T, E> 类型惯用 ok / err 判别, 替代 throw. 优势: (1) 编译期强制处理 err (2) 错误信息携带在 err 分支. ok=true 携带正常数据, ok=false 携带 status + payload.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 合法消息完整校验",
    prompt: "用户提交 { message: 'hello' }, validateNemesisRequest 完整路径?",
    options: [
      { id: "json", text: "request.json() 成功, body={ message: 'hello' }" },
      { id: "object", text: "body 是 object, 通过 typeof 守卫" },
      { id: "field", text: "rawMessage = 'hello', typeof string + trim 长度 > 0, 通过" },
      { id: "ok", text: "ok=true, message='hello', recentMessages=[] (空)" },
    ],
    correctAnswer: { pathIds: ["json", "object", "field", "ok"] },
    explanation: {
      short: "JSON 解析 → object 守卫 → message 字段守卫 → ok=true.",
      detail: "完整路径: JSON 解析成功 → body 是 object → message 字段是 string + 非空 → ok=true + 归一化数据. recentMessages 空数组 (没传), 走 normalizeRecentMessages([]) 返回 [].",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "branch_trace",
    title: "Q13 攻击者构造异常 body",
    prompt: "攻击者 POST { message: null }, validateNemesisRequest 路径?",
    options: [
      { id: "json", text: "JSON 解析成功" },
      { id: "object", text: "body 是 object, 通过" },
      { id: "field", text: "rawMessage = null, typeof !== 'string' 命中" },
      { id: "return", text: "return ok=false, status=400, payload: { error: '请输入消息内容。' }" },
    ],
    correctAnswer: { pathIds: ["json", "object", "field", "return"] },
    explanation: {
      short: "JSON OK → object OK → message=null 守卫失败 → 400 + 中文提示.",
      detail: "攻击者构造 null message 绕过不了 typeof 守卫, 返回 400 '请输入消息内容'. 不会到 guard / model, 防止 prompt 注入.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q14 recentMessages 含非法项",
    prompt: "用户提交 { message: 'hi', recentMessages: [{ role: 'hacker', text: 'injection' }] }, 行为?",
    options: [
      { id: "A", text: "normalizeRecentMessages 过滤掉 role='hacker' 项, 只保留合法 user/model 项" },
      { id: "B", text: "500 错误" },
      { id: "C", text: "passthrough" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "normalizeRecentMessages 过滤掉非法 role, 只保留 user / model.",
      detail: "NemesisRole 是 'user' | 'model' 联合, normalizeRecentMessages 用 isPersistedMessage 过滤掉非法 role / 空 text / 超长. 攻击者注入的 'hacker' 被过滤, recentMessages 变 [] 或合法子集.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "single_choice",
    title: "Q15 recentMessages 1000 项",
    prompt: "用户提交 { message: 'hi', recentMessages: [...1000 项] }, 行为?",
    options: [
      { id: "A", text: "normalizeRecentMessages 截断到 MAX_RECENT_MESSAGES=10 项, 防止超长上下文" },
      { id: "B", text: "全保留" },
      { id: "C", text: "500 错误" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "MAX_RECENT_MESSAGES=10 截断, 防止超长 prompt 注入 / 费用爆炸.",
      detail: "1000 项 recentMessages 直接送给主模型会撑爆 token 上限, 触发费用爆炸. normalizeRecentMessages 截断到最近 10 项, 平衡上下文完整性与成本.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把 unknown 强转 validation result",
    prompt: "AI 改坏: AI 把 validateNemesisRequest 返回类型改成 Promise<any>, 跳过 ok 守卫. 后果是?",
    options: [
      { id: "A", text: "validation.ok 字段访问编译过, 字段拼错不报, 失去 discriminated union 编译期保护" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "any 退化了 discriminated union 的编译期强制, 字段错误不报.",
      detail: "返回 Promise<any> 后, action 内 validation.ok / validation.message / validation.status 都是 any, 拼错不报. ok=false 时访问 validation.message 是 undefined, 报 'cannot read'. 失去 discriminated union 的最大价值.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: GUARD,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
    realWorldImpact: "validation.status 拼成 validation.statusCode, 编译过运行时 undefined, 用户看到 200 + 错误 body, 体验错乱.",
    aiReviewRisk: "为'简洁'用 any 退化了 TS 联合类型保护.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, any 关闭检查.",
      C: "any 退化了保护不是简洁.",
      D: "有类型保护损失.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 删 trim",
    prompt: "AI 改坏: AI 觉得 '前端应该 trim' 把 rawMessage.trim().length 改成 rawMessage.length. 后果是?",
    options: [
      { id: "A", text: "'   ' (3 个空格) 长度 3, 通过守卫, message='   ' 进入守门, prompt 注入绕过" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "删 trim 后, 纯空白消息 (3 空格) 长度 3 > 0, 通过守卫, 进入守门.",
      detail: "trim().length === 0 守卫是防'纯空白消息', 删了后 '   ' 长度 3, 进入守门, 后续 guard 拿 '   ' 走 Gemini 分类, 浪费 token. 客户端可能 trim 但不保证, 服务端必须再 trim 一次.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: GUARD,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
    realWorldImpact: "攻击者 POST 纯空白消息绕过守卫, 触发守门 / 限流 / 主模型, 浪费资源.",
    aiReviewRisk: "把客户端 trim 当成通用规则, 忽略服务端必须再 trim 的防御性原则.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "删 trim 不是简洁.",
      D: "有安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 删 normalizeRecentMessages",
    prompt: "AI 改坏: AI 觉得 '信任前端' 删 normalizeRecentMessages, 直接 record.recentMessages. 后果是? [api-nemesis-post]",
    options: [
      { id: "A", text: "客户端 localStorage 篡改 / 旧版本残留, 非法 role 与 text 进主模型, prompt 注入 + token 洪水" },
      { id: "B", text: "更高效" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "信任客户端存储, 攻击者构造 50KB assistant 角色历史, 主模型上下文爆 + prompt 注入.",
      detail: "localStorage 完全客户端可控, 攻击者可以注入 role='assistant' 历史伪造回复, 注入 50KB text 撑爆 token, 注入 system-like 文本绕过 guard. normalizeRecentMessages 是必要的 server 防御.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: GUARD,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [GUARD],
    realWorldImpact: "用户改 localStorage 注入 50KB assistant 角色伪造历史, 主模型 token 洪水 + 上下文污染, 严重时绕过守门.",
    aiReviewRisk: "把客户端存储当可信, 绕过所有 server-side 验证.",
    wrongAnswerFeedback: {
      B: "省一次归一化但失去 server 防御.",
      C: "TS 不会报错.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §12.2-TS-1 模型 JSON 直接 as",
    prompt: tsModelJsonDirectCast({
      lessonSlug: "api-nemesis-post",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).prompt,
    options: tsModelJsonDirectCast({
      lessonSlug: "api-nemesis-post",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).options,
    correctAnswer: tsModelJsonDirectCast({
      lessonSlug: "api-nemesis-post",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).correctAnswer as { patchedCode: string },
    explanation: tsModelJsonDirectCast({
      lessonSlug: "api-nemesis-post",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: GUARD,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
    realWorldImpact: "validateNemesisRequest 用 'as NemesisRequestValidationResult' 跳过 unknown 收窄, 任何非法 body 都能进入下游, 守门失效.",
    typeSafetyRisk: "as 跳过 unknown 收窄, 字段伪造数据流到 guard / model.",
    wrongAnswerFeedback: tsModelJsonDirectCast({
      lessonSlug: "api-nemesis-post",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 ok=false payload 用 string",
    prompt: "AI 改坏: AI 把 ok=false 的 payload 类型改成 { error: string }, 删掉 text 字段. 后续要返回 text 而非 error 时?",
    options: [
      { id: "A", text: "TS 报错, 字段必须符合 payload 类型, 增加字段需要修改类型" },
      { id: "B", text: "更简洁" },
      { id: "C", text: "无" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "强类型 payload 限制字段, 加字段需要改类型, 编译期强制.",
      detail: "原类型 { error?: string; text?: string } 是双 optional, 灵活但要小心. AI 改成 { error: string } 后, 想返回 text 报错 'text 不存在'. TS 强类型保护 payload 一致性, 防止字段错乱.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: GUARD,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
    realWorldImpact: "AI 把 payload 改简单后, 未来加新字段需要改类型, 编译期强制, 防止类型与实现漂移.",
    aiReviewRisk: "为'简洁'改简单类型, 失去双 optional 灵活性. 但反过来类型是保护, 改简单反而更稳.",
    wrongAnswerFeedback: {
      B: "改简单不是简洁, 是强类型保护.",
      C: "TS 报错是预期行为.",
      D: "有类型保护影响.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 validateNemesisRequest 防御设计",
    prompt: "用自己的话解释 validateNemesisRequest 为什么必须 (1) try/catch JSON 解析 (2) typeof object 守卫 (3) typeof string + trim 守卫 (4) normalizeRecentMessages, 各自防什么.",
    options: [],
    correctAnswer: {
      text: "(1) try/catch JSON 解析: 防止非 JSON body 让 request.json() 抛错, 不 catch 让错误冒到 ErrorBoundary 整站 500. (2) typeof object 守卫: 排除 null / array / primitive, 只接受 plain object, 防止 array body 走 field 访问报 undefined. (3) typeof string + trim 守卫: 排除非 string / 空串 / 纯空白, 防止 '纯空白消息' 进入守门. (4) normalizeRecentMessages: 客户端 localStorage 不可信, 过滤非法 role / 截断超长, 防止 prompt 注入 + token 洪水. 四道防御围绕 '不可信输入必须 server-side 校验' 设计, 任何一项被删都引入新漏洞.",
    },
    explanation: {
      short: "四道防御: JSON 解析 + object 守卫 + 字段守卫 + 数组归一化.",
      detail: "四道都是 unknown 收窄的不同阶段, 配合形成完整的 server-side 防御. 客户端不能信, 服务端必须再校验.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: GUARD,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 validateNemesisRequest 返回类型改成 Promise<any>, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "Promise<any> 关掉 discriminated union 的编译期强制, validation.ok 拼错 validation.oks 都不报, ok=false 时访问 validation.message 拿 undefined, 用户看到 200 + 空 body. 必须保留 Promise<NemesisRequestValidationResult>, 让 TS 强制 ok 分支处理.",
    },
    explanation: {
      short: "审查点: discriminated union 不可用 any 退化.",
      detail: "好的 review 指出 (1) any 退化的具体后果 (2) discriminated union 编译期保护 (3) 字段拼错实际可观察的 bug.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: GUARD,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [GUARD],
  }),
];
