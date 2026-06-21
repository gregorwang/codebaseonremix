import type { AbilityTag } from "~/lib/learn/abilityTags";
import { ABILITY_TAGS } from "~/lib/learn/abilityTags";
import type { CodeAsset } from "~/lib/learn/types";

export type AbilityGroupL1 = {
  id: string;
  label: string;
  tags: Array<{ tag: AbilityTag | string; label: string; fromProject: boolean }>;
};

const L1_GROUPS: Array<{ id: string; label: string; keywords: string[] }> = [
  { id: "frontend_state", label: "前端状态链", keywords: ["useState", "useEffect", "theme", "state"] },
  { id: "backend_chain", label: "后端请求链", keywords: ["auth", "rate", "guard", "session"] },
  { id: "bridge", label: "前后端连接", keywords: ["loader", "action", "fetcher"] },
  { id: "routing", label: "路由与数据加载", keywords: ["routes", "route"] },
  { id: "auth", label: "认证与权限", keywords: ["auth", "login", "betterAuth", "admin"] },
  { id: "ai", label: "AI 调用与守门", keywords: ["nemesis", "gateway", "ai"] },
  { id: "database", label: "数据库与持久化", keywords: ["d1", "migration", "database"] },
  { id: "theme", label: "主题与全局状态", keywords: ["theme", "dark"] },
  { id: "code_org", label: "代码组织与文件边界", keywords: ["component", "lib", "services"] },
  { id: "ai_review", label: "AI 代码评审", keywords: ["review", "architecture"] },
  { id: "modify", label: "真实改造能力", keywords: ["modify", "refactor", "fullstack"] },
];

export function generateAbilityTreeFromAssets(
  assets: CodeAsset[],
): AbilityGroupL1[] {
  const projectTags = new Set<string>();
  for (const asset of assets) {
    for (const tag of asset.abilityTags) projectTags.add(tag);
    for (const c of asset.detectedConcepts) projectTags.add(`concept:${c}`);
  }

  return L1_GROUPS.map((group) => {
    const tags: AbilityGroupL1["tags"] = [];

    for (const tag of ABILITY_TAGS) {
      const match = group.keywords.some((kw) => tag.includes(kw) || kw.includes(tag.split(".")[1] ?? ""));
      if (match) {
        tags.push({
          tag,
          label: tag,
          fromProject: projectTags.has(tag),
        });
      }
    }

    for (const concept of projectTags) {
      if (!concept.startsWith("concept:")) continue;
      const label = concept.replace("concept:", "");
      if (group.keywords.some((kw) => label.toLowerCase().includes(kw))) {
        tags.push({ tag: concept, label, fromProject: true });
      }
    }

    return { id: group.id, label: group.label, tags };
  });
}

export function collectAbilityTagsFromAssets(assets: CodeAsset[]): AbilityTag[] {
  const set = new Set<AbilityTag>();
  for (const asset of assets) {
    for (const tag of asset.abilityTags) set.add(tag);
  }
  return [...set];
}
