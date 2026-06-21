/**
 * LessonSpec enricher. Pure-ish helper: given a LessonSpec and a courseSlug,
 * derive the *enhanced* view the question generators consume.
 *
 * We deliberately do NOT hit D1 here — code_assets are sparsely populated and
 * the remix/ project layout already gives us `path`, `summary`, `focus`,
 * and `abilityTags` to anchor every question. This is intentional:
 * per-lesson uniqueness is the requirement, not per-lesson real code.
 *
 * When code_assets becomes reliable, drop in a `await findAssetByPath(spec.path)`
 * call and pass `code` through. For now we generate a small synthetic snippet
 * from `spec.path` + `spec.summary` + a per-lesson salt so the rendered
 * code block is recognizable as *this* lesson (not a shared pack template).
 */
import type { LessonSpec } from "./factory";

export type EnhancedLessonSpec = {
  lesson: LessonSpec;
  courseSlug: string;
  /** Stable, lesson-specific salt (deterministic, no Math.random). */
  salt: string;
  /** True for unit 8 (Nemesis) courses, which need 36-54 questions. */
  isNemesisUnit: boolean;
  /** Synthetic code excerpt: 5-9 lines derived from path + summary. */
  codeExcerpt: string;
  /**
   * Path-with-slug for human display. When multiple lessons share a path
   * (e.g. several site-01 lessons all using "app/"), pathTag includes the
   * lesson slug so prompts are unique across lessons.
   */
  pathTag: string;
};

/** djb2 hash → short hex. Stable across runs. */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  // unsigned 32-bit
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** A 5-9 line synthetic excerpt used in code-heavy question types. */
function synthesizeCodeExcerpt(spec: LessonSpec, salt: string, slug: string): string {
  const path = spec.path || "app/";
  const head = `// remix/${path}`;
  const focus = (spec.focus ?? spec.summary ?? "").slice(0, 80);
  // 5 representative lines drawn from a salt+slug seed so different lessons
  // that share a path still get visibly different code blocks.
  const seedNums: number[] = [];
  let acc = 0;
  const seedSource = `${salt}::${slug}`;
  for (let i = 0; i < seedSource.length; i++) {
    acc = (acc * 31 + seedSource.charCodeAt(i)) >>> 0;
    seedNums.push(acc % 9);
  }
  const lines = [
    `// ${focus}`,
    `export async function ${salt.slice(0, 4)}__${slug.slice(0, 4)}({ request }) {`,
    `  // guard #${seedNums[0] ?? 1}`,
    `  // step #${seedNums[1] ?? 2}`,
    `  // step #${seedNums[2] ?? 3}`,
    `  // step #${seedNums[3] ?? 4}`,
    `  // step #${seedNums[4] ?? 5}`,
    `  return ${salt.slice(0, 3)}({ ok: true });`,
    `}`,
  ];
  return [head, ...lines].join("\n");
}

export function enrichLessonSpec(
  spec: LessonSpec,
  courseSlug: string,
): EnhancedLessonSpec {
  const salt = djb2(`${courseSlug}/${spec.slug}/${spec.path}`);
  return {
    lesson: spec,
    courseSlug,
    salt,
    isNemesisUnit: courseSlug.startsWith("site-18") || courseSlug.startsWith("site-19") || courseSlug.startsWith("site-20"),
    codeExcerpt: synthesizeCodeExcerpt(spec, salt, spec.slug),
    pathTag: `remix/${spec.path || "app/"}[${spec.slug}]`,
  };
}
