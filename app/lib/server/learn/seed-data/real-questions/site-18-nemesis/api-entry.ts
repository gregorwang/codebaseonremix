/**
 * Real questions for site-18-nemesis / api-entry.
 *
 * Anchor: remix/app/routes/api.nemesis.ts L141-179 (callNemesisModel +
 *          parseNemesisReply + ensureNemesisFoodVideoAttachment + emit done + catch).
 * 学习目标: 主模型调用 + 响应解析 + 附件白名单 + SSE 事件 + 异常路径.
 *
 * 题目数: 22 (basic 6 / code-reading 5 / state-reasoning 4 / ai-review 5 /
 *         free-response 2).
 *
 * 引用 recipe: nemesisModelOnGuardReject (§11.3-2) + remixRouteCssInRoot.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { nemesisModelOnGuardReject, remixRouteCssInRoot } from "../recipes";

const PRIMARY = "app/routes/api.nemesis.ts";
const SERVICE = "app/services/nemesis.server.ts";
const REPLY = "app/services/nemesis-reply.server.ts";
const VIDEO = "app/nemesis/video-catalog";
const TOUCHED = [PRIMARY, SERVICE, REPLY, VIDEO];

export const apiEntryQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 callNemesisModel 角色",
    prompt: "callNemesisModel(env, message, recentMessages, responseMode, onProgress) 角色?",
    options: [
      { id: "A", text: "调主模型 (Gemini / DeepSeek / Grok), 返回 { text, provider, route, model, ... }, onProgress 是流式状态回调" },
      { id: "B", text: "调守门" },
      { id: "C", text: "D1 写" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "callNemesisModel 调主模型, 返回 result 含 text / provider / route / model / queryType / fallbackUsed / finishReason / incomplete.",
      detail: "callNemesisModel 是 nemesis.server 核心, 接受 env / message / recentMessages / responseMode / onProgress. 返回 result 含 text (主模型输出) / provider (Gemini / DeepSeek / Grok) / route (调用路径) / model (具体模型) / queryType (意图分类) / fallbackUsed / fallbackChain / finishReason / incomplete. onProgress 是流式状态回调, emit status.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q2 responseMode 含义",
    prompt: "responseMode: 'normal' 含义?",
    options: [
      { id: "A", text: "正常模式, 主模型返回完整响应, 不走快速模式 / 兜底模式" },
      { id: "B", text: "兜底" },
      { id: "C", text: "无" },
      { id: "D", text: "快速" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "responseMode='normal' 是正常模式, 不走快速 / 兜底.",
      detail: "responseMode 是 'normal' / 'fast' / 'fallback' 等模式, 决定主模型调用路径. 'normal' 走主 Gemini 分类 → 主模型, 'fast' 跳过分类快速响应, 'fallback' 走 DeepSeek / Grok 兜底. 项目默认 normal.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q3 parseNemesisReply 作用",
    prompt: "parseNemesisReply(result.text) 作用?",
    options: [
      { id: "A", text: "解析主模型输出 (JSON 格式), 提取 text / attachments 等结构化字段" },
      { id: "B", text: "无" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "parseNemesisReply 解析主模型输出的 JSON, 提取 text / attachments 等结构化字段.",
      detail: "主模型按系统 prompt 输出 JSON { text, attachments, ... }, parseNemesisReply 解析 + normalize, 提取 text (回复文本) / attachments (附件列表). 是 trusted 解析, 解析失败抛错.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, REPLY],
  }),
  q({
    type: "fill_blank",
    title: "Q4 ensureNemesisFoodVideoAttachment 作用",
    prompt: "ensureNemesisFoodVideoAttachment(parsed.attachments, validation.message) 作用?",
    options: [],
    correctAnswer: { values: { v: "附件白名单" } },
    blanks: [{ id: "v", placeholder: "作用", acceptedAnswers: ["白名单", "附件白名单", "URL 白名单", "过滤附件"] }],
    explanation: {
      short: "附件白名单过滤, 只保留 catalog 内的 URL, 防止模型塞任意外链.",
      detail: "timu.MD §11.3-6 风险: 模型可以把任意外链塞进前端附件. ensureNemesisFoodVideoAttachment 走白名单 catalog, 不在白名单的 URL 过滤掉. attachment 必须是 catalog 内合法视频, 不能信任模型输出.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, VIDEO],
  }),
  q({
    type: "multi_choice",
    title: "Q5 emit done 字段",
    prompt: "api.nemesis.ts L157 emit('done', {...}) 字段? (多选)",
    options: [
      { id: "A", text: "text: parsed.text (主模型回复)" },
      { id: "B", text: "attachments (白名单后的附件)" },
      { id: "C", text: "modelRoute / modelProvider / modelName (调用链)" },
      { id: "D", text: "classifierReason" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "emit done 公开字段: text + attachments + modelRoute/Provider/Name + queryType + fallbackUsed + finishReason + incomplete, 不含 classifierReason.",
      detail: "emit done 是 SSE 完结事件, 公开字段: text (回复) / attachments (白名单) / mode (守门) / modelRoute/Provider/Name (调用链) / queryType (意图) / fallbackUsed (是否 fallback) / finishReason (停止原因) / incomplete (是否截断). classifierReason 不进, 是 server-internal.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, REPLY],
  }),
  q({
    type: "single_choice",
    title: "Q6 SSE 事件流",
    prompt: "SSE 事件流有几种类型?",
    options: [
      { id: "A", text: "status (进度) / done (完成) / error (失败) 三种" },
      { id: "B", text: "无" },
      { id: "C", text: "无" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE 事件流三种: status / done / error, status 多次, done / error 各一次.",
      detail: "createNemesisSseResponse 提供 emit('status', ...) 多次 (进度更新) + emit('done', ...) 一次 (完成) + emit('error', ...) 一次 (失败). 前端 useNemesisChat.client 监听这三种事件更新 UI.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/lib/nemesis-sse.server.ts"],
  }),

  // ─── 读代码 (Q7-Q11) ────────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: callNemesisModel 调用",
    prompt: "const result = await callNemesisModel({...}) 出现在 api.nemesis.ts 哪一行?",
    code: `1     try {
2       const result = await callNemesisModel({
3         env: cloudflare?.env ?? {},
4         message: validation.message,
5         recentMessages: validation.recentMessages,
6         responseMode: "normal",
7         onProgress: (event) => {
8           emit("status", event);
9         },
10      });`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "const result = await callNemesisModel({...})" },
      { id: "L7", lineNumber: 7, text: "onProgress: (event) => {" },
      { id: "L8", lineNumber: 8, text: "emit('status', event);" },
    ],
    correctAnswer: { lineId: "L2" },
    explanation: {
      short: "第 2 行 await callNemesisModel, 调主模型.",
      detail: "主模型调用 await, onProgress 回调转发 status 事件给前端, 实时显示进度. result 拿到主模型输出后继续 parse + emit done.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q8 ensureNemesisFoodVideoAttachment 签名",
    prompt: "ensureNemesisFoodVideoAttachment(parsed.attachments, validation.message) 第二参数 message 用途?",
    options: [
      { id: "A", text: "message 用于判断是否需要追加 food video 附件, 比如用户问'做饭'自动追加菜谱视频" },
      { id: "B", text: "无" },
      { id: "C", text: "装饰" },
      { id: "D", text: "TS" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "message 用于判断是否需要追加 food video 附件, 比如用户问'做饭'自动追加菜谱视频.",
      detail: "ensureNemesisFoodVideoAttachment 是白名单 + 智能追加, message 用于语义判断. 用户问'做饭' / 'cooking' 等关键词, 自动从 catalog 选 1 个菜谱视频追加. 是白名单 + 智能的混合设计.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, VIDEO],
  }),
  q({
    type: "single_choice",
    title: "Q9 recordAudit 模型成功路径",
    prompt: "recordAudit({ assistantMessage: parsed.text, modelResult: result }) modelResult 字段?",
    options: [
      { id: "A", text: "result 整条 (provider / route / model / queryType / fallbackUsed / fallbackChain / finishReason / incomplete)" },
      { id: "B", text: "只有 text" },
      { id: "C", text: "无" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "modelResult 字段是 result 整条, 含 provider / route / model / queryType / fallbackUsed / fallbackChain / finishReason / incomplete.",
      detail: "result 是 callNemesisModel 的返回, 包含完整调用链 metadata. recordAudit 把 modelResult 整条写 D1, 管理员从 audit 表看到完整调用链, 用于分析守门 / fallback 表现.",
    },
    abilityTags: ["backend.auth.required"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis-guard-events.server.ts"],
  }),
  q({
    type: "multi_choice",
    title: "Q10 catch 异常路径",
    prompt: "api.nemesis.ts L169-178 catch (error) 处理? (多选)",
    options: [
      { id: "A", text: "recordAudit() (无 assistantMessage) 记录异常" },
      { id: "B", text: "NemesisModelError 时 emit error + 错误消息" },
      { id: "C", text: "其他错误 console.error + emit 友好错误" },
      { id: "D", text: "throw" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "recordAudit 记异常 + NemesisModelError 分类 + 其他错误友好处理, 不 throw 阻断 SSE 流.",
      detail: "异常路径: (1) recordAudit() (无 assistantMessage) 标记 audit 失败. (2) NemesisModelError (自定义错误类) emit error + error.message 友好提示. (3) 其他错误 console.error 记录 + emit 'Nemesis 暂时无法响应, 请稍后再试'. 不 throw, 让 SSE 流正常结束.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q11 emit done modelName 含义",
    prompt: "emit done 的 modelName 字段?",
    options: [
      { id: "A", text: "实际调用的具体模型, 例如 'gemini-2.0-flash' / 'deepseek-chat' / 'grok-2'" },
      { id: "B", text: "TS" },
      { id: "C", text: "无" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "modelName 是实际调用的具体模型, 例如 'gemini-2.0-flash' / 'deepseek-chat' / 'grok-2'.",
      detail: "modelName 是 result.model, 实际调用的具体模型. 与 modelProvider (Gemini / DeepSeek / Grok) 配合, 用户在前端 debug UI 能看到'这次是 Gemini 2.0 flash 响应的'. 是 provider + model 完整调用链.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),

  // ─── 状态推演 (Q12-Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 合法 NORMAL 完整主模型路径",
    prompt: "用户问'讲个笑话', guard PASS_TO_GEMINI, 完整主模型路径?",
    options: [
      { id: "call", text: "callNemesisModel 调 Gemini 2.0 flash, 返回 result" },
      { id: "progress", text: "onProgress 多次 emit status (进度)" },
      { id: "parse", text: "parseNemesisReply 解析 result.text 为 { text, attachments }" },
      { id: "white", text: "ensureNemesisFoodVideoAttachment 过滤 attachments, 不追加 (笑话不涉及 food)" },
      { id: "audit", text: "recordAudit 写 D1" },
      { id: "done", text: "emit done 公开字段给前端" },
    ],
    correctAnswer: { pathIds: ["call", "progress", "parse", "white", "audit", "done"] },
    explanation: {
      short: "call → progress → parse → white → audit → done, 6 步完整.",
      detail: "完整路径: callNemesisModel 调 Gemini → onProgress 多次 status 进度 → parseNemesisReply 解析 → 白名单过滤 (笑话不追加 food) → recordAudit 写 D1 → emit done 给前端.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 主模型 500 错误路径",
    prompt: "callNemesisModel 抛 500 错误, 路径?",
    options: [
      { id: "throw", text: "callNemesisModel 抛 NemesisModelError 或其他 Error" },
      { id: "catch", text: "catch 收下" },
      { id: "audit", text: "recordAudit() 记异常" },
      { id: "classify", text: "NemesisModelError 时 emit error + error.message" },
      { id: "user", text: "用户前端看到 '抱歉, AI 暂时无法响应' 友好提示" },
    ],
    correctAnswer: { pathIds: ["throw", "catch", "audit", "classify", "user"] },
    explanation: {
      short: "throw → catch → audit → classify error 类型 → emit error 友好提示.",
      detail: "主模型异常: throw → catch → recordAudit 记 → 分类 NemesisModelError / 其他 → emit error 事件. 用户看到友好错误, 不看到 500 整站错误. 异常被 audit 记录, 管理员可查.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q14 fallback 触发",
    prompt: "fallbackUsed: true 表示什么?",
    options: [
      { id: "A", text: "主模型 (Gemini) 失败, fallback 到 DeepSeek / Grok, 用户看到的是 fallback 模型响应" },
      { id: "B", text: "无" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "fallbackUsed=true 表示主模型失败, 走 fallback 链路, 用户看到 fallback 模型响应.",
      detail: "fallbackUsed 是 callNemesisModel 的字段, 表示是否走了 fallback (DeepSeek / Grok). fallbackChain 字段记录完整 fallback 链路. emit done 把 fallbackUsed 暴露给前端, 用户 debug UI 能看到 '这次走了 fallback'.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),
  q({
    type: "single_choice",
    title: "Q15 incomplete 含义",
    prompt: "incomplete: true 表示?",
    options: [
      { id: "A", text: "主模型响应被截断, 例如 token 限制 / 超时 / 网络中断, 文本不完整" },
      { id: "B", text: "无" },
      { id: "C", text: "TS" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "incomplete=true 表示响应被截断, token 限制 / 超时 / 网络中断.",
      detail: "incomplete 是 result.incomplete, true 表示响应不完整. finishReason 详细说明 (length / timeout / network). 前端可显示 '响应被截断' 或自动重试, 管理员 audit 看到 incomplete 比例.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
  }),

  // ─── AI 审查 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删 ensureNemesisFoodVideoAttachment 白名单",
    prompt: "AI 改坏: AI 觉得 '白名单太多余' 删 ensureNemesisFoodVideoAttachment, 直接 emit parsed.attachments. 后果是? (timu.MD §11.3-6)",
    options: [
      { id: "A", text: "模型可以塞任意外链 (https://attacker.example/x.png), 渲染时变成外站图片, 触发钓鱼 / 跟踪像素" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更灵活" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "模型塞任意外链, 渲染时变外站图片, 触发钓鱼 / 跟踪像素 / 资源外链.",
      detail: "timu.MD §11.3-6 经典反例: 模型被 prompt 注入后, 返回 'https://attacker.example/x.png', 渲染时变成外站图片, 可触发钓鱼 / 跟踪像素 / 资源耗尽. 必须走白名单 catalog, attachment URL 必须是受控来源.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, VIDEO],
    realWorldImpact: "用户前端渲染外站图片, 触发钓鱼 / 跟踪 / 资源耗尽. 严重时攻击者构造恶意图片 ID 配合其他漏洞.",
    aiReviewRisk: "把 AI 输出当受信任输入处理, 破坏白名单架构.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "灵活不是白名单的反面.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把 throw 改成 silent",
    prompt: "AI 改坏: AI 觉得 '异常是正常的' 把 catch 删, throw 冒到 ErrorBoundary. 后果是?",
    options: [
      { id: "A", text: "主模型 500 时用户看到整站 500, audit 失败不被记录, 失去 fail-soft 设计" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更可靠" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "throw 冒到 ErrorBoundary, 用户看到整站 500, audit 失败不被记录, 失去 fail-soft 设计.",
      detail: "删 catch 让 throw 冒到 ErrorBoundary, 整站 500. recordAudit() 不调用, audit 失败不记录, 管理员不知道主模型失败率. fail-soft + audit 是更好设计, 删 catch 失去平衡.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, SERVICE],
    realWorldImpact: "用户每次主模型失败看到 500 错误页, 失去 fail-soft 体验, 管理员不知道失败率.",
    aiReviewRisk: "把 fail-soft 当成'不严谨', 失去 fail-soft + audit 平衡设计.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "throw 不一定更可靠.",
      D: "有体验与可观测性损失.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 删 parseNemesisReply 强类型解析",
    prompt: "AI 改坏: AI 觉得 'parse 多余' 删 parseNemesisReply, 直接 emit result.text. 后果是?",
    options: [
      { id: "A", text: "前端拿不到 attachments 字段, 主模型输出 JSON 字符串直接给用户, 体验退步" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "前端拿不到 attachments 字段, 主模型输出 JSON 字符串直接给用户, 体验退步.",
      detail: "parseNemesisReply 解析主模型输出 JSON 为结构化 { text, attachments }. 删了直接 emit result.text, 用户看到的是 JSON 字符串 '{\"text\":\"...\",\"attachments\":[...]}', 不是实际回复. 附件字段丢失, 体验严重退步.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, REPLY],
    realWorldImpact: "用户看到 JSON 字符串当回复, 附件丢失, 体验严重退步.",
    aiReviewRisk: "为'简洁'删 parse, 失去结构化响应解析.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "删 parse 不是简洁.",
      D: "有严重体验影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §11.3-2 守门拒绝后仍调主模型",
    prompt: nemesisModelOnGuardReject({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 18,
    }).prompt,
    options: nemesisModelOnGuardReject({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 18,
    }).options,
    correctAnswer: nemesisModelOnGuardReject({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 18,
    }).correctAnswer as { choiceId: string },
    explanation: nemesisModelOnGuardReject({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 18,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, "app/services/nemesis.server.ts"],
    realWorldImpact: "主模型看到 guard.classifierReason / 内部提示 / Memory Canon, 把敏感上下文写进'自然'文案返回前端, 严重泄露.",
    aiReviewRisk: "把拒绝处理当成'文学生成任务', 失去安全事件严肃性.",
    wrongAnswerFeedback: nemesisModelOnGuardReject({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 18,
    }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 引用 §18.3-5 route CSS 全塞 root",
    prompt: remixRouteCssInRoot({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 19,
    }).prompt,
    options: remixRouteCssInRoot({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 19,
    }).options,
    correctAnswer: remixRouteCssInRoot({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 19,
    }).correctAnswer as { choiceId: string },
    explanation: remixRouteCssInRoot({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 19,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY],
    realWorldImpact: "api.nemesis 路由 CSS 全塞 root links, 首屏 +500KB CSS, 移动端 LCP 退到 4s+.",
    aiReviewRisk: "为'省事'破坏 RR 按路由资源分包, 跨页面样式互相影响.",
    wrongAnswerFeedback: remixRouteCssInRoot({
      lessonSlug: "api-entry",
      courseSlug: "site-18-nemesis-api-chain",
      orderIndex: 19,
    }).wrongAnswerFeedback ?? {},
  }),

  // ─── 自由回答 (Q21-Q22) ────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释主模型调用 + 解析 + 白名单的完整链路",
    prompt: "用自己的话解释 callNemesisModel + parseNemesisReply + ensureNemesisFoodVideoAttachment 的完整链路, 为什么三步必须分开.",
    options: [],
    correctAnswer: {
      text: "三步职责正交: (1) callNemesisModel 调主模型, 返回 result 含 text / provider / model / queryType / fallbackUsed / finishReason 等元数据, 不解析, 保持原始调用链 metadata. (2) parseNemesisReply 解析 result.text 为 { text, attachments } 结构化, 强类型, 解析失败抛错. (3) ensureNemesisFoodVideoAttachment 走白名单 catalog, 过滤 attachments, 防止模型塞任意外链 (timu.MD §11.3-6). 三步分开的好处: (1) parse 失败不影响主模型 metadata 记录. (2) 白名单独立, 替换 catalog 不影响 parse 逻辑. (3) 三步各自的错误隔离, 一个失败不影响其他. 任何一步被删都引入新漏洞: 删 parse 失去结构化; 删白名单受外链注入; 删 callNemesisModel 主模型就调不到.",
    },
    explanation: {
      short: "三步职责: 调模型 / 解析 / 白名单, 错误隔离 + 关注点分离.",
      detail: "三步分开是 backend 的标准模式, 每步独立可测可替换, 错误隔离让一行失败不拖垮整个请求.",
    },
    abilityTags: ["bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 ensureNemesisFoodVideoAttachment 删了, 直接 emit parsed.attachments, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "ensureNemesisFoodVideoAttachment 是附件白名单, 删了之后模型被 prompt 注入可以塞任意外链 (https://attacker.example/x.png), 渲染时变外站图片, 触发钓鱼 / 跟踪像素 (timu.MD §11.3-6 经典反例). 必须保留白名单, attachment URL 必须是 catalog 内受控来源.",
    },
    explanation: {
      short: "审查点: 附件必须白名单, 不可信任模型输出.",
      detail: "好的 review 指出 (1) timu.MD §11.3-6 反例 (2) 实际攻击路径 (3) attachment 必须 catalog 受控 (4) 给出明确保留.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, VIDEO],
  }),
];
