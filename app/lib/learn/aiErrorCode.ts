/**
 * UI 共用的 AI 错误码 union (与 app/lib/server/ai/aiLearn.server.ts 的 AiLearnError.code 对齐)。
 *
 * 历史: 第 1 期只分 rate_limited / not_configured / ai_failed / forbidden。
 *       第 8 周细分出 upstream_5xx / upstream_timeout / ai_parse_failed, 让前端能给
 *       "可重试"错误展示重试按钮 + 区分文案。
 *
 * 注意: 服务端是 toAiLearnError 的唯一权威, UI 直接消费它返回的 code 字符串即可,
 *       不要在前端做自己的"是不是 5xx"判断。
 */
export type AiErrorCode =
  | "rate_limited"
  | "not_configured"
  | "upstream_5xx"
  | "upstream_timeout"
  | "ai_parse_failed"
  | "ai_failed"
  | "forbidden";

/** 这些错误建议给"重试"按钮; 其它一律请用户检查输入 / 等配额 / 联系管理员。 */
const RETRYABLE = new Set<AiErrorCode>([
  "upstream_5xx",
  "upstream_timeout",
  "ai_parse_failed",
]);

export function isAiErrorRetryable(code?: AiErrorCode): boolean {
  return !!code && RETRYABLE.has(code);
}

/**
 * 给一段错误码 + 服务端原始 message, 产出"给用户看的"短文案。
 * 调用方仍可拼接 message 在后面做 fallback (服务端可能给了更精准的字串)。
 */
export function aiErrorHint(code?: AiErrorCode): string | null {
  switch (code) {
    case "rate_limited":
      return "AI 配额暂时打满, 稍后再试。";
    case "not_configured":
      return "管理员尚未配置 AI Gateway。";
    case "upstream_5xx":
      return "AI 服务端暂时不可用 (5xx), 可点重试。";
    case "upstream_timeout":
      return "AI 网关响应过慢, 可点重试。";
    case "ai_parse_failed":
      return "AI 这次输出格式异常, 重试一般就好。";
    case "forbidden":
      return null; // forbidden 是逻辑层 (例如"请先提交答案"), 由服务端 message 自带提示。
    case "ai_failed":
    default:
      return null;
  }
}
