const GATEWAY_HOST = "https://gateway.ai.cloudflare.com/v1";
const DEFAULT_MODEL = "google-ai-studio/gemini-3.1-flash-lite";

/** 上游单次请求的硬超时, 超过即视为 upstream_timeout, 触发重试。 */
const REQUEST_TIMEOUT_MS = 30_000;
/** 失败重试节奏: 500ms → 1500ms (共最多 3 次尝试)。仅作用于 upstream 类错误。 */
const RETRY_DELAYS_MS = [500, 1500];

export type AiFeature =
  | "hint"
  | "explanation"
  | "mistake_summary"
  | "question_generation"
  | "layer_aware_question_generation"
  | "exam_review"
  | "snippet_explain"
  | "lesson_teaching"
  | "code_orientation"
  | "code_explain"
  | "lesson_diagram"
  | "question_diagram";

export type AiGatewayRequest = {
  feature: AiFeature;
  userId?: string;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
};

export type AiGatewayResponse = {
  text: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  /**
   * 实际尝试次数 (1 = 一次过, ≥2 = 命中过重试)。给 ai_usage_logs 用来对账"重试是否真的帮上忙"。
   */
  attemptCount?: number;
};

/**
 * 错误码细分:
 * - not_configured: env 缺 NEMESIS_AI_GATEWAY_ID / 鉴权 (不重试, 直接报)
 * - rate_limited:   上游 429 (不重试, 让 Cloudflare 配额自然兜底)
 * - upstream_5xx:   上游 5xx, 可重试
 * - upstream_timeout: 本地 AbortController 超时, 可重试
 * - upstream_parse_failed: 上游返回非 JSON / choices 缺内容, 可重试 (有时是流式截断)
 * - upstream:       其它网络层失败 (DNS / TLS / 4xx 非 429), 可重试
 */
export type AiGatewayErrorCode =
  | "not_configured"
  | "rate_limited"
  | "upstream_5xx"
  | "upstream_timeout"
  | "upstream_parse_failed"
  | "upstream";

export class AiGatewayError extends Error {
  code: AiGatewayErrorCode;
  /** 实际尝试次数, 给上游日志/对账用。 */
  attemptCount?: number;

  constructor(code: AiGatewayErrorCode, message: string, attemptCount?: number) {
    super(message);
    this.name = "AiGatewayError";
    this.code = code;
    this.attemptCount = attemptCount;
  }
}

type AiGatewayBinding = {
  gateway: (id: string) => {
    getUrl: (provider?: string) => Promise<string>;
  };
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

function cleanSecret(value: string) {
  return value.replace(/^﻿/, "").trim();
}

function getGatewayId(env: Env) {
  return env.NEMESIS_AI_GATEWAY_ID?.trim() || null;
}

function getGatewayAuthToken(env: Env) {
  const value = env.CF_AIG_TOKEN ?? env.CLOUDFLARE_API_TOKEN;
  return value ? cleanSecret(value) : null;
}

function getAccountId(env: Env) {
  return env.CLOUDFLARE_ACCOUNT_ID?.trim() || null;
}

async function resolveGatewayRootUrl(env: Env, gatewayId: string) {
  const ai = env.AI as AiGatewayBinding | undefined;
  if (ai && typeof ai.gateway === "function") {
    try {
      const url = await ai.gateway(gatewayId).getUrl();
      return url.replace(/\/+$/, "");
    } catch (error) {
      console.warn("[AiGateway] env.AI.gateway().getUrl() failed:", error);
    }
  }

  const accountId = getAccountId(env);
  if (!accountId) return null;
  return `${GATEWAY_HOST}/${accountId}/${gatewayId}`;
}

function getModel(env: Env, request: AiGatewayRequest) {
  if (request.model) {
    return request.model;
  }

  const fromEnv = env.CODE_COACH_AI_MODEL?.trim();
  if (fromEnv) {
    return fromEnv.includes("/") ? fromEnv : `google-ai-studio/${fromEnv}`;
  }

  return DEFAULT_MODEL;
}

function buildHeaders(env: Env) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getGatewayAuthToken(env);
  if (token) {
    headers["cf-aig-authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/** 判断错误码是否值得重试。rate_limited / not_configured 当场放弃。 */
function isRetryable(code: AiGatewayErrorCode): boolean {
  return (
    code === "upstream" ||
    code === "upstream_5xx" ||
    code === "upstream_timeout" ||
    code === "upstream_parse_failed"
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * 单次 (无重试) 走一遍网关。任何上游异常都包成 AiGatewayError 抛出,
 * 由外层 callAiGateway 决定重试还是冒泡。
 */
async function callOnce(
  env: Env,
  request: AiGatewayRequest,
  url: string,
  model: string,
): Promise<AiGatewayResponse> {
  const body = {
    model,
    temperature: request.temperature ?? 0.4,
    max_tokens: request.maxTokens ?? 1024,
    messages: [
      ...(request.systemPrompt
        ? [{ role: "system" as const, content: request.systemPrompt }]
        : []),
      { role: "user" as const, content: request.prompt },
    ],
  };

  const started = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(env),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    // AbortError → 我们自己超时;其它 fetch 失败一律计 upstream。
    const aborted =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    if (aborted) {
      throw new AiGatewayError(
        "upstream_timeout",
        `AI Gateway 请求超过 ${REQUEST_TIMEOUT_MS / 1000}s 未响应`,
      );
    }
    throw new AiGatewayError(
      "upstream",
      error instanceof Error ? error.message : "AI Gateway 请求失败",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const latencyMs = Date.now() - started;
  let payload: ChatCompletionResponse;
  try {
    payload = (await response.json()) as ChatCompletionResponse;
  } catch {
    // 上游返回了非 JSON;一般是网关层把 HTML 错误页透传过来。
    throw new AiGatewayError(
      "upstream_parse_failed",
      "AI Gateway 返回了无效 JSON",
    );
  }

  if (!response.ok) {
    const message =
      payload.error?.message ?? `AI Gateway 错误 (${response.status})`;
    if (response.status === 429) {
      throw new AiGatewayError("rate_limited", message);
    }
    if (response.status >= 500) {
      throw new AiGatewayError("upstream_5xx", message);
    }
    throw new AiGatewayError("upstream", message);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    // choices 为空通常是 token 不足截断或上游模型异常;归类为可重试的 parse_failed。
    throw new AiGatewayError(
      "upstream_parse_failed",
      "AI Gateway 返回了空内容",
    );
  }

  return {
    text,
    provider: "cloudflare-ai-gateway",
    model,
    inputTokens: payload.usage?.prompt_tokens,
    outputTokens: payload.usage?.completion_tokens,
    latencyMs,
  };
}

export async function callAiGateway(
  env: Env,
  request: AiGatewayRequest,
): Promise<AiGatewayResponse> {
  const gatewayId = getGatewayId(env);
  if (!gatewayId) {
    throw new AiGatewayError(
      "not_configured",
      "AI Gateway 未配置，请在 .dev.vars 中设置 NEMESIS_AI_GATEWAY_ID。",
    );
  }

  const gatewayRootUrl = await resolveGatewayRootUrl(env, gatewayId);
  if (!gatewayRootUrl) {
    throw new AiGatewayError(
      "not_configured",
      "无法解析 AI Gateway 地址，请配置 AI binding 或 CLOUDFLARE_ACCOUNT_ID。",
    );
  }

  const model = getModel(env, request);
  const url = `${gatewayRootUrl}/compat/chat/completions`;
  const maxAttempts = RETRY_DELAYS_MS.length + 1;

  let lastError: AiGatewayError | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await callOnce(env, request, url, model);
      return { ...response, attemptCount: attempt };
    } catch (error) {
      const wrapped =
        error instanceof AiGatewayError
          ? error
          : new AiGatewayError(
              "upstream",
              error instanceof Error ? error.message : String(error),
            );
      lastError = wrapped;
      if (!isRetryable(wrapped.code) || attempt === maxAttempts) {
        wrapped.attemptCount = attempt;
        throw wrapped;
      }
      // 延迟后下一轮; 控制台留一条审计线索, 不写日志 (日志由调用方在最终成功/失败时统一写)。
      const delay = RETRY_DELAYS_MS[attempt - 1];
      console.warn(
        `[AiGateway] attempt ${attempt}/${maxAttempts} failed (${wrapped.code}); retrying in ${delay}ms`,
        wrapped.message,
      );
      await sleep(delay);
    }
  }

  // 理论上不会走到这里 (maxAttempts 内必定 return 或 throw), 兜底防止 TS 抱怨。
  throw (
    lastError ??
    new AiGatewayError("upstream", "AI Gateway 未知错误", maxAttempts)
  );
}
