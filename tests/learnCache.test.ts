import { describe, expect, it } from "vitest";
import {
  LEARN_CACHE_KEYS,
  LEARN_CACHE_VERSION,
  learnCacheKey,
} from "~/lib/server/learn/cache-keys";
import { resolveQuestionIndex, type CachedQuestionSummary } from "~/lib/server/learn/cache-lesson.server";
import {
  deleteCacheKey,
  getCachedJson,
  setCachedJson,
} from "~/lib/server/learn/cache.server";

function createMockKv(store = new Map<string, string>()): KVNamespace {
  return {
    get: async (key: string, type?: "json" | "text") => {
      const value = store.get(key);
      if (value === undefined) return null;
      if (type === "json") return JSON.parse(value);
      return value;
    },
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as KVNamespace;
}

describe("learnCacheKey", () => {
  it("includes version prefix for invalidation", () => {
    expect(learnCacheKey("public", "exams")).toBe(
      `learn:${LEARN_CACHE_VERSION}:public:exams`,
    );
    expect(LEARN_CACHE_KEYS.publicCoursesOverview()).toContain(LEARN_CACHE_VERSION);
    expect(LEARN_CACHE_KEYS.lessonQuestionList("lesson-1")).toContain("lesson-1");
  });
});

describe("resolveQuestionIndex", () => {
  const summaries: CachedQuestionSummary[] = [
    { id: "q1", title: "A", type: "single_choice", difficulty: "beginner", abilityTags: [], orderIndex: 0 },
    { id: "q2", title: "B", type: "single_choice", difficulty: "beginner", abilityTags: [], orderIndex: 1 },
  ];

  it("clamps out-of-range indices", () => {
    expect(resolveQuestionIndex(summaries, -1)).toBe(0);
    expect(resolveQuestionIndex(summaries, 99)).toBe(1);
    expect(resolveQuestionIndex(summaries, 1)).toBe(1);
  });

  it("returns 0 for empty lessons", () => {
    expect(resolveQuestionIndex([], 5)).toBe(0);
  });
});

describe("cache.server", () => {
  it("returns null when cache binding is missing", async () => {
    await expect(getCachedJson(undefined, "any-key")).resolves.toBeNull();
    await expect(setCachedJson(undefined, "any-key", { ok: true })).resolves.toBeUndefined();
    await expect(deleteCacheKey(undefined, "any-key")).resolves.toBeUndefined();
  });

  it("round-trips JSON through mock KV", async () => {
    const kv = createMockKv();
    const payload = { courses: [], generatedAt: "2026-01-01T00:00:00.000Z" };

    await setCachedJson(kv, "test-key", payload);
    const cached = await getCachedJson<typeof payload>(kv, "test-key");

    expect(cached).toEqual(payload);
  });

  it("deleteCacheKey removes entries", async () => {
    const kv = createMockKv();
    await setCachedJson(kv, "test-key", { value: 1 });
    await deleteCacheKey(kv, "test-key");
    await expect(getCachedJson(kv, "test-key")).resolves.toBeNull();
  });
});
