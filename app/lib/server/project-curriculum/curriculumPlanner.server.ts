import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { CodeAsset, ProjectFile } from "~/lib/learn/types";
import { newId, nowIso, stringifyJsonField } from "../learn/db-json.server";
import { collectAbilityTagsFromAssets } from "./abilityGenerator.server";
import { mapCurriculumBlueprintRow } from "./mappers.server";
import type { CurriculumBlueprintRow } from "~/lib/learn/types";

export type PlannedLesson = {
  slug: string;
  title: string;
  description: string;
  learningGoal: string;
  sourceFiles: string[];
  relatedAssetIds: string[];
  questionPlan: string;
};

export type PlannedCourse = {
  slug: string;
  title: string;
  description: string;
  projectContext: string;
  abilityTags: AbilityTag[];
  orderIndex: number;
  lessons: PlannedLesson[];
};

export type CurriculumBlueprintData = {
  courses: PlannedCourse[];
  summary: string;
  detectedModules: string[];
};

const COURSE_TEMPLATES: Array<{
  slug: string;
  title: string;
  description: string;
  match: (f: ProjectFile) => boolean;
}> = [
  {
    slug: "project-root-shell",
    title: "项目入口与 App Shell",
    description: "理解 root、全局布局与主题如何影响整个站点",
    match: (f) => f.fileKind === "root" || f.filePath.includes("entry"),
  },
  {
    slug: "project-routes-pages",
    title: "路由结构与页面组成",
    description: "从 routes 目录理解页面如何挂载与组织",
    match: (f) => f.fileKind === "route",
  },
  {
    slug: "project-auth-session",
    title: "登录态、Cookie 与 Session",
    description: "Better Auth 与受保护路由的守门逻辑",
    match: (f) => f.fileKind === "auth" || f.fileKind === "session",
  },
  {
    slug: "project-nemesis-chat",
    title: "Nemesis Chat 请求链",
    description: "从前端发起到 AI Gateway 的完整请求链",
    match: (f) =>
      f.fileKind === "ai_gateway" ||
      f.filePath.toLowerCase().includes("nemesis") ||
      f.filePath.toLowerCase().includes("chat"),
  },
  {
    slug: "project-rate-limit-guard",
    title: "限流与安全守门",
    description: "rate limit 与 guard 如何保护 API",
    match: (f) => f.fileKind === "rate_limit",
  },
  {
    slug: "project-theme-global",
    title: "全局主题与暗色模式",
    description: "主题状态如何在 root 层统一管理",
    match: (f) => f.fileKind === "theme",
  },
  {
    slug: "project-data-persistence",
    title: "数据与持久化",
    description: "D1 migrations 与数据访问模式",
    match: (f) => f.fileKind === "database" || f.fileKind === "data",
  },
  {
    slug: "project-components-ui",
    title: "组件层级与 UI 组织",
    description: "components 目录下的职责划分",
    match: (f) => f.fileKind === "component",
  },
  {
    slug: "project-server-utils",
    title: "服务端工具与业务逻辑",
    description: "lib/services 中的 server-only 代码",
    match: (f) => f.fileKind === "server_util",
  },
];

export function buildCurriculumBlueprint(
  files: ProjectFile[],
  assets: CodeAsset[],
): CurriculumBlueprintData {
  const courses: PlannedCourse[] = [];
  const abilityTags = collectAbilityTagsFromAssets(assets);
  let orderIndex = 0;

  for (const template of COURSE_TEMPLATES) {
    const matchedFiles = files.filter(template.match);
    if (matchedFiles.length === 0) continue;

    const relatedAssets = assets.filter((a) =>
      matchedFiles.some((f) => f.filePath === a.filePath),
    );

    const lessons: PlannedLesson[] = matchedFiles.slice(0, 8).map((file, i) => {
      const fileAssets = relatedAssets.filter((a) => a.filePath === file.filePath);
      return {
        slug: file.filePath.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || `lesson-${i}`,
        title: file.filePath.split("/").pop() ?? `关卡 ${i + 1}`,
        description: file.summary ?? `阅读并理解 ${file.filePath}`,
        learningGoal: `能解释 ${file.filePath} 在项目中的作用`,
        sourceFiles: [file.filePath],
        relatedAssetIds: fileAssets.map((a) => a.id),
        questionPlan: "基于代码资产生成因果链题目（单选/排序/填空）",
      };
    });

    if (lessons.length === 0) continue;

    courses.push({
      slug: template.slug,
      title: template.title,
      description: template.description,
      projectContext: "基于仓库 remix/ 个人网站源码自动生成",
      abilityTags: abilityTags.slice(0, 5),
      orderIndex: orderIndex++,
      lessons,
    });
  }

  return {
    courses,
    summary: `从 ${files.length} 个文件、${assets.length} 个代码资产生成 ${courses.length} 门课程`,
    detectedModules: courses.map((c) => c.title),
  };
}

export async function saveCurriculumBlueprint(
  db: D1Database,
  sourceId: string,
  data: CurriculumBlueprintData,
): Promise<string> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO curriculum_blueprints (
        id, source_id, title, summary, generated_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)`,
    )
    .bind(
      id,
      sourceId,
      "项目课程大纲",
      data.summary,
      stringifyJsonField(data),
      now,
      now,
    )
    .run();
  return id;
}

export async function getLatestBlueprint(db: D1Database, sourceId: string) {
  const row = await db
    .prepare(
      "SELECT * FROM curriculum_blueprints WHERE source_id = ? ORDER BY created_at DESC LIMIT 1",
    )
    .bind(sourceId)
    .first<CurriculumBlueprintRow>();
  return row ? mapCurriculumBlueprintRow(row) : null;
}
