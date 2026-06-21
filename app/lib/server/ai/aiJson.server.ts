export type ParseAiJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; raw: string };

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export function parseAiJsonResponse(text: string): ParseAiJsonResult {
  const raw = text.trim();
  if (!raw) {
    return { ok: false, error: "Empty AI response", raw };
  }

  const candidates = [raw, stripMarkdownFence(raw)];
  const unique = [...new Set(candidates)];

  for (const candidate of unique) {
    try {
      return { ok: true, data: JSON.parse(candidate) };
    } catch {
      // try next candidate
    }
  }

  return {
    ok: false,
    error: "Failed to parse AI response as JSON",
    raw,
  };
}
