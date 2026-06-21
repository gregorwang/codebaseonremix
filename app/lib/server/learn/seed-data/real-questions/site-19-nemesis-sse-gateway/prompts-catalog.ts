/**
 * Real questions for site-19-nemesis-sse-gateway / prompts-catalog.
 *
 * Anchor: remix/app/nemesis/system-prompt.server.ts (primary)
 *          + remix/app/nemesis/classifier-prompt.server.ts
 *          + remix/app/nemesis/query-router-prompt.server.ts
 *          + remix/app/nemesis/grok-roast-prompt.server.ts
 *          + remix/app/nemesis/quote-catalog.server.ts
 *          + remix/app/nemesis/video-catalog.ts
 *          + remix/app/nemesis/guard-replies.ts
 *          + remix/app/nemesis/memory-canon.server.ts
 *
 * 学习目标: prompt/catalog 是改人格、加 quote、换 persona 的入口.
 * system prompt 实际 lives 在哪里, 为什么 catalogs 是 server-only,
 * 为什么 LLM 永远看不到 raw catalog 数据结构,
 * guard-replies / memory-canon / video-catalog 如何组成安全外围,
 * 为什么手改 generated 文件是坏的.
 *
 * 题目数: 22.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import {
  nemesisModelOnGuardReject,
  nemesisClassifierReasonLeak,
  nemesisUrlTrustBreak,
  nemesisGrokFallbackBreak,
} from "../recipes";

const PRIMARY = "app/nemesis/system-prompt.server.ts";
const CLASSIFIER = "app/nemesis/classifier-prompt.server.ts";
const ROUTER = "app/nemesis/query-router-prompt.server.ts";
const ROAST = "app/nemesis/grok-roast-prompt.server.ts";
const QUOTE = "app/nemesis/quote-catalog.server.ts";
const VIDEO = "app/nemesis/video-catalog.ts";
const GUARD_REPLIES = "app/nemesis/guard-replies.ts";
const MEMORY = "app/nemesis/memory-canon.server.ts";
const TOUCHED = [PRIMARY, CLASSIFIER, ROUTER, ROAST, QUOTE, VIDEO, GUARD_REPLIES, MEMORY];

const RECIPE_CTX = {
  lessonSlug: "prompts-catalog",
  courseSlug: "site-19-nemesis-sse-gateway",
  primaryFile: PRIMARY,
} as const;

const q16 = nemesisModelOnGuardReject({ ...RECIPE_CTX, orderIndex: 15 });
const q17 = nemesisClassifierReasonLeak({ ...RECIPE_CTX, orderIndex: 16 });
const q18 = nemesisUrlTrustBreak({ ...RECIPE_CTX, orderIndex: 17 });
const q19 = nemesisGrokFallbackBreak({ ...RECIPE_CTX, orderIndex: 18 });

const PROMPT_ASSEMBLY_CODE = `1 const parts = [];
2 parts.push(NEMESIS_SYSTEM_PROMPT);
3 parts.push(buildNemesisQuotePromptAppendix(candidates));
4 parts.push(memoryCanonHeader + memoryCanon);
5 const finalPrompt = parts.join(separator);
6 if (route === "grok_roast") {
7   finalPrompt = NEMESIS_GROK_ROAST_PROMPT;
8 }`;

export const promptsCatalogQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 system-prompt.server.ts 的角色",
    prompt: "NEMESIS_SYSTEM_PROMPT 在 Nemesis pipeline 中承担什么角色?",
    options: [
      { id: "A", text: "主模型最终 system prompt 的人格总纲，定义 Nemesis 的口吻、判断方式、安全边界和记忆使用规则" },
      { id: "B", text: "守门分类器的提示词" },
      { id: "C", text: "查询路由的提示词" },
      { id: "D", text: "前端展示的自我介绍文案" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "system-prompt.server.ts 是 Nemesis 人格总纲，不是分类器、不是路由、更不是前端文案。",
      detail: "L1-237: NEMESIS_SYSTEM_PROMPT 定义了 Nemesis 的核心角色目标、记忆使用方式、影子口吻、回答结构、标签与身份判断、来访者身份与社交直觉、黑色幽默与安全边界、不确定性处理等。它是主模型调用时的 system message 主体，被 service 层拼接 Memory Canon 和 quote 附录后发给模型。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 classifier-prompt.server.ts 的角色",
    prompt: "NEMESIS_CLASSIFIER_PROMPT 的职责是?",
    options: [
      { id: "A", text: "守门分类器 — 只决定消息是否允许继续到 Nemesis chat，返回 PASS_TO_GEMINI / CLARIFY / REFUSE + category + confidence" },
      { id: "B", text: "主模型 system prompt" },
      { id: "C", text: "查询路由分类" },
      { id: "D", text: "前端渲染" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "classifier-prompt 是守门分类器，不回答用户，只输出 JSON 决策。",
      detail: "L1-40: classifier prompt 明确声明 'Your task is not to answer the user. Your task is only to decide whether the latest user message is allowed to proceed to Nemesis chat.' 返回 JSON 含 mode / category / confidence / reason / shouldAudit。它是第一道安全闸门。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: CLASSIFIER,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [CLASSIFIER],
  }),
  q({
    type: "single_choice",
    title: "Q3 query-router-prompt.server.ts 的角色",
    prompt: "NEMESIS_QUERY_ROUTER_PROMPT 的职责是?",
    options: [
      { id: "A", text: "查询路由 — 按认知难度分类 queryType (FACT/REASONING/COMPLEX/STYLE/ROAST/FOLLOW_UP) 并选择 preferredRoute (gemini_lite / grok_complex / grok_roast) + quoteTags/quoteIntensity" },
      { id: "B", text: "守门安全判断" },
      { id: "C", text: "主模型回答" },
      { id: "D", text: "前端状态管理" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "query-router 是第二道编排层：分类 + 选模型 + quote 语义标签。",
      detail: "L1-206: query-router prompt 声明 'Your task is only to classify the latest user message for routing, quote hints, and audit.' 它返回 queryType / preferredRoute / confidence / reason / quoteTags / quoteIntensity。route 决定走 gemini_lite / grok_complex / grok_roast，quoteTags 供服务端 quote-catalog 检索候选。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROUTER,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [ROUTER],
  }),
  q({
    type: "single_choice",
    title: "Q4 grok-roast-prompt.server.ts 的角色",
    prompt: "NEMESIS_GROK_ROAST_PROMPT 何时被使用?",
    options: [
      { id: "A", text: "仅当 query-router 返回 preferredRoute = 'grok_roast' 且用户触发 roast 场景时，作为主模型 system prompt 的替换 persona" },
      { id: "B", text: "默认 system prompt" },
      { id: "C", text: "守门分类器" },
      { id: "D", text: "前端动画" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "grok-roast prompt 是条件替换 persona，不是默认。",
      detail: "L1-82: grok-roast prompt 定义了贴吧老哥嘴臭模式，包含直球辱骂、抽象阴阳、小学生刷屏三层风格，以及孤独摇滚≠百合、原神≠身份标签、官配不吃等具体 roast 场景。它只在 query-router 判定为 ROAST_TRIGGER 时替换默认 system prompt，平时不生效。这是 persona 切换的入口。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROAST,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [ROAST],
  }),
  q({
    type: "single_choice",
    title: "Q5 guard-replies.ts 的角色",
    prompt: "NEMESIS_GUARD_FIXED_REPLIES 的作用?",
    options: [
      { id: "A", text: "守门 CLARIFY / REFUSE 模式的预写固定文案，不调用主模型，防止守门内部信息泄露" },
      { id: "B", text: "主模型回答模板" },
      { id: "C", text: "前端错误提示" },
      { id: "D", text: "路由配置" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "guard-replies 是固定文案，不是模型生成，防止内部信息泄露。",
      detail: "L1-11: NEMESIS_GUARD_FIXED_REPLIES 包含 CLARIFY 和 REFUSE 两段预写文案。当 classifier 返回 REFUSE 或 CLARIFY 时，直接取固定文案返回，不调用主模型。这是安全设计：主模型一旦看到 classifierReason / guard 内部状态，可能把它写进回复泄露出去。固定文案 = 零泄露风险。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: GUARD_REPLIES,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [GUARD_REPLIES],
  }),
  q({
    type: "single_choice",
    title: "Q6 附件与 quote 的来源",
    prompt: "Nemesis 回复中的视频附件和 quote 引用分别来自哪里?",
    options: [
      { id: "A", text: "video-catalog.ts (受控视频白名单) + quote-catalog.server.ts (服务端 quote 候选库) + sticker-manifest.json (受控表情包)；三者都是 server-only，前端只收到最终 attachment 和已替换的 quote 文本" },
      { id: "B", text: "前端 localStorage" },
      { id: "C", text: "模型自由生成任意 URL" },
      { id: "D", text: "D1 数据库实时查询" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "附件来自 server-only catalogs，前端只消费最终结果。",
      detail: "video-catalog.ts 维护 NEMESIS_VIDEO_CATALOG，仅当消息匹配食物话题时才插入受控视频 URL；quote-catalog.server.ts 维护 NEMESIS_QUOTE_CATALOG，服务端按 tags/triggers/intensity 筛选候选，生成 [Nemesis Quote Candidates] 附录插入 system prompt；sticker-manifest.json 是受控表情包白名单。三者都在服务端，LLM 看不到 raw catalog 结构，前端也看不到，只收到 parse + 白名单过滤后的最终 attachment 数组和替换后的文本。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: VIDEO,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [VIDEO, QUOTE, "app/nemesis/sticker-manifest.json"],
  }),

  // ─── 代码阅读 (Q7-Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: 拼装最终 system prompt",
    prompt: "下面哪一行把 system prompt + quote 附录 + Memory Canon 拼成最终喂给模型的字符串?",
    code: PROMPT_ASSEMBLY_CODE,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "parts.push(NEMESIS_SYSTEM_PROMPT);" },
      { id: "L5", lineNumber: 5, text: "const finalPrompt = parts.join(separator);" },
      { id: "L7", lineNumber: 7, text: "finalPrompt = NEMESIS_GROK_ROAST_PROMPT;" },
    ],
    correctAnswer: { lineId: "L5" },
    explanation: {
      short: "L5: join 操作把多个 prompt 部件拼成最终字符串。",
      detail: "system prompt 本身是分部件管理的：NEMESIS_SYSTEM_PROMPT 是人格总纲，buildNemesisQuotePromptAppendix 生成 quote 候选附录，memoryCanon 是隐藏记忆材料。L5 的 join 是最终拼装点，决定模型实际看到什么。改这里等于改模型输入边界。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, QUOTE, MEMORY],
  }),
  q({
    type: "line_pick",
    title: "Q8 关键行: persona 切换门",
    prompt: "下面哪一行决定用 grok_roast persona 替换默认 system prompt?",
    code: PROMPT_ASSEMBLY_CODE,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "parts.push(NEMESIS_SYSTEM_PROMPT);" },
      { id: "L5", lineNumber: 5, text: "const finalPrompt = parts.join(separator);" },
      { id: "L7", lineNumber: 7, text: "finalPrompt = NEMESIS_GROK_ROAST_PROMPT;" },
    ],
    correctAnswer: { lineId: "L7" },
    explanation: {
      short: "L7: route === 'grok_roast' 时完全替换 system prompt，实现 persona 切换。",
      detail: "grok_roast 不是覆盖部分规则，而是整 prompt 替换。L7 的赋值意味着默认 system prompt 的人格总纲、quote 附录、Memory Canon 全部被 grok-roast prompt 取代。这是强 persona 切换：模型输入从'影子'变成'贴吧老哥'。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROAST,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [ROAST, PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q9 quote catalog 的 prompt 插入点",
    prompt: "buildNemesisQuotePromptAppendix(candidates) 的输出被插入到 system prompt 的哪个位置?",
    options: [],
    correctAnswer: { values: { v: "NEMESIS_SYSTEM_PROMPT 之后、Memory Canon 之前" } },
    blanks: [
      {
        id: "v",
        placeholder: "插入位置",
        acceptedAnswers: [
          "NEMESIS_SYSTEM_PROMPT 之后、Memory Canon 之前",
          "system prompt 之后 memory canon 之前",
          "人格总纲之后隐藏记忆之前",
          "base prompt 之后 memory 之前",
        ],
      },
    ],
    explanation: {
      short: "quote 附录插在 system prompt 和 Memory Canon 之间。",
      detail: "拼装顺序决定了模型阅读的优先级：先读人格总纲，再读可用 quote 候选（风格素材），最后读隐藏记忆材料。quote 候选放在 Memory Canon 之前，让模型在已有语境下判断哪条 quote 适合引用；如果放错顺序，模型可能先被记忆材料带偏，再看到 quote 要求。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: QUOTE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [QUOTE, PRIMARY, MEMORY],
  }),
  q({
    type: "multi_choice",
    title: "Q10 quote-catalog 导出的核心字段",
    prompt: "NemesisQuote 类型包含哪些字段? (多选)",
    options: [
      { id: "A", text: "id / text / tags / triggers / avoid / intensity" },
      { id: "B", text: "url / posterUrl / mime" },
      { id: "C", text: "userId / createdAt" },
      { id: "D", text: "quoteCandidates / score" },
    ],
    correctAnswer: { choiceIds: ["A"] },
    explanation: {
      short: "quote-catalog 导出的 NemesisQuote 含 6 个核心字段：id text tags triggers avoid intensity。",
      detail: "quote-catalog.server.ts L5-12: NemesisQuote = { id, text, tags, triggers, avoid, intensity }. id 是引用标记，text 是原文，tags 是语义标签，triggers 是匹配关键词，avoid 是禁用场景，intensity 是情感强度。score 和 quoteCandidates 是 selectNemesisQuoteCandidates 的运行时计算结果，不是 catalog 的静态字段。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: QUOTE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [QUOTE],
  }),
  q({
    type: "multi_choice",
    title: "Q11 video-catalog 导出的核心字段",
    prompt: "NemesisVideoEntry 类型包含哪些字段? (多选)",
    options: [
      { id: "A", text: "id / title / url / posterUrl / mime / semantics" },
      { id: "B", text: "text / tags / triggers / avoid / intensity" },
      { id: "C", text: "userId / createdAt" },
      { id: "D", text: "quoteCandidates / score" },
    ],
    correctAnswer: { choiceIds: ["A"] },
    explanation: {
      short: "video-catalog 导出的 NemesisVideoEntry 含 6 个字段：id title url posterUrl mime semantics。",
      detail: "video-catalog.ts L3-10: NemesisVideoEntry = { id, title, url, posterUrl?, mime, semantics }. semantics 是话题语义标签，用于服务端判断消息是否匹配视频主题。url 来自受控 OSS/CDN，不是模型生成。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: VIDEO,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [VIDEO],
  }),

  // ─── 状态推理 (Q12-Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 persona 切换: grok roast 路径",
    prompt: "用户消息触发 roast 场景，query-router 返回 ROAST_TRIGGER / grok_roast。完整 prompt 组装与模型调用路径?",
    options: [
      { id: "guard-allow", text: "guardNemesisMessage 返回 mode=allow" },
      { id: "router-roast", text: "query-router 返回 ROAST_TRIGGER / preferredRoute grok_roast" },
      { id: "prompt-replace", text: "NEMESIS_GROK_ROAST_PROMPT 替换默认 system prompt" },
      { id: "classifier-refuse", text: "classifier 返回 REFUSE" },
      { id: "model-call", text: "调用 Grok 主模型生成 roast 回复" },
      { id: "emit-done", text: "emit done 返回最终文本" },
    ],
    correctAnswer: { pathIds: ["guard-allow", "router-roast", "prompt-replace", "model-call", "emit-done"] },
    explanation: {
      short: "allow → router roast → prompt 替换 → Grok 调用 → done，不经过 classifier REFUSE。",
      detail: "roast 是正常业务路径，不是拒绝路径。guard allow → query-router 判定 ROAST_TRIGGER → system prompt 被替换为 grok-roast prompt → 调用 Grok 模型 → parse → ensure attachment → emit done。classifier-refuse 是错误分支，不会出现在 roast 路径上。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROAST,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [ROAST, ROUTER, PRIMARY],
  }),
  q({
    type: "branch_trace",
    title: "Q13 persona 默认: 正常对话路径",
    prompt: "用户问普通问题，query-router 返回 REASONING_QUERY / gemini_lite。完整 prompt 组装路径?",
    options: [
      { id: "guard-allow", text: "guardNemesisMessage 返回 mode=allow" },
      { id: "router-reasoning", text: "query-router 返回 REASONING_QUERY / preferredRoute gemini_lite" },
      { id: "prompt-base", text: "NEMESIS_SYSTEM_PROMPT 作为人格总纲基底" },
      { id: "quote-insert", text: "buildNemesisQuotePromptAppendix 插入 quote 候选" },
      { id: "memory-insert", text: "Memory Canon 附加到 prompt" },
      { id: "prompt-roast", text: "使用 NEMESIS_GROK_ROAST_PROMPT" },
      { id: "model-call", text: "调用 gemini_lite 主模型" },
      { id: "emit-done", text: "emit done 返回最终文本" },
    ],
    correctAnswer: { pathIds: ["guard-allow", "router-reasoning", "prompt-base", "quote-insert", "memory-insert", "model-call", "emit-done"] },
    explanation: {
      short: "默认路径：allow → router → system prompt + quote + memory → gemini_lite → done。",
      detail: "默认 persona 路径组装最完整：system prompt 提供人格总纲，quote appendix 提供可选风格素材，Memory Canon 提供隐藏记忆语境，三者共同构成模型输入。grok-roast 是替换而非叠加，所以 prompt-roast 不在这条路径上。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 memory-canon 抛错路径",
    prompt: "如果 Memory Canon 读取或解析时抛错，pipeline 行为?",
    options: [
      { id: "A", text: "callNemesisModel 抛 NemesisModelError → catch → emit('error', { message }) → finally controller.close" },
      { id: "B", text: "静默忽略，继续生成没有记忆的回复" },
      { id: "C", text: "返回 500 JSON" },
      { id: "D", text: "前端自动重试" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Memory Canon 是模型调用的前置依赖，抛错会中断 pipeline 走 SSE error 事件。",
      detail: "memory-canon.server.ts 导出 NEMESIS_MEMORY_CANON 字符串，service 层在拼装 prompt 时读取。如果文件缺失、解析失败或内存溢出，拼装函数抛错，被 api.nemesis.ts 的 catch 捕获，emit('error', ...) 后 finally close。SSE 模式下不会返回 500 JSON（头已发出），也不会静默忽略（记忆是人格核心材料）。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: MEMORY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [MEMORY, PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 video URL 白名单",
    prompt: "模型输出中包含 video URL 时，必须通过哪一层白名单?",
    options: [
      { id: "A", text: "ensureNemesisFoodVideoAttachment — 对照 NEMESIS_VIDEO_CATALOG 过滤，仅保留 catalog 中的受控 URL" },
      { id: "B", text: "直接信任模型输出" },
      { id: "C", text: "前端过滤" },
      { id: "D", text: "D1 查询" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "video URL 必须走 video-catalog 白名单，不信任模型字符串。",
      detail: "video-catalog.ts L91-93: ensureNemesisFoodVideoAttachment 把模型输出的 attachments 和消息内容一起校验，只有 NEMESIS_VIDEO_CATALOG 中登记的受控 URL 才能通过。模型可以被 prompt 注入输出任意 URL，直接信任等于开放钓鱼/跟踪像素入口。白名单是独立的边界层。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: VIDEO,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [VIDEO, PRIMARY],
  }),

  // ─── AI 改坏 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 引用 §11.3-2 守门拒绝后仍调主模型",
    prompt: q16.prompt,
    options: q16.options,
    correctAnswer: q16.correctAnswer,
    explanation: q16.explanation,
    abilityTags: q16.abilityTags,
    sourceFilePath: q16.sourceFilePath,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: q16.touchedFiles,
    realWorldImpact: q16.realWorldImpact,
    aiReviewRisk: q16.aiReviewRisk,
    wrongAnswerFeedback: q16.wrongAnswerFeedback,
  }),
  q({
    type: "ai_review",
    title: "Q17 引用 §11.3-3 分类器理由外泄",
    prompt: q17.prompt,
    options: q17.options,
    correctAnswer: q17.correctAnswer,
    explanation: q17.explanation,
    abilityTags: q17.abilityTags,
    sourceFilePath: q17.sourceFilePath,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: q17.touchedFiles,
    realWorldImpact: q17.realWorldImpact,
    aiReviewRisk: q17.aiReviewRisk,
    wrongAnswerFeedback: q17.wrongAnswerFeedback,
  }),
  q({
    type: "ai_review",
    title: "Q18 引用 §11.3-6 信任模型输出 URL",
    prompt: q18.prompt,
    options: q18.options,
    correctAnswer: q18.correctAnswer,
    explanation: q18.explanation,
    abilityTags: q18.abilityTags,
    sourceFilePath: q18.sourceFilePath,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: q18.touchedFiles,
    realWorldImpact: q18.realWorldImpact,
    aiReviewRisk: q18.aiReviewRisk,
    wrongAnswerFeedback: q18.wrongAnswerFeedback,
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §11.3-8 Grok 默认 fallback 漂移",
    prompt: q19.prompt,
    options: q19.options,
    correctAnswer: q19.correctAnswer,
    explanation: q19.explanation,
    abilityTags: q19.abilityTags,
    sourceFilePath: q19.sourceFilePath,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: q19.touchedFiles,
    realWorldImpact: q19.realWorldImpact,
    aiReviewRisk: q19.aiReviewRisk,
    wrongAnswerFeedback: q19.wrongAnswerFeedback,
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 quote catalog 结构暴露给前端",
    prompt: "AI 改坏: AI 为了让前端显示 '本轮引用了哪条 quote'，把 quote-catalog.server.ts 的原始数据结构（包括 triggers、avoid、intensity、score 算法）通过 SSE done 事件返回给前端。后果是?",
    options: [
      { id: "A", text: "前端拿到 quote 筛选逻辑和内部 scoring 规则，可反向构造消息骗取特定 quote；catalog 结构泄露等于把服务端人格材料的一部分暴露出去" },
      { id: "B", text: "前端渲染更快" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "quote catalog 内部结构是 server-only 资产，暴露给前端等于开放操纵面。",
      detail: "triggers 和 avoid 列表是 quote 筛选的核心逻辑。攻击者分析 triggers 后，可以精准构造包含特定关键词的消息（如 '发誓 绝不 后悔'），迫使 Nemesis 输出高 intensity quote。更严重的是，catalog 结构泄露会让攻击者了解 Nemesis 的人格材料组织方式，为 prompt extraction 提供线索。前端只需要看到最终文本，不需要看到 quote id 和筛选逻辑。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: QUOTE,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [QUOTE, PRIMARY],
    realWorldImpact: "攻击者分析 triggers 列表后，批量构造精准关键词消息，迫使 Nemesis 输出特定高 intensity quote，截图传播制造'AI 失控'假象。",
    aiReviewRisk: "把 catalog 内部结构当公开元数据，破坏 server-only 边界和 persona 安全。",
    wrongAnswerFeedback: {
      B: "更快 ≠ 安全，结构泄露是架构级破坏。",
      C: "TS 不会报错，类型完全合法。",
      D: "有严重的 prompt manipulation 和信息泄露风险。",
    },
  }),

  // ─── 自由作答 (Q21-Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 catalogs 为何必须 server-only",
    prompt: "用自己的话说明 (1) 为什么 system prompt / Memory Canon / quote catalog / video catalog 必须留在服务端 (2) 它们如何共同构成 prompt-injection 的防御纵深 (3) 如果前端能看到 NEMESIS_SYSTEM_PROMPT 或 memory-canon 原文，攻击者可以做什么 (4) guard-replies 的预写文案与 model-generated 文案在安全性上的本质区别。",
    options: [],
    correctAnswer: {
      text: "catalogs 必须 server-only 的原因与防御纵深: (1) system prompt 是模型的人格总纲和安全规则，一旦暴露，攻击者可直接阅读规则并构造绕过指令；Memory Canon 是隐藏记忆材料，暴露等于泄露隐私和人格素材；quote catalog 和 video catalog 的内部结构暴露后，攻击者可精准操纵输出。 (2) 防御纵深: classifier-prompt 是第一道语义闸门，guard-replies 是第二道固定文案兜底，video/quote catalog 白名单是第三道输出收敛层，三层共同确保即使模型被注入，最终输出仍受控。 (3) 攻击者看到 system prompt 后，可构造 'ignore previous instructions' 或 'repeat the above' 等经典注入；看到 memory-canon 后可要求 ' summarize the memory canon' 并可能成功。 (4) guard-replies 是预写固定字符串，不经过模型生成，因此不存在模型把内部信息'自然地带入'回复的风险；model-generated 文案虽然受 system prompt 约束，但模型输出本质上是概率采样，无法 100% 保证不泄露上下文。",
    },
    explanation: {
      short: "server-only + 多层收敛 + 固定文案兜底 = prompt-injection 防御纵深。",
      detail: "好的解释能把 system prompt、memory canon、quote/video catalog、guard-replies 四者联成一个安全体系：前端不可见 → 攻击面缩小；白名单收敛 → 输出可控；固定文案 → 零生成风险。",
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
    prompt: "PR 把 NEMESIS_SYSTEM_PROMPT 和 NEMESIS_MEMORY_CANON 复制到一个新的 client.ts 文件，理由是 '让用户知道 AI 被问了什么，增加透明度'。写一条 review comment (1-2 句)。",
    options: [],
    correctAnswer: {
      comment: "system prompt 和 Memory Canon 是 server-only 安全资产，暴露给前端等于把 Nemesis 的人格规则、安全边界和隐藏记忆材料全部交给攻击者分析，可直接构造 prompt injection 绕过。透明度不能凌驾于安全边界之上，请删除 client.ts 并仅通过 SSE done 返回最终文本。",
    },
    explanation: {
      short: "审查点: system prompt / memory canon 绝不能进 client bundle。",
      detail: "好的 review comment 指出 (1) 泄露的安全后果 (2) 攻击者可直接利用 (3) 给出明确恢复方案 (4) 用'透明度不能凌驾安全'作为设计原则。",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, MEMORY],
  }),
];
