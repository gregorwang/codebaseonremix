/**
 * Phase 3 authoring quality bar. Pure unit tests: no D1.
 * For every LessonSpec in ALL_COURSE_SPECS we run buildLessonQuestions and
 * assert:
 *   1. Question count is in [22,30] (normal) or [36,54] (Nemesis unit).
 *   2. Every prompt is unique within the lesson.
 *   3. Every question has layer set.
 *   4. At least 5 distinct layers are present in the lesson.
 *   5. AI-review / diff_review / code_fix questions have realWorldImpact.
 *   6. No question matches the §7.2 blacklist.
 *   7. The whole curriculum has zero cross-lesson prompt duplication
 *      (paired with the prompt in the lesson+prompt uniqueness check).
 */
import { describe, expect, it } from "vitest";
import { ALL_COURSE_SPECS } from "~/lib/server/learn/seed-data/units/courseCatalog";
import { buildLessonQuestions } from "~/lib/server/learn/seed-data/units/lessonQuestions";
import {
  passesQualityBar,
} from "~/lib/server/learn/seed-data/units/perLessonGenerators";
import type { CreateQuestionInput } from "~/lib/learn/types";

type Q = Omit<CreateQuestionInput, "lessonId">;

const BLACKLIST: RegExp[] = [
  /^.{0,12}$/,
  /^(这个|那个)函数叫什么/,
  /^.{0,4}扩展.{0,4}$/,
];

function expectLessonShape(courseSlug: string, lessonSlug: string, qs: Q[]) {
  const isNemesis = /site-(18|19|20)/.test(courseSlug);
  const min = isNemesis ? 36 : 22;
  const max = isNemesis ? 54 : 30;
  expect(
    qs.length,
    `${courseSlug}/${lessonSlug} has ${qs.length} questions, expected [${min}, ${max}]`,
  ).toBeGreaterThanOrEqual(min);
  expect(
    qs.length,
    `${courseSlug}/${lessonSlug} has ${qs.length} questions, expected [${min}, ${max}]`,
  ).toBeLessThanOrEqual(max);

  // uniqueness
  const seen = new Map<string, number>();
  qs.forEach((q0, idx) => {
    const key = q0.prompt.trim();
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if (seen.get(key)! > 1) {
      throw new Error(
        `Duplicate prompt in ${courseSlug}/${lessonSlug} at idx ${idx}: ${key}`,
      );
    }
  });

  // every q has layer
  for (const q0 of qs) {
    expect(
      q0.layer,
      `${courseSlug}/${lessonSlug}: type=${q0.type} missing layer`,
    ).toBeTruthy();
  }

  // at least 5 distinct layers
  const layers = new Set(qs.map((q0) => q0.layer));
  expect(
    layers.size,
    `${courseSlug}/${lessonSlug}: only ${layers.size} distinct layers (${[...layers].join(",")})`,
  ).toBeGreaterThanOrEqual(5);

  // ai-review / diff_review / code_fix must carry realWorldImpact
  for (const q0 of qs) {
    if (
      q0.type === "ai_review" ||
      q0.type === "diff_review" ||
      q0.type === "code_fix"
    ) {
      expect(
        q0.realWorldImpact,
        `${courseSlug}/${lessonSlug} ${q0.type} missing realWorldImpact`,
      ).toBeTruthy();
    }
  }

  // no blacklist hits
  for (const q0 of qs) {
    for (const re of BLACKLIST) {
      expect(
        re.test(q0.prompt.trim()),
        `${courseSlug}/${lessonSlug} prompt hits blacklist: ${q0.prompt}`,
      ).toBe(false);
    }
  }

  // every question must pass the quality bar (defense in depth)
  for (const q0 of qs) {
    expect(
      passesQualityBar(q0),
      `${courseSlug}/${lessonSlug} failed quality bar: ${JSON.stringify(q0).slice(0, 200)}`,
    ).toBe(true);
  }
}

describe("curriculumAuthoring (Phase 3)", () => {
  it("per-lesson shape: count, uniqueness, layers, realWorldImpact, no blacklist", () => {
    for (const course of ALL_COURSE_SPECS) {
      for (const lesson of course.lessons) {
        const qs = buildLessonQuestions(lesson, 0, course.slug);
        expectLessonShape(course.slug, lesson.slug, qs);
      }
    }
  });

  it("no cross-lesson prompt duplication across the whole curriculum", () => {
    const promptToLessons = new Map<string, string[]>();
    for (const course of ALL_COURSE_SPECS) {
      for (const lesson of course.lessons) {
        const qs = buildLessonQuestions(lesson, 0, course.slug);
        for (const q0 of qs) {
          const key = q0.prompt.trim();
          const list = promptToLessons.get(key) ?? [];
          list.push(`${course.slug}/${lesson.slug}`);
          promptToLessons.set(key, list);
        }
      }
    }
    const dups: Array<{ prompt: string; lessons: string[] }> = [];
    for (const [prompt, lessons] of promptToLessons) {
      if (lessons.length > 1) dups.push({ prompt, lessons });
    }
    if (dups.length > 0) {
      // Surface the first 5 dups so the failure is actionable.
      const sample = dups.slice(0, 5).map((d) => `  - ${d.prompt}\n    → ${d.lessons.join(", ")}`);
      throw new Error(
        `${dups.length} cross-lesson prompt dups. First 5:\n${sample.join("\n")}`,
      );
    }
    expect(dups.length).toBe(0);
  });

  it("Nemesis unit 8 lessons reach 36-54 questions", () => {
    for (const course of ALL_COURSE_SPECS) {
      if (!/site-(18|19|20)/.test(course.slug)) continue;
      for (const lesson of course.lessons) {
        const qs = buildLessonQuestions(lesson, 0, course.slug);
        expect(
          qs.length,
          `Nemesis ${course.slug}/${lesson.slug} expected >=36, got ${qs.length}`,
        ).toBeGreaterThanOrEqual(36);
        expect(
          qs.length,
          `Nemesis ${course.slug}/${lesson.slug} expected <=54, got ${qs.length}`,
        ).toBeLessThanOrEqual(54);
      }
    }
  });
});
