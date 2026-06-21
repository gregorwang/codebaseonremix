import { describe, expect, it } from "vitest";
import {
  classifyFileKind,
  scoreFileImportance,
} from "~/lib/server/project-curriculum/fileKind.server";
import { shouldSkipFileContent } from "~/lib/server/project-curriculum/projectScanner.server";
import {
  validateCurriculumBlueprint,
  validateCurriculumDraftCourses,
} from "~/lib/server/project-curriculum/curriculumSchemas.server";

describe("classifyFileKind", () => {
  it("classifies remix entry and auth files", () => {
    expect(classifyFileKind("app/root.tsx")).toBe("root");
    expect(classifyFileKind("app/lib/auth.server.ts")).toBe("auth");
    expect(classifyFileKind("app/routes/api.nemesis.ts")).toBe("route");
    expect(classifyFileKind("app/services/nemesis-ai-gateway.server.ts")).toBe("ai_gateway");
    expect(classifyFileKind("app/utils/rate-limit.server.ts")).toBe("rate_limit");
  });

  it("scores high-importance files higher", () => {
    const root = scoreFileImportance("app/root.tsx", "root");
    const unknown = scoreFileImportance("misc/foo.ts", "unknown");
    expect(root).toBeGreaterThan(unknown);
  });
});

describe("shouldSkipFileContent", () => {
  it("skips content with secret patterns", () => {
    expect(shouldSkipFileContent("const key = 'sk-abc123secretkey'")).toBe(true);
    expect(shouldSkipFileContent("export const theme = 'dark'")).toBe(false);
  });
});

describe("curriculumSchemas", () => {
  it("validates blueprint with courses and lessons", () => {
    const result = validateCurriculumBlueprint({
      summary: "test",
      detectedModules: [],
      courses: [
        {
          slug: "auth",
          title: "认证",
          lessons: [{ slug: "l1", title: "关卡 1", abilityTags: [] }],
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects empty blueprint", () => {
    const result = validateCurriculumBlueprint({ courses: [] });
    expect(result.valid).toBe(false);
  });

  it("validates draft courses array", () => {
    const result = validateCurriculumDraftCourses([
      {
        slug: "theme",
        title: "主题",
        lessons: [{ slug: "l1", title: "关卡", abilityTags: [] }],
      },
    ]);
    expect(result.valid).toBe(true);
  });
});
