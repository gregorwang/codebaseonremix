/**
 * Real questions for site-19-nemesis-sse-gateway / sse-capstone.
 *
 * Anchor: remix/app/lib/nemesis-ai-gateway.server.ts (provider swap + env vars)
 *          + remix/app/services/nemesis.server.ts (selectNemesisModel + fallback)
 *          + remix/app/routes/api.nemesis.ts (SSE wrap)
 *          + remix/app/lib/nemesis-sse.server.ts (SSE protocol)
 *          + remix/app/hooks/useNemesisChat.client.ts (client progress)
 * 学习目标: 换模型提供商的端到端链路, gateway 与环境变量驱动 provider 切换,
 * 5 层拆分使得只有 gateway + env 需要改动.
 *
 * 题目数: 22.
 *
 * 引用 recipe: nemesisGrokFallbackBreak (§11.3-8) + nemesisProviderErrorSwallow (§11.3-5)
 *              + tsServerImportInClient (§12.2-TS-3) + tsSseEventWiden (§12.2-TS-4).
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import {
  nemesisGrokFallbackBreak,
  nemesisProviderErrorSwallow,
  tsServerImportInClient,
  tsSseEventWiden,
} from "../recipes";

const PRIMARY = "app/lib/nemesis-ai-gateway.server.ts";
const SSE = "app/lib/nemesis-sse.server.ts";
const SERVICE = "app/services/nemesis.server.ts";
const ROUTE = "app/routes/api.nemesis.ts";
const CLIENT = "app/hooks/useNemesisChat.client.ts";
const SSE_CLIENT = "app/lib/nemesis-sse.client.ts";
const TOUCHED = [PRIMARY, SSE, SERVICE, ROUTE, CLIENT, SSE_CLIENT];

export const sseCapstoneQuestions: RealQ[] = [
  // ─── 基础识别 (Q1–Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 端到端 5 层",
    prompt: "Nemesis 请求从 route 到 client 的 5 层是?",
    options: [
      {
        id: "A",
        text: "1. route (api.nemesis) → 2. SSE server (nemesis-sse.server) → 3. nemesis.server (select + fallback) → 4. ai-gateway.server (URL / auth / provider) → 5. client (useNemesisChat)",
      },
      { id: "B", text: "1. route → 2. D1 → 3. client" },
      { id: "C", text: "1. route → 2. KV → 3. client" },
      { id: "D", text: "只有 3 层" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "5 层: route → SSE server → nemesis.server → ai-gateway.server → client.",
      detail:
        "api.nemesis.ts 是入口 + SSE 包裹; nemesis-sse.server.ts 负责 ReadableStream + encode; nemesis.server.ts 负责 selectNemesisModel + fallback 链 + onProgress; nemesis-ai-gateway.server.ts 负责 resolve URL + build headers + provider-specific auth; useNemesisChat.client.ts 负责解析 SSE + setRequestStage. 换 provider 时只需改第 4 层 + env, 其他层不动.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: ROUTE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 gateway ID 环境变量",
    prompt: "AI Gateway 的 gateway ID 从哪个 env var 读取?",
    options: [
      { id: "A", text: "NEMESIS_AI_GATEWAY_ID" },
      { id: "B", text: "CF_AIG_TOKEN" },
      { id: "C", text: "CLOUDFLARE_ACCOUNT_ID" },
      { id: "D", text: "NEMESIS_GEMINI_LITE_MODEL" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "NEMESIS_AI_GATEWAY_ID 决定 gateway 实例, 没有它则走直连或抛错.",
      detail:
        "ai-gateway.server.ts L39-41: getGatewayId() 读取 NEMESIS_AI_GATEWAY_ID. 没有配置时 resolveCompatChatCompletionsTarget 抛错 'NEMESIS_AI_GATEWAY_ID is not configured'. 这是 gateway 层的第一道配置.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 compat model ID 格式",
    prompt:
      "ai-gateway.server.ts 里 toCompatModelId('google-ai-studio', 'gemini-3.1-flash-lite') 返回?",
    options: [
      { id: "A", text: "google-ai-studio/gemini-3.1-flash-lite" },
      { id: "B", text: "gemini-3.1-flash-lite" },
      { id: "C", text: "google-ai-studio:gemini-3.1-flash-lite" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "provider/model 是 AI Gateway compat 的 model 字段格式.",
      detail:
        "ai-gateway.server.ts L100-102: toCompatModelId 返回 `${provider}/${model}`. 这是 Cloudflare AI Gateway OpenAI-compat 端点要求的 model 标识格式, 直接透传给 gateway.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q4 NemesisCompatProvider 联合",
    prompt: "NemesisCompatProvider 支持的字面量 provider 有哪些?",
    options: [
      { id: "A", text: "google-ai-studio | deepseek | grok" },
      { id: "B", text: "gemini | deepseek | xai" },
      { id: "C", text: "openai | anthropic | google" },
      { id: "D", text: "string (任意字符串)" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "字面量联合: google-ai-studio | deepseek | grok.",
      detail:
        "ai-gateway.server.ts L8: export type NemesisCompatProvider = 'google-ai-studio' | 'deepseek' | 'grok'. 这是 gateway 层对 provider 的白名单, 任何不在联合内的 provider 都会在 TS 编译期报错, 防止拼写错误或非法 provider 流入.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q5 Gemini Lite 模型 env 优先级",
    prompt: "getGeminiLiteModel() 的取值优先级 (高 → 低) 是?",
    options: [],
    correctAnswer: {
      values: {
        v: "NEMESIS_GEMINI_LITE_MODEL > NEMESIS_GEMINI_MODEL > DEFAULT_GEMINI_LITE_MODEL (gemini-3.1-flash-lite)",
      },
    },
    blanks: [
      {
        id: "v",
        placeholder: "优先级链",
        acceptedAnswers: [
          "NEMESIS_GEMINI_LITE_MODEL > NEMESIS_GEMINI_MODEL > DEFAULT_GEMINI_LITE_MODEL (gemini-3.1-flash-lite)",
          "env NEMESIS_GEMINI_LITE_MODEL / env NEMESIS_GEMINI_MODEL / 默认值 gemini-3.1-flash-lite",
        ],
      },
    ],
    explanation: {
      short: "三级回退: 专用 env > 通用 env > 硬编码默认值.",
      detail:
        "nemesis.server.ts L113-115: getGeminiLiteModel 先读 NEMESIS_GEMINI_LITE_MODEL, 没有再读 NEMESIS_GEMINI_MODEL, 最后默认 gemini-3.1-flash-lite. 这是 env 驱动的模型切换: 运维只需改 env 即可换模型, 不需要改代码.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE, PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 buildCompatHeaders 认证优先级",
    prompt: "buildCompatHeaders 的认证优先级?",
    options: [
      {
        id: "A",
        text: "先读 CF_AIG_TOKEN (gateway auth), 没有再读 provider 专属 API key (GOOGLE_AI_API_KEY / DEEPSEEK_API_KEY / XAI_API_KEY)",
      },
      { id: "B", text: "只读 provider 专属 API key" },
      { id: "C", text: "只读 CF_AIG_TOKEN" },
      { id: "D", text: "不认证" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Gateway auth 优先, 其次 provider BYOK key.",
      detail:
        "ai-gateway.server.ts L128-156: 先尝试 getGatewayAuthToken (CF_AIG_TOKEN / NEMESIS_AI_GATEWAY_TOKEN / CLOUDFLARE_API_TOKEN). 有则走 gateway auth + BYOK alias. 没有则回退到 provider 专属 API key. 这是'先 gateway 后直连'的设计, 保证生产环境统一走 gateway 审计.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  // ─── 代码阅读 (Q7–Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: selectNemesisModel 主模型选择",
    prompt: "callNemesisModel 里哪一行是 '选择主模型' 的关键?",
    code:
      "1 export async function callNemesisModel(input: {...}) {\n" +
      "2   const primary = await selectNemesisModel(input);\n" +
      "3   input.onProgress?.({...});\n" +
      "4\n" +
      "5   const attempts = [primary, ...fallbackRoutes(primary.route).map((route) => routeToDecision(route, \"Fallback route\"))];",
    options: [],
    linePickLines: [
      {
        id: "L2",
        lineNumber: 2,
        text: "const primary = await selectNemesisModel(input);",
      },
      {
        id: "L5",
        lineNumber: 5,
        text: 'const attempts = [primary, ...fallbackRoutes(primary.route).map((route) => routeToDecision(route, "Fallback route"))];',
      },
    ],
    correctAnswer: { lineId: "L2" },
    explanation: {
      short: "L2 是主模型选择入口, L5 是 fallback 链组装.",
      detail:
        "selectNemesisModel 内部可能走 forceRouteFromEnv 或 query router, 返回的 primary 决定 provider / model / route. L5 只是把 primary 和 fallback 拼成 attempts 数组. 关注点分离: 选择逻辑在 selectNemesisModel, fallback 组装在 callNemesisModel.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE],
  }),
  q({
    type: "line_pick",
    title: "Q8 关键行: fallback 状态 emit",
    prompt: "callNemesisModel 里 fallback 触发时, 哪一行 emit 了 fallback 状态?",
    code:
      "1   if (attemptIndex > 0) {\n" +
      "2     const previousError = errors[errors.length - 1];\n" +
      "3     const fallbackReason = previousError\n" +
      "4       ? `${previousError.provider} 返回 ${previousError.status}`\n" +
      '5       : "主模型暂时不可用";\n' +
      "6\n" +
      "7     input.onProgress?.({\n" +
      '8       step: "fallback",\n' +
      '9       state: "running",\n' +
      "10      label: `${fallbackReason}，正在尝试备用模型…`,\n" +
      "11      attempt: attemptIndex + 1,\n" +
      "12      modelProvider: attempt.provider,\n" +
      "13      modelName: attempt.model,\n" +
      "14      modelRoute: attempt.route,\n" +
      "15    });\n" +
      "16  }",
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "if (attemptIndex > 0) {" },
      { id: "L7", lineNumber: 7, text: "input.onProgress?.({" },
    ],
    correctAnswer: { lineId: "L7" },
    explanation: {
      short: "L7 是 fallback 状态 emit, 客户端据此显示'正在尝试备用模型'.",
      detail:
        "attemptIndex > 0 表示当前是 fallback 调用. L7-15 构造 fallback 状态事件, 含 attempt 序号 + provider + model. 客户端 applyStatusToProgress 把 fallback step 映射到 generate 进度条, 让用户感知到主模型失败 + 备用模型切换.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE, CLIENT],
  }),
  q({
    type: "line_pick",
    title: "Q9 关键行: onGatewayResolved 再次 emit generate",
    prompt: "callNemesisModel 里, gateway 解析成功后哪一行再次 emit generate 进度?",
    code:
      "1      onGatewayResolved: (resolvedViaGateway: boolean) => {\n" +
      "2         viaGateway = resolvedViaGateway;\n" +
      "3         input.onProgress?.({\n" +
      '4           step: "generate",\n' +
      '5           state: "running",\n' +
      "6           label: `正在经 ${resolvedViaGateway ? \"AI Gateway\" : \"直连\"} 请求 ${formatModelLabel(attempt.provider, attempt.model)}…`,\n" +
      "7           modelProvider: attempt.provider,\n" +
      "8           modelName: attempt.model,\n" +
      "9           modelRoute: attempt.route,\n" +
      "10          viaGateway: resolvedViaGateway,\n" +
      "11        });\n" +
      "12      },",
    options: [],
    linePickLines: [
      {
        id: "L1",
        lineNumber: 1,
        text: "onGatewayResolved: (resolvedViaGateway: boolean) => {",
      },
      { id: "L3", lineNumber: 3, text: "input.onProgress?.({" },
    ],
    correctAnswer: { lineId: "L3" },
    explanation: {
      short:
        "L3 是 gateway 解析成功后的进度 emit, 告诉客户端走 gateway 还是直连.",
      detail:
        "onGatewayResolved 回调在 callGemini / callDeepSeek / callXai 内部触发, 发生在 fetch 之前. L3 emit 含 viaGateway 布尔值, 客户端可在进度条显示 '经 AI Gateway 请求'. 这是 gateway 层与 service 层解耦的体现: service 只消费回调, 不关心 URL 怎么解析.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE, PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q10 DeepSeek 模型 env 优先级",
    prompt: "getDeepSeekModel() 的取值优先级 (高 → 低)?",
    options: [],
    correctAnswer: {
      values: {
        v: "NEMESIS_DEEPSEEK_MODEL > DEFAULT_DEEPSEEK_MODEL (deepseek-v4-flash)",
      },
    },
    blanks: [
      {
        id: "v",
        placeholder: "优先级链",
        acceptedAnswers: [
          "NEMESIS_DEEPSEEK_MODEL > DEFAULT_DEEPSEEK_MODEL (deepseek-v4-flash)",
          "env NEMESIS_DEEPSEEK_MODEL / 默认值 deepseek-v4-flash",
        ],
      },
    ],
    explanation: {
      short: "二级回退: 专用 env > 硬编码默认值.",
      detail:
        "nemesis.server.ts L121-123: getDeepSeekModel 读 NEMESIS_DEEPSEEK_MODEL, 无则默认 deepseek-v4-flash. 换 DeepSeek 模型只需改 env, 无需改代码.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE],
  }),
  q({
    type: "multi_choice",
    title: "Q11 换 provider 时哪些层不动",
    prompt: "把主模型从 Gemini 换成 DeepSeek, 哪些文件 / 逻辑不需要改动? (多选)",
    options: [
      {
        id: "A",
        text: "app/routes/api.nemesis.ts (SSE 包裹层)",
      },
      {
        id: "B",
        text: "app/lib/nemesis-sse.server.ts (SSE 协议层)",
      },
      {
        id: "C",
        text: "app/services/nemesis-guard.server.ts (守门 + 限流)",
      },
      {
        id: "D",
        text: "app/hooks/useNemesisChat.client.ts (客户端进度 + 渲染)",
      },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "换 provider 只需改 gateway + env, route / SSE / guard / client 全部不动.",
      detail:
        "api.nemesis.ts 只包裹 SSE, 不感知 provider; nemesis-sse.server.ts 只处理流协议; guard 在模型调用前执行, 与 provider 无关; client 消费通用 SSE 事件, 只显示 modelProvider / modelName 字段, 不硬编码 provider. 只有 nemesis-ai-gateway.server.ts 需要知道 provider 端点差异, 以及 env 变量驱动模型 ID.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  // ─── 状态推理 (Q12–Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 走 DeepSeek 主模型的完整链路",
    prompt:
      "selectNemesisModel 选择 deepseek, 不走 fallback, 成功返回. 完整的端到端事件流?",
    options: [
      {
        id: "guard-r",
        text: "status: { step: guard, state: running }",
      },
      {
        id: "guard-d",
        text: "status: { step: guard, state: done }",
      },
      {
        id: "route-r",
        text: "status: { step: route, state: running, label: Gemini 意图分类中… }",
      },
      {
        id: "route-d",
        text:
          "status: { step: route, state: done, modelProvider: deepseek, modelName: deepseek-v4-flash }",
      },
      {
        id: "gen-r",
        text: "status: { step: generate, state: running, viaGateway: true }",
      },
      { id: "gen-d", text: "status: { step: generate, state: done }" },
      {
        id: "done",
        text: "done: { text, provider: deepseek, modelRoute: deepseek }",
      },
    ],
    correctAnswer: {
      pathIds: ["guard-r", "guard-d", "route-r", "route-d", "gen-r", "gen-d", "done"],
    },
    explanation: {
      short: "guard → route → generate → done, provider=deepseek, viaGateway=true.",
      detail:
        "DeepSeek 路径: resolveOpenAiCompatTarget('deepseek') → gateway /deepseek/chat/completions → buildCompatHeaders('deepseek') → fetch. onProgress 在 gateway 解析后 emit viaGateway=true. 客户端看到 provider=deepseek, modelName=deepseek-v4-flash. 与 Gemini 路径的唯一差异在第 4 层 (gateway URL + headers) 和 env.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: SERVICE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 gemini_flash 429 → fallback gemini_lite 500 → deepseek 成功",
    prompt:
      "主模型 gemini_flash 429, fallback gemini_lite 500, fallback deepseek 成功. 客户端 SSE 事件序列?",
    options: [
      { id: "guard-d", text: "status: guard done" },
      { id: "route-d", text: "status: route done (gemini_flash)" },
      { id: "gen-flash", text: "status: generate running (gemini_flash)" },
      {
        id: "fb-lite",
        text: "status: fallback running (attempt 2, gemini_lite)",
      },
      { id: "gen-lite", text: "status: generate running (gemini_lite)" },
      {
        id: "fb-deep",
        text: "status: fallback running (attempt 3, deepseek)",
      },
      { id: "gen-deep", text: "status: generate running (deepseek)" },
      { id: "gen-done", text: "status: generate done" },
      {
        id: "done",
        text: "done: { text, fallbackUsed: true, fallbackChain: ['gemini_flash','gemini_lite','deepseek'] }",
      },
    ],
    correctAnswer: {
      pathIds: [
        "guard-d",
        "route-d",
        "gen-flash",
        "fb-lite",
        "gen-lite",
        "fb-deep",
        "gen-deep",
        "gen-done",
        "done",
      ],
    },
    explanation: {
      short:
        "guard → route → generate(flash) → fallback(lite) → generate(lite) → fallback(deep) → generate(deep) → done.",
      detail:
        "callNemesisModel 循环 attempts: primary flash 失败 → shouldTryFallback(429)=true → fallback lite 失败 → shouldTryFallback(500)=true → fallback deepseek 成功. 每次 fallback 前 emit fallback running, 每次 generate 前 emit generate running, 成功 emit generate done + done. 客户端进度条在 generate 步骤来回更新 label, 用户感知到'主模型失败 → 尝试备用 → 成功'.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: SERVICE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 fallback 事件在客户端的映射",
    prompt:
      "SSE 事件 step='fallback' 到达客户端时, applyStatusToProgress 把它映射到哪个进度步骤?",
    options: [
      {
        id: "A",
        text: "generate (因为 fallback 属于生成阶段, 进度条仍显示 generate, 但 label 更新为备用模型信息)",
      },
      { id: "B", text: "route" },
      { id: "C", text: "guard" },
      { id: "D", text: "独立的 fallback 步骤" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "fallback 映射到 generate, 客户端不增加新步骤, 只更新 label.",
      detail:
        "nemesis-sse.client.ts L16-21: mapSseStepToProgressId 对 fallback 返回 'generate'. applyStatusToProgress 把 fallback 事件的 label (如 'gemini 返回 429, 正在尝试备用模型…') 写入 generate 步骤的 label. 这样进度条始终只有 guard / route / generate 三段, fallback 不破坏 UI 结构.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE_CLIENT,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [SSE_CLIENT, CLIENT],
  }),
  q({
    type: "multi_choice",
    title: "Q15 D1 audit 里随 provider 变化的字段",
    prompt:
      "recordNemesisGuardEvent 的 modelResult 中, 不同 provider 调用时哪些字段值通常不同? (多选)",
    options: [
      { id: "A", text: "provider (gemini / deepseek / xai)" },
      {
        id: "B",
        text: "model (具体模型 ID, 如 gemini-3.5-flash vs deepseek-v4-flash)",
      },
      { id: "C", text: "route (gemini_lite / deepseek / grok_roast 等)" },
      {
        id: "D",
        text: "finishReason (STOP / 其他, provider 返回的 finish reason 语义不同)",
      },
      { id: "E", text: "fallbackUsed" },
      { id: "F", text: "userId" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short:
        "provider / model / route / finishReason 随 provider 变化; fallbackUsed 取决于 fallback 链, userId 与用户相关.",
      detail:
        "modelResult 是 callNemesisModel 返回的公开子集. provider / model / route 直接由 attempt 决定; finishReason 来自 provider 原生响应 (Gemini 的 STOP vs DeepSeek 的 stop). fallbackUsed 只与是否触发 fallback 有关, userId 是请求维度. 审计表靠这些字段区分不同 provider 的调用分布.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ROUTE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [ROUTE, SERVICE],
  }),
  // ─── AI 改坏 (Q16–Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 引用 §11.3-8 Grok 默认 fallback 漂移",
    prompt: nemesisGrokFallbackBreak({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 15,
      primaryFile: SERVICE,
    }).prompt,
    options: nemesisGrokFallbackBreak({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 15,
      primaryFile: SERVICE,
    }).options,
    correctAnswer: nemesisGrokFallbackBreak({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 15,
      primaryFile: SERVICE,
    }).correctAnswer,
    explanation: nemesisGrokFallbackBreak({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 15,
      primaryFile: SERVICE,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE, PRIMARY],
    realWorldImpact:
      "用户选 'roast Grok 风格' 拿到的是 DeepSeek 输出, 风格和承诺不一致; 安全 prompt 也不生效, 可能输出 route 合同外的内容.",
    aiReviewRisk:
      "把 '便宜' 当作默认值的依据, 忽略了 route / persona 的设计契约.",
    wrongAnswerFeedback:
      nemesisGrokFallbackBreak({
        lessonSlug: "sse-capstone",
        courseSlug: "site-19-nemesis-sse-gateway",
        orderIndex: 15,
        primaryFile: SERVICE,
      }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q17 引用 §11.3-5 错误吞没丢失证据",
    prompt: nemesisProviderErrorSwallow({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 16,
      primaryFile: SERVICE,
    }).prompt,
    options: nemesisProviderErrorSwallow({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 16,
      primaryFile: SERVICE,
    }).options,
    correctAnswer: nemesisProviderErrorSwallow({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 16,
      primaryFile: SERVICE,
    }).correctAnswer,
    explanation: nemesisProviderErrorSwallow({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 16,
      primaryFile: SERVICE,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE, PRIMARY],
    realWorldImpact:
      "线上某条 prompt 持续 500, 只能看到 'model failed', 无法判断是 quota 耗尽 / 网络抖动还是 prompt 注入触发安全护栏, 排查耗时从分钟级涨到小时级.",
    aiReviewRisk:
      "把错误处理当成'用户体验优化', 实际上破坏了生产可观测性.",
    wrongAnswerFeedback:
      nemesisProviderErrorSwallow({
        lessonSlug: "sse-capstone",
        courseSlug: "site-19-nemesis-sse-gateway",
        orderIndex: 16,
        primaryFile: SERVICE,
      }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q18 引用 §12.2-TS-3 client 导入 server 模块",
    prompt: tsServerImportInClient({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 17,
      primaryFile: CLIENT,
    }).prompt,
    options: tsServerImportInClient({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 17,
      primaryFile: CLIENT,
    }).options,
    correctAnswer: tsServerImportInClient({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 17,
      primaryFile: CLIENT,
    }).correctAnswer,
    explanation: tsServerImportInClient({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 17,
      primaryFile: CLIENT,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: CLIENT,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [CLIENT, SERVICE],
    realWorldImpact:
      "开发者打开 dev tools 看到 system prompt '你是一个讽刺的吐槽 AI', 反向调 prompt 拿到完整安全规则; provider key 泄露到生产 bundle.",
    aiReviewRisk: "为了'调试方便' 跨边界 import, 破坏 secret 隔离.",
    wrongAnswerFeedback:
      tsServerImportInClient({
        lessonSlug: "sse-capstone",
        courseSlug: "site-19-nemesis-sse-gateway",
        orderIndex: 17,
        primaryFile: CLIENT,
      }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §12.2-TS-4 SSE step 扩大为 string",
    prompt: tsSseEventWiden({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 18,
      primaryFile: SSE,
    }).prompt,
    options: tsSseEventWiden({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 18,
      primaryFile: SSE,
    }).options,
    correctAnswer: tsSseEventWiden({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 18,
      primaryFile: SSE,
    }).correctAnswer,
    explanation: tsSseEventWiden({
      lessonSlug: "sse-capstone",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 18,
      primaryFile: SSE,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "ai-review",
    serverClientBoundary: "shared",
    touchedFiles: [SSE, SSE_CLIENT],
    realWorldImpact:
      "新增 step 拼错 state 不会在编译期暴露, 客户端 setRequestStage 静默不更新进度, 用户看不到 UI 反馈.",
    aiReviewRisk: "把 union 退化成 string, 等于把 TS 严格模式降级成 any.",
    wrongAnswerFeedback:
      tsSseEventWiden({
        lessonSlug: "sse-capstone",
        courseSlug: "site-19-nemesis-sse-gateway",
        orderIndex: 18,
        primaryFile: SSE,
      }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 硬编码 provider 与模型 ID",
    prompt:
      "AI 改坏: AI 觉得 'env 太分散', 在 nemesis.server.ts 的 routeToDecision、callGemini、callDeepSeek 里把 provider 和 model 全部硬编码为固定字符串 (如 provider: 'gemini', model: 'gemini-3.1-flash-lite'), 删除 getEnvVar 读取. 后果是?",
    options: [
      {
        id: "A",
        text: "换模型必须改代码并重新部署, 失去 env 驱动的灵活性; 测试环境无法覆盖不同模型; 生产紧急回滚需要发版",
      },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更快" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "硬编码 provider 破坏 env 驱动, 换模型 = 改代码 + 发版.",
      detail:
        "routeToDecision 本来通过 getGeminiLiteModel / getDeepSeekModel / getGrokModel 读取 env, 实现'改 env 即可换模型'. 硬编码后, 运维无法通过 env 切换模型, 必须改代码、走 CI/CD、重新部署. 紧急回滚 (如 Gemini quota 耗尽切 DeepSeek) 从'秒级 env 修改'变成'分钟级发版'. 测试环境也无法通过 env 覆盖不同模型.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE, PRIMARY],
    realWorldImpact:
      "线上 Gemini quota 耗尽, 想紧急切换到 DeepSeek 需要改代码发版, 30 分钟延迟, 期间服务不可用.",
    aiReviewRisk: "把 env 驱动的 provider 切换拍平成硬编码, 破坏运维灵活性.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 字符串常量完全合法.",
      C: "不会更快, 反而失去灵活性.",
      D: "有严重运维影响.",
    },
  }),
  // ─── 自由作答 (Q21–Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 5 层拆分",
    prompt:
      "用自己的话解释 Nemesis 的 5 层 (route / SSE server / nemesis.server / ai-gateway.server / client) 如何拆分职责, 使得换模型提供商时只需要改 gateway 层配置 + env 变量, 其他层完全不动.",
    options: [],
    correctAnswer: {
      text:
        "5 层拆分: (1) route (api.nemesis.ts): 只负责鉴权、限流、守门、SSE 包裹, 不感知 provider; (2) SSE server (nemesis-sse.server.ts): 只负责 ReadableStream + encode + controller.close, 不感知 provider; (3) nemesis.server.ts: 负责 selectNemesisModel + fallback 链 + onProgress 回调, 通过 env 读取模型 ID, 不直接构造 URL; (4) ai-gateway.server.ts: 唯一感知 provider 差异的层, 负责 resolve URL (compat / native)、build headers (gateway auth / BYOK)、provider / model 格式; (5) client (useNemesisChat): 消费通用 SSE 事件, 只显示 modelProvider / modelName 等字段, 不硬编码 provider. 因此换 provider = 改 env (如 NEMESIS_DEEPSEEK_MODEL) + 可能调整 gateway 端点 (如新增 provider 支持), route / SSE / client 完全不动. 这是关注点分离的经典范例.",
    },
    explanation: {
      short: "换 provider 只需改 gateway + env, 其他层不动.",
      detail:
        "好的解释能逐层说明'不感知 provider'的边界, 并指出 gateway 是唯一 provider 感知层, env 是配置驱动.",
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
    prompt:
      "PR 在 nemesis.server.ts 的 routeToDecision 里把 provider 硬编码为 'deepseek', 注释写 'temporary, will refactor later'. 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment:
        "硬编码 provider 在 service 层破坏了 env 驱动的设计契约: 换模型现在需要改代码+发版, 而不是改 env 重启. 'temporary' 注释在生产环境会永久留存, 请恢复 routeToDecision 的 env 读取, 把 provider 切换留给 gateway + env.",
    },
    explanation: {
      short: "审查点: 硬编码 provider 破坏 env 驱动, temporary 注释不能作为合入理由.",
      detail:
        "好的 review 指出 (1) 设计契约 (2) 运维成本 (3) temporary 的永久化风险 (4) 给出明确恢复方向.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SERVICE,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [SERVICE, PRIMARY],
  }),
];
