import type { AiFeature } from "./aiGateway.server";
import { newId, nowIso, stringifyJsonField } from "../learn/db-json.server";

export async function logAiExplanation(
  db: D1Database,
  params: {
    userId: string;
    questionId?: string;
    attemptId?: string;
    feature: AiFeature;
    promptType: string;
    input: unknown;
    output?: string;
    provider?: string;
    model?: string;
    success: boolean;
    error?: string;
    latencyMs?: number;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ai_explanation_logs (
        id, user_id, question_id, attempt_id, feature, prompt_type,
        input_json, output_text, provider, model, success, error_message,
        latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId(),
      params.userId,
      params.questionId ?? null,
      params.attemptId ?? null,
      params.feature,
      params.promptType,
      stringifyJsonField(params.input),
      params.output ?? null,
      params.provider ?? null,
      params.model ?? null,
      params.success ? 1 : 0,
      params.error ?? null,
      params.latencyMs ?? null,
      nowIso(),
    )
    .run();
}

export async function logAiUsage(
  db: D1Database,
  params: {
    userId?: string;
    feature: AiFeature;
    provider?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    success: boolean;
    error?: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ai_usage_logs (
        id, user_id, feature, provider, model, input_tokens, output_tokens,
        estimated_cost, latency_ms, success, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId(),
      params.userId ?? null,
      params.feature,
      params.provider ?? null,
      params.model ?? null,
      params.inputTokens ?? null,
      params.outputTokens ?? null,
      null,
      params.latencyMs ?? null,
      params.success ? 1 : 0,
      params.error ?? null,
      nowIso(),
    )
    .run();
}
