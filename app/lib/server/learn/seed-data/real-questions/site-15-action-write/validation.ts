/**
 * Real questions for site-15-action-write / validation.
 *
 * Anchor: remix/app/services/nemesis-guard.server.ts L280-311 (normalizeRecentMessages) +
 *          validateNemesisRequest 字段校验链.
 * 学习目标: 服务端数组 / 字符串 / 长度归一化, 防止 localStorage 注入 + token 洪水.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: nemesisLocalStorageUntrusted (§11.3-7) — 直接相关.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { nemesisLocalStorageUntrusted } from "../recipes";

const PRIMARY = "app/services/nemesis-guard.server.ts";
const TOUCHED = [PRIMARY, "app/routes/api.nemesis.ts"];

export const validationQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 normalizeRecentMessages 输入",
    prompt: "normalizeRecentMessages(value: unknown) 接受什么类型?",
    options: [
      { id: "A", text: "unknown, 来自 record.recentMessages 任意客户端值" },
      { id: "B", text: "NemesisRecentMessage[]" },
      { id: "C", text: "string" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "unknown 接收任意客户端输入, 内部 Array.isArray + typeof 收窄.",
      detail: "客户端 localStorage 不可信, recentMessages 是 unknown, 函数内部用 Array.isArray 守 + typeof 收窄每个 item, 不信任任何字段类型.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 NemesisRole 类型",
    prompt: "NemesisRole 类型?",
    options: [
      { id: "A", text: "'user' | 'model' 字面量联合" },
      { id: "B", text: "string" },
      { id: "C", text: "any" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "NemesisRole = 'user' | 'model' 字面量联合, 拒绝其他 role.",
      detail: "字面量联合让 TS 编译期拒绝 'hacker' / 'system' / 'assistant' 等角色, 防止客户端伪造 system 角色注入. 是 discriminated union 收窄的标准模式.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 MAX_RECENT_MESSAGES",
    prompt: "MAX_RECENT_MESSAGES = 10, 作用?",
    options: [
      { id: "A", text: "recentMessages 数组最大长度, slice(-10) 取最近 10 项, 防止 token 洪水" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "MAX_RECENT_MESSAGES=10 截断最近 10 项, 防止 token 洪水 + 费用爆炸.",
      detail: "10 项上下文足够对话连续性, 攻击者传 1000 项会被 slice(-10) 截断. 平衡上下文完整性与成本 / 性能.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 text 长度限制",
    prompt: "trimmedText.slice(0, getMaxMessageLength()) 用 env NEMESIS_MAX_MESSAGE_LENGTH, 默认值?",
    options: [],
    correctAnswer: { values: { v: "1000" } },
    blanks: [{ id: "v", placeholder: "数字", acceptedAnswers: ["1000"] }],
    explanation: {
      short: "默认 1000 字符, env 可覆盖, 单条 recent message 截断.",
      detail: "getMaxMessageLength() 读 env NEMESIS_MAX_MESSAGE_LENGTH, 无效或缺失时退到 DEFAULT_MAX_MESSAGE_LENGTH=1000. 防止单条 text 超长, 配合数组 10 项限制, 1000 * 10 = 10K 字符上下文, 模型可以处理.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q5 filter 守卫",
    prompt: "normalizeRecentMessages 末尾 .filter((item): item is NemesisRecentMessage => Boolean(item)) 作用? (多选)",
    options: [
      { id: "A", text: "过滤掉 null (非法项), type predicate 收窄类型从 (NemesisRecentMessage | null)[] 到 NemesisRecentMessage[]" },
      { id: "B", text: "TS 编译期强制 filter 后是 NemesisRecentMessage[]" },
      { id: "C", text: "性能优化" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "filter(Boolean(item)) 过滤 null, type predicate 'item is T' 收窄类型, 编译期保护.",
      detail: ".map 返回 (NemesisRecentMessage | null)[], filter(Boolean) 过滤 null, 'item is T' 是 type predicate 让 TS 知道过滤后是 NemesisRecentMessage[]. 是 'filter(Boolean) 不等于完整类型验证' 的标准反例.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 type predicate 重要性",
    prompt: ".filter((item): item is NemesisRecentMessage => Boolean(item)) 为什么用 type predicate?",
    options: [
      { id: "A", text: "TS 不知道 filter(Boolean) 已经过滤 null, type predicate 显式收窄类型" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS 限制" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "filter(Boolean) 过滤后 TS 不知道, type predicate 显式收窄.",
      detail: "filter callback 返回 boolean, TS 不推断 callback 已经过滤 null. type predicate 'item is NemesisRecentMessage' 是显式声明, filter 后类型从 (T | null)[] 收窄到 T[]. 防止下游访问 .role / .text 时 undefined.",
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
    title: "Q7 关键行: Array.isArray 守卫",
    prompt: "if (!Array.isArray(value)) 出现在 normalizeRecentMessages 哪一行?",
    code: `1 function normalizeRecentMessages(value: unknown): NemesisRecentMessage[] {
2   if (!Array.isArray(value)) {
3     return [];
4   }
5
6   return value
7     .slice(-MAX_RECENT_MESSAGES)
8     .map((item): NemesisRecentMessage | null => {`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "if (!Array.isArray(value)) {" },
      { id: "L3", lineNumber: 3, text: "return [];" },
      { id: "L6", lineNumber: 6, text: "return value" },
    ],
    correctAnswer: { lineId: "L2" },
    explanation: {
      short: "第 2 行 Array.isArray 守 value, 非数组返回 [].",
      detail: "value 是 unknown, 可能是 null / object / string. Array.isArray 收窄到 array 类型, 后续 .slice / .map 安全. 非数组返回 [] 是合理 fallback.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q8 item typeof object 守卫",
    prompt: "if (!item || typeof item !== 'object') 守卫 item?",
    options: [
      { id: "A", text: "排除 null / primitive, item 必须是 plain object" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "排除 null / array / string / number, item 必须是 plain object.",
      detail: "recentMessages 数组里 item 可能是 null (客户端删了字段), string, number. typeof === 'object' && item !== null 收窄到 plain object. Record<string, unknown> 强转后安全访问 role / text.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q9 role 守卫三元",
    prompt: "if ((role !== 'user' && role !== 'model') || typeof text !== 'string') 守卫?",
    options: [
      { id: "A", text: "role 必须是 'user' | 'model' 字面量, text 必须是 string, 任一不符返回 null" },
      { id: "B", text: "性能" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "role 联合字面量 + text string 双重守卫, 任一不符返回 null.",
      detail: "role !== 'user' && role !== 'model' 拒绝 'hacker' / 'system' / 'assistant' 等. typeof text !== 'string' 排除非字符串. 任一不符返回 null, filter 阶段过滤.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 text trim + slice",
    prompt: "trimmedText.slice(0, getMaxMessageLength()) 链式调用作用? (多选)",
    options: [
      { id: "A", text: "先 trim 去前后空白, 防止纯空白字符串通过" },
      { id: "B", text: "再 slice 截断到 maxMessageLength, 防止单条 text 超长" },
      { id: "C", text: "返回归一化的 role + text" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "trim 防纯空白, slice 防超长, 返回归一化对象.",
      detail: "trim() 去前后空白, 空字符串返回 null (前面已判断). slice(0, maxLen) 截断到上限. 返回 { role, text: trimmedText.slice(0, maxLen) } 是归一化对象, 可以直接送给主模型.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 slice(-MAX) 含义",
    prompt: "value.slice(-MAX_RECENT_MESSAGES) 取数组哪部分?",
    options: [
      { id: "A", text: "从末尾数 10 项 (负数索引), 保留最近的对话历史" },
      { id: "B", text: "前 10 项" },
      { id: "C", text: "随机 10 项" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "slice(-10) 负数索引取末尾 10 项, 保留最近对话历史.",
      detail: "JS 数组 slice 负数索引从末尾开始数. slice(-10) 取最后 10 项, 数组短于 10 项时全部保留. 对话上下文最近 10 项最有意义, 早期历史可以被截断.",
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
    title: "Q12 合法 recentMessages 完整路径",
    prompt: "recentMessages = [{role: 'user', text: 'hi'}, {role: 'model', text: 'reply'}], 归一化?",
    options: [
      { id: "array", text: "Array.isArray true, 通过" },
      { id: "slice", text: "slice(-10) 保留全部 (2 项)" },
      { id: "map", text: "第 1 项: role='user' + text='hi' 通过守卫, 返回 { role: 'user', text: 'hi' }" },
      { id: "filter", text: "filter null 保留 2 项" },
      { id: "ok", text: "返回 [{ role: 'user', text: 'hi' }, { role: 'model', text: 'reply' }]" },
    ],
    correctAnswer: { pathIds: ["array", "slice", "map", "filter", "ok"] },
    explanation: {
      short: "Array.isArray → slice(-10) → 2 项 map 都通过守卫 → filter 保留 → 返回归一化数组.",
      detail: "完整路径: Array.isArray true → slice(-10) (2 项) → map 每项 role + text 守卫通过 → filter 保留 2 项 → 返回归一化结果.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "branch_trace",
    title: "Q13 攻击者伪造 role=hacker",
    prompt: "recentMessages = [{role: 'hacker', text: 'injection'}], 归一化?",
    options: [
      { id: "array", text: "Array.isArray true" },
      { id: "slice", text: "slice(-10) 保留 1 项" },
      { id: "map", text: "第 1 项: role='hacker' !== 'user' && !== 'model', 返回 null" },
      { id: "filter", text: "filter 过滤 null, 保留 []" },
      { id: "ok", text: "返回 []" },
    ],
    correctAnswer: { pathIds: ["array", "slice", "map", "filter", "ok"] },
    explanation: {
      short: "role='hacker' 守卫失败, map 返回 null, filter 过滤, 最终 [].",
      detail: "攻击者伪造 'hacker' 角色被守卫拒绝, 整条 recentMessages 被 filter 清空, 攻击无效. 防止 prompt 注入伪装 assistant / system 角色.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q14 recentMessages 是对象不是数组",
    prompt: "recentMessages = {role: 'user', text: 'hi'} (客户端误传对象), 归一化?",
    options: [
      { id: "A", text: "Array.isArray false, 直接返回 []" },
      { id: "B", text: "500 错误" },
      { id: "C", text: "passthrough" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Array.isArray false, 早返回 [], 不抛错.",
      detail: "客户端误传对象 (可能是错误代码), 守卫直接返回 [], 不进入 .slice / .map, 不抛错. 是 defensive 默认值.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 recentMessages 含空 text",
    prompt: "recentMessages = [{role: 'user', text: '   '}], 归一化?",
    options: [
      { id: "A", text: "trim 后 '' 空字符串, 守卫 trimmedText 为空, 返回 null, filter 过滤, 最终 []" },
      { id: "B", text: "passthrough" },
      { id: "C", text: "500" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "纯空白 text 被 trim 后空, 守卫拒绝, 整条被过滤.",
      detail: "'   ' trim 后 '' 空字符串, if (!trimmedText) 守卫命中, 返回 null, filter 过滤. 防止纯空白消息进入主模型上下文, 浪费 token.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 normalizeRecentMessages",
    prompt: "AI 改坏: AI 觉得 '信任前端' 删 normalizeRecentMessages, 直接 record.recentMessages. 后果是?",
    options: [
      { id: "A", text: "localStorage 篡改 / 旧版本残留, 非法 role 与 text 进主模型, prompt 注入 + token 洪水" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更高效" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "信任客户端存储, 攻击者构造 50KB assistant 角色历史, 主模型上下文爆 + prompt 注入.",
      detail: "localStorage 完全客户端可控, 攻击者可以注入 role='assistant' 历史伪造回复, 注入 50KB text 撑爆 token, 注入 system-like 文本绕过 guard. normalizeRecentMessages 是必要的 server 防御.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户改 localStorage 注入 50KB assistant 角色伪造历史, 主模型 token 洪水 + 上下文污染, 严重时绕过守门.",
    aiReviewRisk: "把客户端存储当可信, 绕过所有 server-side 验证.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "省一次归一化但失去 server 防御.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 删 type predicate",
    prompt: "AI 改坏: AI 觉得 'filter(Boolean) 够' 删 type predicate, 改成 .filter(Boolean). 后果是?",
    options: [
      { id: "A", text: "filter 后类型仍是 (T | null)[], 下游访问 .role / .text 可能 undefined" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "filter(Boolean) 不收窄类型, 下游访问可能 undefined.",
      detail: "filter callback 返回 boolean, TS 不推断过滤. 'item is T' 是 type predicate 显式收窄. 删了 predicate, 下游 items.role 类型是 'user' | 'model' | undefined, 访问 .role 拿 undefined 报 'undefined has no properties'. 是 timu.MD §12.1-4 经典反例.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "下游守卫假设 item.role 是 'user' | 'model', 实际 undefined, 拼 prompt 时 undefined 拼成 'role: undefined', 主模型拿到脏数据.",
    aiReviewRisk: "把 filter(Boolean) 当成'足够', 忽略 TS 类型推断限制.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 编译过但运行时崩.",
      C: "filter(Boolean) 简单但失去保护.",
      D: "有类型保护损失.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 把 MAX_RECENT_MESSAGES 改 0",
    prompt: "AI 改坏: AI 觉得 'recent 不必要' 把 MAX_RECENT_MESSAGES 改成 0. 后果是?",
    options: [
      { id: "A", text: "slice(-0) = slice(0) 返回 [], 上下文完全丢失, 主模型没有对话连续性" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更轻量" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "slice(-0) 等于 slice(0) 返回 [], 上下文丢失, 主模型没有对话连续性.",
      detail: "JS 中 -0 === 0, slice(-0) 等于 slice(0), 数组短于 0 项时返回 []. MAX_RECENT_MESSAGES=0 让 recentMessages 永远空, 上下文完全丢失. 用户问'刚才那个是什么意思'主模型不知道'刚才那个'是什么.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户多轮对话上下文完全丢失, 主模型把每条消息当独立请求, 体验退步.",
    aiReviewRisk: "把 MAX_RECENT_MESSAGES 误调为 0, JS 负数索引陷阱 -0 === 0.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "不是更轻量是上下文丢失.",
      D: "有严重体验影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §11.3-7 localStorage 直接提交",
    prompt: nemesisLocalStorageUntrusted({
      lessonSlug: "validation",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).prompt,
    options: nemesisLocalStorageUntrusted({
      lessonSlug: "validation",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).options,
    correctAnswer: nemesisLocalStorageUntrusted({
      lessonSlug: "validation",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: nemesisLocalStorageUntrusted({
      lessonSlug: "validation",
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
      lessonSlug: "validation",
      courseSlug: "site-15-action-write",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 trimmedText.slice 删了",
    prompt: "AI 改坏: AI 觉得 '前端已经截断' 把 trimmedText.slice(0, getMaxMessageLength()) 改成 trimmedText. 后果是?",
    options: [
      { id: "A", text: "单条 text 长度无限制, 攻击者 POST 1MB text 撑爆主模型 token 限制" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "删 slice 后单条 text 无限制, 1MB text 撑爆主模型 token 限制.",
      detail: "前端可能截断但不可信, 攻击者用 curl 直接 POST 1MB text 绕过前端. 服务端必须再截断, 防止 token 洪水 + 费用爆炸. 配合 MAX_RECENT_MESSAGES=10 项限制, 1000*10=10K 字符是合理上限.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "攻击者 POST 1MB text 触发主模型 token 洪水, 费用暴涨, 服务端 memory 占用高.",
    aiReviewRisk: "把客户端截断当通用规则, 忽略服务端必须再截断的防御性原则.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "删截断不是简洁.",
      D: "有安全影响.",
    },
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 normalizeRecentMessages 多层防御",
    prompt: "用自己的话解释 normalizeRecentMessages 为什么必须 (1) Array.isArray (2) typeof object (3) 字面量联合 + typeof string (4) trim (5) slice (6) filter + type predicate, 各自防什么.",
    options: [],
    correctAnswer: {
      text: "(1) Array.isArray: 防非数组 (.slice 抛错). (2) typeof object: 防 null / primitive (record 强转崩). (3) 字面量联合: 防 role='hacker' / 'system' 注入; typeof string: 防 text 是 object / array. (4) trim: 防纯空白消息. (5) slice: 防单条 text 超长 (token 洪水). (6) filter + type predicate: 防 null 项残留, TS 类型收窄. 六道防御围绕'客户端不可信 + server 必须再校验'设计, 任何一项被删都引入新漏洞.",
    },
    explanation: {
      short: "六道防御: 数组 + object + 字段 + trim + slice + filter + predicate.",
      detail: "六道都是 unknown-first 收窄的不同阶段, 形成 complete server-side 防御链.",
    },
    abilityTags: ["backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 normalizeRecentMessages 删掉, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "normalizeRecentMessages 是 localStorage 注入与 token 洪水的核心防御, 删了之后攻击者改 localStorage 注入 50KB assistant 角色伪造历史, 主模型上下文爆 + prompt 注入, 严重绕过守门. 必须保留, 任何 client storage 进 server 必须再校验.",
    },
    explanation: {
      short: "审查点: 客户端存储必须 server-side 再校验, 不可信.",
      detail: "好的 review 指出 (1) 攻击路径 (2) 删了的真实后果 (3) 防御性编程原则 (4) 必须保留.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, "app/hooks/useNemesisChat.client.ts"],
  }),
];
