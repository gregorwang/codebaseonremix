import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Phase 0 regression tests. These are the spec the rest of the refactor must satisfy.
 *
 * They run against a static baseline SQL export so the test:
 *   - doesn't need wrangler/D1 at test time
 *   - is reproducible in CI
 *   - captures the current bad state for later comparison
 *
 * To refresh after a re-seed: run
 *   `npx wrangler d1 export code-coach-db --remote --no-schema --output tests/fixtures/baseline-2026-06-16.sql`
 */

const BASELINE_PATH = path.resolve(
  process.cwd(),
  "tests/fixtures/baseline-2026-06-16.sql",
);

type QuestionRow = {
  id: string;
  lessonId: string;
  prompt: string;
  isPublished: boolean;
};

/**
 * Minimal SQLite INSERT parser. Handles the wrangler D1 export format:
 *   INSERT INTO "questions" ("col1","col2",...) VALUES('v1','v2',...);
 *   INSERT INTO "questions" ... VALUES('v1','v2',...),('v3','v4',...);
 *
 * Returns only the columns we need: id, lesson_id, prompt, is_published.
 */
function parseQuestionsFromSql(sql: string): QuestionRow[] {
  const out: QuestionRow[] = [];
  const stmtRe = /INSERT INTO "questions" \(([^)]+)\) VALUES\s*([\s\S]+?);\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = stmtRe.exec(sql)) !== null) {
    const cols = match[1]!
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""));
    const idIdx = cols.indexOf("id");
    const lessonIdx = cols.indexOf("lesson_id");
    const promptIdx = cols.indexOf("prompt");
    const publishedIdx = cols.indexOf("is_published");
    if (idIdx < 0 || lessonIdx < 0 || promptIdx < 0 || publishedIdx < 0) {
      throw new Error(`Unexpected questions column set: ${cols.join(",")}`);
    }
    const valuesBlock = match[2]!;
    const rows: string[][] = [];
    let depth = 0;
    let cur: string[] = [];
    let field = "";
    let inString = false;
    for (let i = 0; i < valuesBlock.length; i++) {
      const ch = valuesBlock[i]!;
      if (inString) {
        if (ch === "'") {
          if (valuesBlock[i + 1] === "'") {
            field += "'";
            i++;
          } else {
            inString = false;
          }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === "'") {
        inString = true;
        continue;
      }
      if (ch === "(" && depth === 0) {
        depth = 1;
        cur = [];
        field = "";
        continue;
      }
      if (ch === "(" && depth > 0) {
        depth++;
        field += ch;
        continue;
      }
      if (ch === ")" && depth === 1) {
        cur.push(field);
        rows.push(cur);
        depth = 0;
        field = "";
        continue;
      }
      if (ch === ")" && depth > 1) {
        depth--;
        field += ch;
        continue;
      }
      if (ch === "," && depth === 1) {
        cur.push(field);
        field = "";
        continue;
      }
      if (depth > 0) {
        field += ch;
      }
    }
    for (const row of rows) {
      const id = row[idIdx] ?? "";
      const lessonId = row[lessonIdx] ?? "";
      const prompt = row[promptIdx] ?? "";
      const pub = row[publishedIdx] ?? "0";
      out.push({
        id,
        lessonId,
        prompt,
        isPublished: pub === "1",
      });
    }
  }
  return out;
}

function loadPublishedQuestions(): QuestionRow[] {
  if (!existsSync(BASELINE_PATH)) {
    throw new Error(
      `Baseline file not found: ${BASELINE_PATH}. Export with: npx wrangler d1 export code-coach-db --remote --no-schema --output tests/fixtures/baseline-2026-06-16.sql`,
    );
  }
  const sql = readFileSync(BASELINE_PATH, "utf8");
  return parseQuestionsFromSql(sql).filter((q) => q.isPublished);
}

/** Generic INSERT parser for D1 export SQL. d1's --no-schema output
 *  places each row of an INSERT on its own line; we exploit that. */
function parseTable(
  sql: string,
  table: string,
  _cols: readonly string[],
): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  // Each non-empty line is a complete INSERT statement.
  const lines = sql.split(/\r?\n/);
  let colList: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(`INSERT INTO "${table}"`)) continue;
    // Header line: `INSERT INTO "x" ("c1","c2",...) VALUES (...),(...),...;`
    // Find the column list and the values block.
    const parenEnd = trimmed.indexOf(")");
    if (parenEnd < 0) continue;
    if (colList.length === 0) {
      colList = trimmed
        .slice(trimmed.indexOf("(") + 1, parenEnd)
        .split(",")
        .map((s) => s.replace(/"/g, "").trim());
    }
    const valuesIdx = trimmed.indexOf("VALUES", parenEnd);
    if (valuesIdx < 0) continue;
    let i = valuesIdx + "VALUES".length;
    while (i < trimmed.length && /\s/.test(trimmed[i]!)) i++;
    const valuesBlock = trimmed.slice(i).replace(/;\s*$/, "");
    let depth = 0;
    let cur: string[] = [];
    let field = "";
    let inString = false;
    for (let k = 0; k < valuesBlock.length; k++) {
      const ch = valuesBlock[k]!;
      if (inString) {
        if (ch === "'") {
          if (valuesBlock[k + 1] === "'") {
            field += "'";
            k++;
          } else {
            inString = false;
          }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === "'") {
        inString = true;
        continue;
      }
      if (ch === "(" && depth === 0) {
        depth = 1;
        cur = [];
        field = "";
        continue;
      }
      if (ch === "(" && depth > 0) {
        depth++;
        field += ch;
        continue;
      }
      if (ch === ")" && depth === 1) {
        cur.push(field);
        const row: Record<string, string> = {};
        colList.forEach((c, idx) => (row[c] = cur[idx] ?? ""));
        out.push(row);
        depth = 0;
        field = "";
        continue;
      }
      if (ch === ")" && depth > 1) {
        depth--;
        field += ch;
        continue;
      }
      if (ch === "," && depth === 1) {
        cur.push(field);
        field = "";
        continue;
      }
      if (depth > 0) field += ch;
    }
  }
  return out;
}

function loadOriginByLesson(): Map<string, string> {
  const sql = readFileSync(BASELINE_PATH, "utf8");
  const courses = parseTable(sql, "courses", ["id", "slug", "origin"]);
  const lessons = parseTable(sql, "lessons", ["id", "course_id"]);
  const courseById = new Map(courses.map((c) => [c.id!, c.origin ?? "project"]));
  const out = new Map<string, string>();
  for (const l of lessons) {
    out.set(l.id!, courseById.get(l.course_id ?? "") ?? "project");
  }
  return out;
}

describe("curriculum duplication baseline (Phase 0 spec)", () => {
  const allPublished = loadPublishedQuestions();
  const originByLesson = loadOriginByLesson();

  it("captures the published curriculum size (sanity check)", () => {
    expect(allPublished.length).toBeGreaterThan(0);
  });

  it("asserts no prompt appears more than once within a single lesson", () => {
    const byLesson = new Map<string, string[]>();
    for (const q of allPublished) {
      const list = byLesson.get(q.lessonId) ?? [];
      list.push(q.prompt);
      byLesson.set(q.lessonId, list);
    }
    const offending: Array<{ lessonId: string; prompt: string; count: number }> = [];
    for (const [lessonId, prompts] of byLesson) {
      const seen = new Map<string, number>();
      for (const p of prompts) {
        seen.set(p, (seen.get(p) ?? 0) + 1);
      }
      for (const [prompt, count] of seen) {
        if (count > 1) {
          offending.push({ lessonId, prompt, count });
        }
      }
    }
    if (offending.length > 0) {
      const totalDupRows = offending.reduce((s, o) => s + (o.count - 1), 0);
      const lessons = new Set(offending.map((o) => o.lessonId)).size;
      const sample = offending.slice(0, 5);
      throw new Error(
        `Found ${totalDupRows} within-lesson prompt duplicates across ${lessons} lessons. ` +
          `Sample: ${JSON.stringify(sample, null, 2)}`,
      );
    }
  });

  it("asserts no prompt appears in more than one lesson", () => {
    const byPrompt = new Map<string, Set<string>>();
    for (const q of allPublished) {
      const set = byPrompt.get(q.prompt) ?? new Set();
      set.add(q.lessonId);
      byPrompt.set(q.prompt, set);
    }
    const offending: Array<{ prompt: string; lessons: number }> = [];
    for (const [prompt, lessons] of byPrompt) {
      if (lessons.size > 1) {
        offending.push({ prompt, lessons: lessons.size });
      }
    }
    offending.sort((a, b) => b.lessons - a.lessons);
    if (offending.length > 0) {
      const totalRows = offending.reduce((s, o) => s + o.lessons, 0);
      const sample = offending.slice(0, 10);
      throw new Error(
        `Found ${offending.length} prompts duplicated across lessons, affecting ${totalRows} rows. ` +
          `Top offenders: ${JSON.stringify(sample, null, 2)}`,
      );
    }
  });

  it("asserts every lesson has between 22 and 54 questions (timu.MD density)", () => {
    // 22-30 for normal lessons, 36-54 for Nemesis / unit 8 lessons.
    // We use a broader band (22-54) since the baseline SQL doesn't carry unit_index.
    // Phase 4 brought sample courses to 22+, so the band now applies uniformly.
    const byLesson = new Map<string, number>();
    for (const q of allPublished) {
      byLesson.set(q.lessonId, (byLesson.get(q.lessonId) ?? 0) + 1);
    }
    const tooFew: Array<{ lessonId: string; n: number }> = [];
    const tooMany: Array<{ lessonId: string; n: number }> = [];
    for (const [lessonId, n] of byLesson) {
      if (n < 22) tooFew.push({ lessonId, n });
      else if (n > 54) tooMany.push({ lessonId, n });
    }
    if (tooFew.length > 0 || tooMany.length > 0) {
      throw new Error(
        `Lesson density out of band. ` +
          `Too few (<22): ${tooFew.length} lessons (sample: ${JSON.stringify(
            tooFew.slice(0, 5),
            null,
            2,
          )}). ` +
          `Too many (>54): ${tooMany.length} lessons (sample: ${JSON.stringify(
            tooMany.slice(0, 5),
            null,
            2,
          )}).`,
      );
    }
  });
});
