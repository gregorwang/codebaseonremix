import { describe, expect, it } from "vitest";
import { parseAnnotatedExplanation } from "~/lib/server/ai/aiSchemas.server";

describe("parseAnnotatedExplanation", () => {
  it("parses a clean JSON object", () => {
    const raw = JSON.stringify({
      summary: "总览",
      annotations: [{ startLine: 2, endLine: 4, note: "讲解 `foo`" }],
    });
    const out = parseAnnotatedExplanation(raw, 100);
    expect(out.summary).toBe("总览");
    expect(out.annotations).toEqual([
      { startLine: 2, endLine: 4, note: "讲解 `foo`" },
    ]);
  });

  it("strips ```json code fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify({ summary: "s", annotations: [] }) + "\n```";
    const out = parseAnnotatedExplanation(raw, 10);
    expect(out.summary).toBe("s");
  });

  it("clamps out-of-range line numbers to [1, fileLineCount]", () => {
    const raw = JSON.stringify({
      summary: "",
      annotations: [{ startLine: 0, endLine: 999, note: "x" }],
    });
    const out = parseAnnotatedExplanation(raw, 50);
    expect(out.annotations[0]).toEqual({ startLine: 1, endLine: 50, note: "x" });
  });

  it("fixes endLine < startLine by raising endLine to startLine", () => {
    const raw = JSON.stringify({
      summary: "s",
      annotations: [{ startLine: 10, endLine: 3, note: "x" }],
    });
    const out = parseAnnotatedExplanation(raw, 100);
    expect(out.annotations[0]).toEqual({ startLine: 10, endLine: 10, note: "x" });
  });

  it("drops annotations missing a note or with non-numeric startLine", () => {
    const raw = JSON.stringify({
      summary: "s",
      annotations: [
        { startLine: 1, endLine: 1 },
        { startLine: "abc", endLine: 2, note: "y" },
        { startLine: 5, endLine: 6, note: "keep" },
      ],
    });
    const out = parseAnnotatedExplanation(raw, 100);
    expect(out.annotations).toEqual([{ startLine: 5, endLine: 6, note: "keep" }]);
  });

  it("drops notes that echo a hard secret (sk- key / api_key=...)", () => {
    const raw = JSON.stringify({
      summary: "s",
      annotations: [
        { startLine: 1, endLine: 1, note: "key: sk-ABCDEFGHIJ1234567890" },
        { startLine: 2, endLine: 2, note: "正常讲解" },
      ],
    });
    const out = parseAnnotatedExplanation(raw, 100);
    expect(out.annotations).toEqual([{ startLine: 2, endLine: 2, note: "正常讲解" }]);
  });

  it("keeps legitimate teaching notes that mention auth concepts", () => {
    const raw = JSON.stringify({
      summary: "s",
      annotations: [{ startLine: 1, endLine: 1, note: "这里校验 Bearer token 是否过期" }],
    });
    const out = parseAnnotatedExplanation(raw, 100);
    expect(out.annotations).toHaveLength(1);
  });

  it("sorts annotations by startLine", () => {
    const raw = JSON.stringify({
      summary: "s",
      annotations: [
        { startLine: 8, endLine: 9, note: "b" },
        { startLine: 2, endLine: 3, note: "a" },
      ],
    });
    const out = parseAnnotatedExplanation(raw, 100);
    expect(out.annotations.map((a) => a.startLine)).toEqual([2, 8]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseAnnotatedExplanation("not json", 10)).toThrow();
  });

  it("throws when neither summary nor annotations survive", () => {
    const raw = JSON.stringify({ summary: "", annotations: [] });
    expect(() => parseAnnotatedExplanation(raw, 10)).toThrow();
  });
});
