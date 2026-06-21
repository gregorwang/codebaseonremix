import { describe, expect, it } from "vitest";
import { locateSnippetLines } from "~/lib/learn/locateSnippet";

const FULL = `import { foo } from "bar";

export function getEnv(ctx) {
  const value = ctx.cloudflare.env.SECRET;
  return value;
}

export const other = 1;
`;

describe("locateSnippetLines", () => {
  it("locates a multi-line snippet and returns its 1-based line range", () => {
    const snippet = `export function getEnv(ctx) {
  const value = ctx.cloudflare.env.SECRET;
  return value;
}`;
    expect(locateSnippetLines(FULL, snippet)).toEqual([3, 4, 5, 6]);
  });

  it("ignores leading/trailing blank lines in the snippet", () => {
    const snippet = `\n  const value = ctx.cloudflare.env.SECRET;\n`;
    expect(locateSnippetLines(FULL, snippet)).toEqual([4]);
  });

  it("matches despite indentation differences (trim-based)", () => {
    const snippet = `        return value;`;
    expect(locateSnippetLines(FULL, snippet)).toEqual([5]);
  });

  it("returns empty array when nothing matches", () => {
    expect(locateSnippetLines(FULL, "const nope = 999;")).toEqual([]);
  });

  it("returns empty array for empty inputs", () => {
    expect(locateSnippetLines("", "x")).toEqual([]);
    expect(locateSnippetLines(FULL, "")).toEqual([]);
    expect(locateSnippetLines(FULL, "   \n  ")).toEqual([]);
  });
});
