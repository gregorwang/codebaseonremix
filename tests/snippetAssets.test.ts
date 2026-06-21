import { describe, expect, it } from "vitest";
import { parseAiJsonResponse } from "~/lib/server/ai/aiJson.server";
import { assertSafeRemixPath } from "~/lib/learn/remixPath";

describe("parseAiJsonResponse", () => {
  it("parses plain JSON", () => {
    const result = parseAiJsonResponse('{"questions":[]}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ questions: [] });
    }
  });

  it("strips markdown fences", () => {
    const result = parseAiJsonResponse('```json\n{"title":"test"}\n```');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ title: "test" });
    }
  });

  it("returns error for invalid JSON", () => {
    const result = parseAiJsonResponse("not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("JSON");
      expect(result.raw).toBe("not json");
    }
  });
});

describe("assertSafeRemixPath", () => {
  it("accepts valid relative paths", () => {
    expect(assertSafeRemixPath("app/routes/foo.tsx")).toBe(
      "app/routes/foo.tsx",
    );
  });

  it("rejects path traversal", () => {
    expect(() => assertSafeRemixPath("../secrets.ts")).toThrow(
      "Path traversal",
    );
  });

  it("rejects unsupported extensions", () => {
    // .txt / 二进制类不在白名单(v3 起白名单含 .ts/.tsx/.js/.jsx/.mjs/.cjs/.css/.sql/.md/.json)。
    expect(() => assertSafeRemixPath("app/data.txt")).toThrow(
      "Unsupported file type",
    );
    expect(() => assertSafeRemixPath("app/logo.png")).toThrow(
      "Unsupported file type",
    );
  });
});
