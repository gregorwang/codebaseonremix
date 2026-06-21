const GATEWAY_HOST = "https://gateway.ai.cloudflare.com/v1";
const DEFAULT_MODEL = "google-ai-studio/gemini-3.1-flash-lite";

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
};

export type AiGatewayErrorCode =
  | "not_configured"
  | "rate_limited"
  | "upstream";

export class AiGatewayError extends Error {
  code: AiGatewayErrorCode;

  constructor(code: AiGatewayErrorCode, message: string) {
    super(message);
    this.name = "AiGatewayError";
    this.code = code;
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
  return value.replace(/^\uFEFF/, "").trim();
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
  const started = Date.now();

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

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(env),
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new AiGatewayError(
      "upstream",
      error instanceof Error ? error.message : "AI Gateway 请求失败",
    );
  }

  const latencyMs = Date.now() - started;
  let payload: ChatCompletionResponse;
  try {
    payload = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new AiGatewayError("upstream", "AI Gateway 返回了无效 JSON");
  }

  if (!response.ok) {
    const message =
      payload.error?.message ?? `AI Gateway 错误 (${response.status})`;
    throw new AiGatewayError("upstream", message);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new AiGatewayError("upstream", "AI Gateway 返回了空内容");
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
