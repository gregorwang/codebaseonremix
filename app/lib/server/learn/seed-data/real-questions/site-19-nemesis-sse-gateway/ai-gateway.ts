/**
 * Real questions for site-19-nemesis-sse-gateway / ai-gateway.
 *
 * Anchor: remix/app/lib/nemesis-ai-gateway.server.ts
 * 学习目标: Gateway URL 组装、鉴权头、环境变量优先级、provider/model 格式、
 * 错误分类、direct vs gateway 路由选择、BYOK 别名、日志脱敏.
 *
 * 题目数: 22.
 *
 * 引用 recipe: tsServerImportInClient (§12.2-TS-3) + nemesisProviderErrorSwallow (§11.3-5)
 * + nemesisGrokFallbackBreak (§11.3-8).
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { tsServerImportInClient, nemesisProviderErrorSwallow, nemesisGrokFallbackBreak } from "../recipes";

const PRIMARY = "app/lib/nemesis-ai-gateway.server.ts";
const TOUCHED = [PRIMARY];

export const aiGatewayQuestions: RealQ[] = [
  // ─── 基础识别 (Q1–Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 Gateway auth token 环境变量优先级",
    prompt: "getGatewayAuthToken() 读取环境变量的顺序?",
    options: [
      { id: "A", text: "CF_AIG_TOKEN → NEMESIS_AI_GATEWAY_TOKEN → CLOUDFLARE_API_TOKEN" },
      { id: "B", text: "CLOUDFLARE_API_TOKEN → CF_AIG_TOKEN" },
      { id: "C", text: "只读 NEMESIS_AI_GATEWAY_TOKEN" },
      { id: "D", text: "只读 CLOUDFLARE_API_TOKEN" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "CF_AIG_TOKEN 优先, 其次是 legacy NEMESIS_AI_GATEWAY_TOKEN, 最后是通用 CLOUDFLARE_API_TOKEN.",
      detail: "L43-48: CF_AIG_TOKEN 是专用 AI Gateway token; NEMESIS_AI_GATEWAY_TOKEN 是旧名兼容; CLOUDFLARE_API_TOKEN 是通用 Cloudflare API token fallback. 三层覆盖本地 dev / staging / prod 不同凭证配置.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 Compat model ID 格式",
    prompt: "toCompatModelId(provider, model) 返回的格式?",
    options: [
      { id: "A", text: "{provider}/{model}，例如 google-ai-studio/gemini-2.5-flash" },
      { id: "B", text: "只返回 model 名" },
      { id: "C", text: "{provider}:{model}" },
      { id: "D", text: "{gateway}/{provider}/{model}" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "AI Gateway OpenAI-compat 文档要求 model 字段为 provider/model.",
      detail: "L100-102: toCompatModelId 把 provider 和 model 用 '/' 拼接. 这是 Cloudflare AI Gateway /compat/chat/completions 端点要求的 model 标识格式, 也是 provider 路由的依据.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q3 NemesisGatewayRequestTarget 结构",
    prompt: "resolveCompatChatCompletionsTarget 返回的对象包含哪些字段?",
    options: [
      { id: "A", text: "{ url: string, headers: Record<string, string>, viaGateway: boolean }" },
      { id: "B", text: "{ url: string, body: object }" },
      { id: "C", text: "{ provider: string, model: string }" },
      { id: "D", text: "{ apiKey: string, endpoint: string }" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "url + headers + viaGateway 三元组, 调用方拿到后直接 fetch.",
      detail: "L16-20: NemesisGatewayRequestTarget 是'纯数据'结构, 不含 fetch 逻辑. viaGateway 标记走 Cloudflare AI Gateway 还是 direct provider, 供上层审计 / 日志区分. 调用方只需解构 url/headers 发起 fetch, 不需要关心 gateway 内部拼接细节.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q4 resolveGatewayRootUrl 回退链",
    prompt: "resolveGatewayRootUrl 解析 gateway URL 的两步?",
    options: [
      { id: "A", text: "先尝试 env.AI.gateway(id).getUrl()，失败后再用 CLOUDFLARE_ACCOUNT_ID 拼 GATEWAY_HOST" },
      { id: "B", text: "直接用 CLOUDFLARE_ACCOUNT_ID" },
      { id: "C", text: "只用 env.AI" },
      { id: "D", text: "硬编码 https://gateway.ai.cloudflare.com/v1" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "运行时 binding 优先, accountId 静态拼接兜底.",
      detail: "L104-126: env.AI.gateway(id).getUrl() 是 dashboard 实际配置的权威 URL (支持本地 proxy / 路径变更). 如果 binding 不可用 (本地 dev 无 binding), 回退到 `${GATEWAY_HOST}/${accountId}/${gatewayId}`. 两步保证 prod 用发现, dev 用静态拼接.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q5 buildCompatHeaders gateway auth 头",
    prompt: "buildCompatHeaders 在 getGatewayAuthToken() 有值时生成什么头?",
    options: [
      { id: "A", text: "cf-aig-authorization: Bearer {token}，若有 BYOK alias 再加 cf-aig-byok-alias" },
      { id: "B", text: "Authorization: Bearer {providerApiKey}" },
      { id: "C", text: "x-api-key: {token}" },
      { id: "D", text: "不生成鉴权头" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "gateway auth 用 cf-aig-authorization, BYOK 用 cf-aig-byok-alias.",
      detail: "L128-138: gateway auth 模式下 token 进 cf-aig-authorization (Cloudflare AI Gateway 专用头), 不是标准 Authorization. BYOK alias 决定 dashboard 里用哪组 provider key. 如果删了 alias 但 dashboard 配置了非 default 别名, 请求会 401.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q6 redactGatewayUrl 作用",
    prompt: "redactGatewayUrl(url) 做什么?",
    options: [
      { id: "A", text: "去掉 query string，只保留 origin + pathname，防止 API key 泄露到日志" },
      { id: "B", text: "加密 URL" },
      { id: "C", text: "给 URL 加路径前缀" },
      { id: "D", text: "验证 URL 格式" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "脱敏 query 参数, 防止 key/token 进日志.",
      detail: "L90-97: new URL(url) 后取 origin + pathname, 丢弃 search (query string). direct Gemini 路径把 API key 放在 ?key=... 里, 不脱敏就会写进 console.log / 错误追踪 / 审计系统. 这是生产安全底线.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),

  // ─── 代码阅读 (Q7–Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: getGatewayAuthToken 优先级起点",
    prompt: "下面哪一行决定了 'gateway auth token 优先级链' 的起点?",
    code: `1 function getGatewayAuthToken() {
2   const value =
3     getEnvVar("CF_AIG_TOKEN") ||
4     getEnvVar("NEMESIS_AI_GATEWAY_TOKEN") ||
5     getEnvVar("CLOUDFLARE_API_TOKEN");
6   return value ? cleanSecret(value) : null;
7 }`,
    options: [],
    linePickLines: [
      { id: "L3", lineNumber: 3, text: 'getEnvVar("CF_AIG_TOKEN") ||' },
      { id: "L4", lineNumber: 4, text: 'getEnvVar("NEMESIS_AI_GATEWAY_TOKEN") ||' },
      { id: "L5", lineNumber: 5, text: 'getEnvVar("CLOUDFLARE_API_TOKEN");' },
    ],
    correctAnswer: { lineId: "L3" },
    explanation: {
      short: "L3 是优先级链起点: CF_AIG_TOKEN 存在时后面的 fallback 不会被求值.",
      detail: "JS || 短路求值: 只要 CF_AIG_TOKEN 有值, 整条表达式立刻返回, NEMESIS_AI_GATEWAY_TOKEN 和 CLOUDFLARE_API_TOKEN 被忽略. L3 是'第一优先级'的关键行.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q8 resolveGeminiClassifierTarget 双路径",
    prompt: "resolveGeminiClassifierTarget 在 gatewayId 存在 vs 不存在时的行为? (多选)",
    options: [
      { id: "A", text: "gatewayId 存在时走 resolveCompatChatCompletionsTarget，返回 gateway URL + cf-aig-authorization 头" },
      { id: "B", text: "gatewayId 不存在时回退到 direct Gemini，URL 里带 ?key=GoogleApiKey" },
      { id: "C", text: "gatewayId 不存在时直接抛错" },
      { id: "D", text: "两种路径都返回 viaGateway: true" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "有 gateway 走 compat / gateway auth; 无 gateway 走 direct + key in query.",
      detail: "L213-232: gatewayId 存在 → 复用 resolveCompatChatCompletionsTarget (OpenAI-compat 端点). 不存在 → 检查 GOOGLE_AI_API_KEY, 拼 direct URL `${DIRECT_GEMINI_BASE_URL}/models/${model}:generateContent?key=${key}`. viaGateway: false 标记 direct 路径, 供日志区分. 这是'gateway 优先, direct 兜底'设计.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "fill_blank",
    title: "Q9 resolveGatewayRootUrl 回退填空",
    prompt: "resolveGatewayRootUrl 的两步回退: (1) 先尝试 ___; (2) 若失败, 再用 CLOUDFLARE_ACCOUNT_ID 拼成 ___。",
    options: [],
    correctAnswer: { values: { v: "env.AI.gateway(id).getUrl() / GATEWAY_HOST 完整 URL" } },
    blanks: [
      {
        id: "v",
        placeholder: "两步回退",
        acceptedAnswers: [
          "env.AI.gateway(id).getUrl() / GATEWAY_HOST 完整 URL",
          "env.AI.gateway(id).getUrl() / https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}",
          "AI binding / 静态拼接",
        ],
      },
    ],
    explanation: {
      short: "binding 发现优先, accountId 静态拼接兜底.",
      detail: "L108-126: 第一步用 runtime binding (env.AI.gateway(id).getUrl()) 获取 dashboard 实际 URL; 第二步用 `${GATEWAY_HOST}/${accountId}/${gatewayId}` 静态拼接. 第一步支持路径变更和本地代理, 第二步保证无 binding 环境也能跑.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q10 cleanSecret 目的",
    prompt: "cleanSecret(value) 做了什么?",
    options: [
      { id: "A", text: "去掉 UTF-8 BOM 并 trim 空白, 防止从 dashboard 复制来的 token 带不可见字符" },
      { id: "B", text: "加密 secret" },
      { id: "C", text: "hash secret" },
      { id: "D", text: "解析 JSON" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "BOM + trim, 防御复制粘贴污染.",
      detail: "L22-24: \\uFEFF 是 UTF-8 BOM, 从某些编辑器 / dashboard 复制 env var 时会悄悄带上. 如果不清理, Bearer 头会变成 `Bearer \\uFEFFsk-...`, gateway 校验失败返回 401. trim 处理首尾空格. 这是'env var 不可信'的防御性编程.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q11 buildCompatHeaders 抛错条件",
    prompt: "buildCompatHeaders 在什么情况下抛 Error?",
    options: [
      { id: "A", text: "gateway auth 不存在且 provider API key 也不存在时" },
      { id: "B", text: "Content-Type 缺失时" },
      { id: "C", text: "model 名称非法时" },
      { id: "D", text: "永不抛错" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "既没有 gateway token 也没有 provider key → 无法鉴权 → 抛错.",
      detail: "L141-155: 先查 gateway auth (CF_AIG_TOKEN 链), 没有则查 provider 专属 API key (Google/DeepSeek/xAI). 两者都没有时抛 Error: 'AI Gateway is enabled but neither CF_AIG_TOKEN nor a ... API key is configured'. 这是'早失败'设计, 不在 fetch 时才暴露配置缺失.",
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
    title: "Q12 Gateway 组装成功路径",
    prompt: "resolveCompatChatCompletionsTarget('deepseek') 完整成功步骤?",
    options: [
      { id: "1", text: "getGatewayId() 返回非空 gatewayId" },
      { id: "2", text: "resolveGatewayRootUrl(env, gatewayId) 返回 gatewayRootUrl" },
      { id: "3", text: "buildCompatHeaders('deepseek') 返回含 cf-aig-authorization 的 headers" },
      { id: "4", text: "拼接 url = ${gatewayRootUrl}/compat/chat/completions" },
      { id: "5", text: "返回 { url, headers, viaGateway: true }" },
    ],
    correctAnswer: { pathIds: ["1", "2", "3", "4", "5"] },
    explanation: {
      short: "5 步: 取 ID → 解析根 URL → 构建头 → 拼端点 → 返回目标.",
      detail: "L173-209: 任何一步缺失都早抛错 (gatewayId 空 → 抛错; rootUrl 空 → 抛 gatewayResolutionError). 调用方拿到 target 后直接 fetch(url, { headers }), 不需要再处理鉴权或 URL 拼接. viaGateway: true 标记该请求计入 AI Gateway 日志和缓存.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 401 鉴权失败路径",
    prompt: "CF_AIG_TOKEN 被吊销, gateway 返回 401. 正确路径?",
    options: [
      { id: "auth", text: "getGatewayAuthToken() 返回旧 token" },
      { id: "header", text: "buildCompatHeaders 生成 cf-aig-authorization: Bearer {旧token}" },
      { id: "fetch", text: "fetch 到 gateway" },
      { id: "401", text: "gateway 返回 401 Unauthorized" },
      { id: "no-fb", text: "shouldTryFallback = false (401 是鉴权错误, 换 provider 也过不了)" },
      { id: "err", text: "抛结构化错误给上层 (auth 失败, 需要换 token 而不是换模型)" },
    ],
    correctAnswer: { pathIds: ["auth", "header", "fetch", "401", "no-fb", "err"] },
    explanation: {
      short: "401 是凭证问题, fallback 无意义, 必须上报 auth 错误.",
      detail: "401 说明 token 无效或已吊销, 不是 provider 临时故障. 换 DeepSeek / Grok 同样 401, 因为用的是同一个 gateway auth token. shouldTryFallback 必须区分 '可重试的 transient 错误' (429/5xx/网络) 和 '不可重试的 auth 错误' (401/403).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q14 429 限流 + fallback 成功路径",
    prompt: "主模型 Gemini Lite 429 → fallback DeepSeek 成功. 路径?",
    options: [
      { id: "guard", text: "守门通过, mode=allow" },
      { id: "route", text: "resolveGeminiMainGenerationTarget 返回 gateway target" },
      { id: "fetch1", text: "fetch Gemini → 429 Too Many Requests" },
      { id: "fb-yes", text: "shouldTryFallback = true (429 是 transient)" },
      { id: "fb-target", text: "resolveOpenAiCompatTarget('deepseek') 返回 DeepSeek target" },
      { id: "fetch2", text: "fetch DeepSeek → 200" },
      { id: "done", text: "返回 DeepSeek 结果, fallbackUsed: true" },
    ],
    correctAnswer: { pathIds: ["guard", "route", "fetch1", "fb-yes", "fb-target", "fetch2", "done"] },
    explanation: {
      short: "429 → shouldTryFallback → 换 provider → 成功.",
      detail: "429 / 5xx / 网络超时都是 transient 错误, 换 provider 可能绕过 quota 或 regional 故障. 但 401/403 是凭证问题, 换 provider 也过不了. resolveOpenAiCompatTarget 内部按 provider 选不同端点 (compat / native), fallback 链由 nemesis.server.ts 控制, gateway 层只负责'给对 target'.",
    },
    abilityTags: ["ai.review.architecture", "backend.rateLimit"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q15 shouldTryFallback + key 优先级",
    prompt: "关于 shouldTryFallback 和 token 优先级的正确组合?",
    options: [
      { id: "A", text: "CF_AIG_TOKEN 优先于 CLOUDFLARE_API_TOKEN; 401/403 不走 fallback, 429/5xx/网络错误走 fallback" },
      { id: "B", text: "CLOUDFLARE_API_TOKEN 优先; 全部错误都走 fallback" },
      { id: "C", text: "两者随机; 只限 500 走 fallback" },
      { id: "D", text: "CF_AIG_TOKEN 优先; 全部错误都不走 fallback" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "token: CF_AIG_TOKEN 优先; fallback: transient 错误才重试.",
      detail: "getGatewayAuthToken L43-48: CF_AIG_TOKEN 是第一优先级. shouldTryFallback 的工程意义是'避免浪费 quota': 401/403 是凭证失效, 换 provider 同样失败; 429/5xx/网络抖动是 transient, 换 provider / 重试有成功概率. 两者组合决定成本与可用性.",
    },
    abilityTags: ["ai.review.architecture", "backend.rateLimit"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),

  // ─── AI 改坏 (Q16–Q20) ──────────────────────────────────────────────────
  {
    ...tsServerImportInClient({
      lessonSlug: "ai-gateway",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 0,
      primaryFile: PRIMARY,
    }),
    title: "Q16 引用 §12.2-TS-3 client 导入 gateway server",
    layer: "ai-review",
    touchedFiles: [PRIMARY, "app/hooks/useNemesisChat.client.ts"],
  },
  {
    ...nemesisProviderErrorSwallow({
      lessonSlug: "ai-gateway",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 0,
      primaryFile: PRIMARY,
    }),
    title: "Q17 引用 §11.3-5 gateway 错误吞没",
  },
  q({
    type: "ai_review",
    title: "Q18 AI 删除 redactGatewayUrl",
    prompt: "AI 改坏: AI 觉得 'redactGatewayUrl 是过度设计', 把它删掉, 直接用原始 url 做 console.log. 后果是?",
    options: [
      { id: "A", text: "API key 或 token 通过 query string 泄露到日志 / 监控 / 错误追踪系统" },
      { id: "B", text: "URL 会变短" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "redactGatewayUrl 脱敏 query 参数, 删了等于把 API key 写进日志.",
      detail: "L90-97: redactGatewayUrl 把 parsed.search (query string) 去掉, 只保留 origin + pathname. direct Gemini 路径把 API key 放在 ?key=... 里, 不脱敏就会写进 console.log / 错误追踪 / 审计系统. 日志一旦持久化就无法撤销, 属于不可逆泄露.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
    realWorldImpact: "Ops 在日志平台搜索错误时看到明文 API key, 被日志系统索引后永久留存, 更换 key 前已被泄露.",
    aiReviewRisk: "把日志脱敏当'可有可无', 忽略 query string 是 secret 泄露的高频路径.",
    wrongAnswerFeedback: {
      B: "URL 变短 ≠ 正确.",
      C: "TS 不会报错.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 AI 删除 env.AI binding 检查",
    prompt: "AI 改坏: AI 觉得 'env.AI 很少用到', 把 resolveGatewayRootUrl 里的 `env.AI.gateway(id).getUrl()` 分支删掉, 直接只用 CLOUDFLARE_ACCOUNT_ID 拼 URL. 后果是?",
    options: [
      { id: "A", text: "失去运行时 gateway URL 发现能力, dashboard 改了路由或本地 proxy 环境时硬编码 URL 失效" },
      { id: "B", text: "代码更短" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "env.AI binding 是运行时权威 URL 来源, 删了只剩静态拼接, 环境变化时失效.",
      detail: "L108-118: env.AI.gateway(id).getUrl() 返回 dashboard 实际配置的 gateway URL, 是权威来源. 如果 Cloudflare 调整 gateway 路径、本地 dev 用代理、或者 accountId 拼法与 dashboard 不一致, 硬编码就 404. binding 优先是平台推荐做法.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
    realWorldImpact: "Cloudflare 升级 gateway 路径后所有请求 404, 服务完全不可用, 必须紧急发版修复.",
    aiReviewRisk: "把'少一段代码'当优化, 破坏平台推荐的运行时发现模式.",
    wrongAnswerFeedback: {
      B: "短 ≠ 健壮.",
      C: "TS 不会报错.",
      D: "有可用性风险.",
    },
  }),
  {
    ...nemesisGrokFallbackBreak({
      lessonSlug: "ai-gateway",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 0,
      primaryFile: PRIMARY,
    }),
    title: "Q20 引用 §11.3-8 Grok fallback 漂移",
  },

  // ─── 自由作答 (Q21–Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 gateway 4 职责",
    prompt: "用自己的话解释 nemesis-ai-gateway.server.ts 的 4 个核心职责: (1) URL 组装 (resolveGatewayRootUrl + 各端点 path) (2) 鉴权 (buildCompatHeaders 的 gateway auth / BYOK / direct API key 三层) (3) JSON 透传 (返回 {url, headers, viaGateway} 让调用方直接 fetch) (4) 错误归类 (gatewayResolutionError / 配置缺失早抛错). 这 4 个职责如何让'调用方不需要知道自己是走 gateway 还是 direct'?",
    options: [],
    correctAnswer: {
      text: "4 职责封装: (1) URL 组装把 dashboard binding / accountId / direct base URL 的差异收敛成统一字符串; (2) 鉴权把 cf-aig-authorization / Authorization / ?key= 的差异收敛成统一 headers 对象; (3) JSON 透传用 {url, headers, viaGateway} 让调用方只做 fetch(url, { headers, body: JSON.stringify(...) }), 不关心来源; (4) 错误归类在配置阶段就抛错, 不让'缺 token'等到 fetch 时才暴露. 调用方看到的接口是'给我 provider + model, 我给你 target', 内部是 gateway 还是 direct 对它透明.",
    },
    explanation: {
      short: "4 职责封装让调用方只关心 fetch, 不关心 gateway/direct 差异.",
      detail: "好的解释能联起 URL 组装 / 鉴权 / 透传 / 错误 4 层, 并说明它们如何共同隐藏实现细节. 关键点是'调用方不做条件分支'——无论走哪条路, 返回值形状一样, 错误语义一样.",
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
    prompt: "PR 把 buildCompatHeaders 里的 CF_AIG_TOKEN 优先级删掉, 只保留 CLOUDFLARE_API_TOKEN, 理由是 '统一用一个 token 更简单'. 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "CF_AIG_TOKEN 是专用 AI Gateway 鉴权令牌, CLOUDFLARE_API_TOKEN 是通用 Cloudflare API token; 删掉前者会破坏 BYOK / local dev / staging 等需要隔离凭证的场景. 请恢复三层优先级, '统一' 不等于 '正确'.",
    },
    explanation: {
      short: "审查点: CF_AIG_TOKEN 是专用凭证, 不能为了'统一'删掉.",
      detail: "好的 review 指出 (1) 两个 token 的职责差异 (2) 删掉后的影响面 (BYOK / local dev) (3) 明确恢复要求.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
];
