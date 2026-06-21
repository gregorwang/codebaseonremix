import type { TeachingBlock } from "~/lib/learn/types";
import type { LessonSpec } from "../units/factory";
import { SNIPPETS } from "../snippets";

function snippetForLesson(lesson: LessonSpec): string | undefined {
  const key = `${lesson.path} ${lesson.slug} ${lesson.focus}`.toLowerCase();
  if (/root|theme|layout/.test(key)) return SNIPPETS.rootLoader;
  if (/nemesis|api\.nemesis/.test(key)) return SNIPPETS.apiNemesisChain;
  if (/auth|session|login/.test(key)) return SNIPPETS.authSessionSkip;
  if (/entry\.server/.test(key)) return SNIPPETS.entryServer;
  if (/client|hook|useNemesis/.test(key)) return SNIPPETS.nemesisHookState;
  if (/theme|fouc/.test(key)) return SNIPPETS.themeFoucScript;
  return `// remix/${lesson.path}\n// ${lesson.summary}\n// 训练重点：${lesson.focus}`;
}

export function buildTeachingBlocks(lesson: LessonSpec): TeachingBlock[] {
  const code = snippetForLesson(lesson);
  const path = lesson.path;

  return [
    {
      type: "concept",
      title: `为什么先读 remix/${path}？`,
      content: lesson.summary,
      keyPoints: [
        lesson.focus,
        `本课锚点文件：remix/${path}`,
        "先理解职责边界，再做题验证你是否能在真实项目里定位与修改。",
      ],
    },
    {
      type: "code_walkthrough",
      title: `真实代码：${lesson.title}`,
      sourceFilePath: path,
      code: code ?? `// remix/${path}`,
      highlights: [
        {
          lineStart: 1,
          lineEnd: 3,
          label: "入口/导出",
          explanation: `先确认 remix/${path} 对外暴露什么，以及谁会 import 它。`,
        },
      ],
    },
    {
      type: "checkpoint",
      title: "主动回忆",
      prompt: `不看代码，你能说出「${lesson.focus}」吗？`,
    },
  ];
}

export function buildLessonMeta(lesson: LessonSpec, questionCount: number) {
  return {
    abilityTags: lesson.abilityTags,
    estimatedQuestionCount: questionCount,
    trainingFocus: [
      lesson.focus,
      `阅读 remix/${lesson.path}`,
      "混合题型训练：概念 → 链路 → 填空 → 纠错 → 评审",
    ],
  };
}
