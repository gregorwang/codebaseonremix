/**
 * AiErrorBox — AI 失败展示统一组件
 *
 * 给可重试的错误码 (upstream_5xx / upstream_timeout / ai_parse_failed) 加一行高亮文案
 * + "🔄 重试"按钮; 其它 (rate_limited / not_configured / forbidden / ai_failed) 只展示原始消息。
 *
 * 设计要点:
 *  - hint 是 UI 层给"非技术用户"的中文短句; error.error 是服务端原始消息, 作为附注。
 *  - small 用在按钮旁边等紧凑场景, 字号小一档。
 */
import type { AiErrorCode } from "~/lib/learn/aiErrorCode";
import { aiErrorHint, isAiErrorRetryable } from "~/lib/learn/aiErrorCode";

export type AiErrorPayload = {
  error: string;
  code?: AiErrorCode;
};

export function AiErrorBox({
  error,
  onRetry,
  small,
}: {
  error: AiErrorPayload;
  onRetry?: () => void;
  small?: boolean;
}) {
  const hint = aiErrorHint(error.code);
  const retryable = isAiErrorRetryable(error.code);
  return (
    <div
      className={`mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 ${
        small ? "text-xs" : "text-sm"
      } text-[var(--danger-fg)]`}
      role="alert"
    >
      {hint ? <p className="font-medium">{hint}</p> : null}
      <p className={hint ? "mt-1 opacity-80" : ""}>{error.error}</p>
      {retryable && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--danger-border)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium text-[var(--danger-fg)] hover:opacity-90"
        >
          🔄 重试
        </button>
      ) : null}
    </div>
  );
}
