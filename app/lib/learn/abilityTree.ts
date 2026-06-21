import type { AbilityTag } from "./abilityTags";
import { ABILITY_TAGS } from "./abilityTags";

export type AbilityTreeSubGroup = {
  id: string;
  label: string;
  tags: AbilityTag[];
};

export type AbilityTreeGroup = {
  id: string;
  label: string;
  subGroups: AbilityTreeSubGroup[];
};

export const ABILITY_TREE_GROUPS: AbilityTreeGroup[] = [
  {
    id: "frontend",
    label: "前端状态链",
    subGroups: [
      {
        id: "state",
        label: "状态作用域",
        tags: [
          "frontend.state.scope",
          "frontend.state.global",
          "frontend.state.local",
        ],
      },
      {
        id: "event",
        label: "事件链",
        tags: ["frontend.event.click", "frontend.event.submit"],
      },
      {
        id: "effect",
        label: "副作用",
        tags: ["frontend.effect.useEffect"],
      },
    ],
  },
  {
    id: "backend",
    label: "后端请求链",
    subGroups: [
      { id: "session", label: "Session", tags: ["backend.session.cookie"] },
      { id: "auth", label: "Auth", tags: ["backend.auth.required"] },
      { id: "validation", label: "Validation", tags: ["backend.validation.field"] },
      { id: "rateLimit", label: "Rate limit", tags: ["backend.rateLimit"] },
    ],
  },
  {
    id: "bridge",
    label: "前后端连接",
    subGroups: [
      { id: "loader", label: "Loader", tags: ["bridge.reactRouter.loader"] },
      { id: "action", label: "Action", tags: ["bridge.reactRouter.action"] },
    ],
  },
  {
    id: "code",
    label: "代码组织与位置",
    subGroups: [
      { id: "position", label: "Handler 位置", tags: ["code.position.handler"] },
    ],
  },
  {
    id: "ai",
    label: "AI 协作判断",
    subGroups: [
      { id: "review", label: "架构评审", tags: ["ai.review.architecture"] },
    ],
  },
  {
    id: "project",
    label: "真实改造能力",
    subGroups: [
      { id: "modify", label: "全栈改造", tags: ["project.modify.fullstack"] },
    ],
  },
];

const tagToGroup = new Map<AbilityTag, AbilityTreeGroup>();
const tagToSubGroup = new Map<AbilityTag, AbilityTreeSubGroup>();

for (const group of ABILITY_TREE_GROUPS) {
  for (const subGroup of group.subGroups) {
    for (const tag of subGroup.tags) {
      tagToGroup.set(tag, group);
      tagToSubGroup.set(tag, subGroup);
    }
  }
}

for (const tag of ABILITY_TAGS) {
  if (!tagToGroup.has(tag)) {
    const fallbackGroup = ABILITY_TREE_GROUPS[0]!;
    const fallbackSubGroup = fallbackGroup.subGroups[0]!;
    tagToGroup.set(tag, fallbackGroup);
    tagToSubGroup.set(tag, fallbackSubGroup);
  }
}

export function getGroupForTag(tag: AbilityTag): AbilityTreeGroup {
  return tagToGroup.get(tag) ?? ABILITY_TREE_GROUPS[0]!;
}

export function getSubGroupForTag(tag: AbilityTag): AbilityTreeSubGroup {
  return tagToSubGroup.get(tag) ?? ABILITY_TREE_GROUPS[0]!.subGroups[0]!;
}

export function getSiblingTags(tag: AbilityTag): AbilityTag[] {
  return getSubGroupForTag(tag).tags.filter((candidate) => candidate !== tag);
}

export function getAllTagsInGroup(groupId: string): AbilityTag[] {
  const group = ABILITY_TREE_GROUPS.find((entry) => entry.id === groupId);
  if (!group) return [];
  return group.subGroups.flatMap((subGroup) => subGroup.tags);
}
