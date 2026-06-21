import type { QuestionType } from "~/lib/learn/types";
import type { SeedCourseData, SeedLessonData } from "./types";
import { SNIPPETS } from "./snippets";
import { q } from "./types";
import type { LessonSpec } from "./units/factory";
import { enrichLessonSpec } from "./units/lessonSpecEnricher";
import {
  LAYER_GENERATORS,
  passesQualityBar,
} from "./units/perLessonGenerators";

const REQUIRED_TYPES: QuestionType[] = [
  "single_choice",
  "multi_choice",
  "sort",
  "fill_blank",
  "debug",
  "branch_trace",
  "ai_review",
];

function supplementForLesson(
  lesson: SeedLessonData,
  course: SeedCourseData,
): SeedLessonData["questions"] {
  const existing = new Set(lesson.questions.map((x) => x.type));
  const extras: SeedLessonData["questions"] = [];
  let order = lesson.questions.length;
  // Course-unique marker so 3 sample courses never collide on prompts.
  const tag = `[${course.slug}/${lesson.slug}]`;

  const add = (partial: Parameters<typeof q>[0]) => {
    extras.push(q({ ...partial, orderIndex: order++ }));
  };

  if (!existing.has("multi_choice")) {
    add({
      type: "multi_choice",
      title: `${lesson.title} · 影响范围 · ${tag}`,
      prompt: `修改本课（${tag}）相关功能时，通常还需检查哪些部分？（多选）`,
      options: [
        { id: "caller", text: "调用方/路由" },
        { id: "server", text: "同链路 server 文件" },
        { id: "unrelated", text: "完全无关的 migrations" },
        { id: "ui", text: "关联 UI 组件" },
      ],
      correctAnswer: { choiceIds: ["caller", "server", "ui"] },
      explanation: {
        short: "全栈改动看上下游。",
        realProjectNote: lesson.sourceFilePath ?? course.projectContext,
      },
      abilityTags: course.abilityTags.slice(0, 2),
      sourceFilePath: lesson.sourceFilePath,
    });
  }

  if (!existing.has("fill_blank")) {
    add({
      type: "fill_blank",
      title: `${lesson.title} · 代码填空 · ${tag}`,
      prompt: `补全 ${tag} 关键符号：`,
      code: SNIPPETS.rootLayoutTheme,
      blanks: [{ id: "t", placeholder: "theme", acceptedAnswers: ["theme", "{theme}"] }],
      correctAnswer: { values: { t: "theme" } },
      explanation: { short: "theme 挂 html。", realProjectNote: "remix/app/root.tsx" },
      abilityTags: ["frontend.state.global"],
      sourceFilePath: "app/root.tsx",
    });
  }

  if (!existing.has("debug")) {
    add({
      type: "debug",
      title: `${lesson.title} · 纠错 · ${tag}`,
      prompt: `${tag} 以下局部黑夜模式实现的问题？`,
      code: SNIPPETS.mainPanelWrongDark,
      options: [
        { id: "scope", text: "全局需求做成局部状态" },
        { id: "ok", text: "正确" },
        { id: "tw", text: "Tailwind 版本" },
        { id: "db", text: "D1" },
      ],
      correctAnswer: { issueId: "scope" },
      explanation: { short: "应用 root 级主题。", realProjectNote: course.projectContext },
      abilityTags: ["frontend.state.scope"],
    });
  }

  if (!existing.has("branch_trace")) {
    add({
      type: "branch_trace",
      title: `${lesson.title} · 分支 · ${tag}`,
      prompt: `未登录访问 ${tag} 受保护能力时的分支：`,
      options: [
        { id: "1", text: "检查 session" },
        { id: "2", text: "失败" },
        { id: "3", text: "返回 401，不继续" },
      ],
      correctAnswer: { pathIds: ["1", "2", "3"] },
      explanation: { short: "fail fast。", realProjectNote: SNIPPETS.apiNemesisAuth },
      abilityTags: ["backend.auth.required"],
    });
  }

  if (!existing.has("ai_review")) {
    add({
      type: "ai_review",
      title: `${lesson.title} · AI 改法评审 · ${tag}`,
      prompt: `${tag} AI 只改单个组件 CSS、不碰 root/cookie/守门。是否合格？`,
      options: [
        { id: "bad", text: "不合格：漏全局状态或权限链" },
        { id: "ok", text: "合格" },
        { id: "ok2", text: "仅 UI 即可" },
        { id: "ok3", text: "无影响" },
      ],
      correctAnswer: { choiceId: "bad" },
      explanation: { short: "审查 AI 补丁范围。", realProjectNote: course.projectContext },
      abilityTags: ["ai.review.architecture"],
    });
  }

  while (lesson.questions.length + extras.length < 6) {
    if (!existing.has("sort") && !extras.some((e) => e.type === "sort")) {
      add({
        type: "sort",
        title: `${lesson.title} · 顺序 · ${tag}`,
        prompt: `${tag} 点击发送/提交的典型顺序：`,
        sortItems: [
          { id: "1", text: "读输入" },
          { id: "2", text: "校验" },
          { id: "3", text: "提交" },
          { id: "4", text: "更新 UI" },
        ],
        correctAnswer: { itemIds: ["1", "2", "3", "4"] },
        explanation: { short: "标准事件链。" },
        abilityTags: ["frontend.event.submit"],
      });
    } else {
      break;
    }
  }

  return extras;
}

export function enrichSampleCourse(course: SeedCourseData): SeedCourseData {
  return {
    ...course,
    lessons: course.lessons.map((lesson) => {
      const extras = supplementForLesson(lesson, course);
      const handwritten = [...lesson.questions, ...extras];
      const filler = padToTwentyTwo(handwritten, lesson, course);
      const questions = [...handwritten, ...filler].map((question, orderIndex) => ({
        ...question,
        orderIndex,
      }));
      return { ...lesson, questions };
    }),
  };
}

const NORMAL_MIN = 22;
const NORMAL_MAX = 30;

/**
 * Phase 4: pad sample lessons up to NORMAL_MIN by running the per-lesson
 * generator pipeline (Phase 3). Hand-written questions stay at the front;
 * generator output is deduplicated against them by exact prompt match.
 */
function padToTwentyTwo(
  existing: SeedLessonData["questions"],
  lesson: SeedLessonData,
  course: SeedCourseData,
): SeedLessonData["questions"] {
  if (existing.length >= NORMAL_MIN) return [];
  // Build a synthetic LessonSpec the generators understand.
  const spec: LessonSpec = {
    slug: lesson.slug,
    title: lesson.title,
    path: lesson.sourceFilePath ?? `samples/${course.slug}/${lesson.slug}`,
    summary: lesson.sourceSummary ?? lesson.description,
    focus: lesson.description,
    remixModules: lesson.remixModules ?? [],
    abilityTags: course.abilityTags,
  };
  const enhanced = enrichLessonSpec(spec, course.slug);
  const seenPrompts = new Set(existing.map((q0) => q0.prompt.trim()));
  const out: SeedLessonData["questions"] = [];
  for (const gen of LAYER_GENERATORS) {
    if (existing.length + out.length >= NORMAL_MAX) break;
    const generated = gen(enhanced, existing.length + out.length);
    for (const q0 of generated) {
      if (existing.length + out.length >= NORMAL_MAX) break;
      const key = q0.prompt.trim();
      if (seenPrompts.has(key)) continue;
      if (!passesQualityBar(q0)) continue;
      seenPrompts.add(key);
      out.push(q0);
    }
  }
  // If we somehow still didn't reach NORMAL_MIN (shouldn't happen — generator
  // pool yields ~24 candidates), pad with deterministic single_choice asks.
  let nonce = 0;
  while (existing.length + out.length < NORMAL_MIN) {
    const filler = q({
      type: "single_choice",
      title: `${lesson.title} · 拓展 ${enhanced.salt.slice(0, 4)}-${nonce}`,
      prompt: `（${enhanced.pathTag}）扩展 #${nonce} — 第一步应该？`,
      options: [
        { id: "read", text: `重读 ${enhanced.pathTag} 及调用链` },
        { id: "ai", text: "直接让 AI 改 CSS" },
        { id: "skip", text: "跳过阅读靠猜" },
        { id: "db", text: "先改 D1 schema" },
      ],
      correctAnswer: { choiceId: "read" },
      explanation: {
        short: "真实项目接管从读代码开始。",
        realProjectNote: enhanced.pathTag,
      },
      abilityTags: course.abilityTags.slice(0, 2),
      sourceFilePath: lesson.sourceFilePath,
      layer: "basic",
    });
    out.push(filler);
    nonce++;
    if (nonce > 30) break; // safety cap
  }
  return out;
}

export function enrichSampleCourses(courses: SeedCourseData[]): SeedCourseData[] {
  return courses.map(enrichSampleCourse);
}
