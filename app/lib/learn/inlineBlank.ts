import type { FillBlank } from "~/lib/learn/types";

export type InlineBlankSegment =
  | { type: "text"; value: string }
  | { type: "blank"; blankId: string; placeholder: string };

const BLANK_TOKEN_RE = /\{\{(\w+)\}\}|_{3,}/g;

export function parseInlineBlankTemplate(
  code: string,
  blanks: FillBlank[],
): InlineBlankSegment[] {
  const blankByOrder = [...blanks];
  let blankIndex = 0;
  const segments: InlineBlankSegment[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(BLANK_TOKEN_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", value: code.slice(lastIndex, start) });
    }

    const blankId = match[1] ?? blankByOrder[blankIndex]?.id;
    const blank = blanks.find((b) => b.id === blankId) ?? blankByOrder[blankIndex];
    if (blank) {
      segments.push({
        type: "blank",
        blankId: blank.id,
        placeholder: blank.placeholder,
      });
      blankIndex += 1;
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < code.length) {
    segments.push({ type: "text", value: code.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return [{ type: "text", value: code }];
  }

  return segments;
}
