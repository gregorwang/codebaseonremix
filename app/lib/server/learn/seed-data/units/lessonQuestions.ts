/**
 * Phase 3 entry point. Every question is generated per-lesson from the
 * EnhancedLessonSpec; no two lessons share a prompt. The 7 per-lesson layer
 * generators in `perLessonGenerators.ts` collectively produce 22-30 unique
 * questions; Nemesis-unit lessons (site-18/19/20) get 36-54 (each generator
 * doubles its output).
 */
import type { CreateQuestionInput } from "~/lib/learn/types";
import { q } from "../types";
import { enrichLessonSpec } from "./lessonSpecEnricher";
import type { LessonSpec } from "./factory";
import {
  LAYER_GENERATORS,
  passesQualityBar,
} from "./perLessonGenerators";

type Q = Omit<CreateQuestionInput, "lessonId">;

const NORMAL_MIN = 22;
const NORMAL_MAX = 30;
const NEMESIS_MIN = 36;
const NEMESIS_MAX = 54;

/**
 * Pad or top up a question list with deterministic filler questions so we
 * always reach NORMAL_MIN. The fillers are themselves per-lesson (different
 * salt per lesson → different text per lesson), so they never cause
 * cross-lesson duplication.
 */
function padToMin(
  questions: Q[],
  spec: import("./lessonSpecEnricher").EnhancedLessonSpec,
  min: number,
): Q[] {
  if (questions.length >= min) return questions;
  const out = [...questions];
  let n = out.length;
  const fillers: Q[] = [
    q({
      type: "single_choice",
      title: `${spec.lesson.title} · 拓展思考 ${spec.salt.slice(0, 4)}`,
      prompt: `如果要扩展「${spec.lesson.focus}」，第一步应该？`,
      options: [
        { id: "read", text: `重读 remix/${spec.lesson.path} 及调用链` },
        { id: "ai", text: "直接让 AI 改 CSS" },
        { id: "skip", text: "跳过阅读靠猜" },
        { id: "db", text: "先改 D1 schema" },
      ],
      correctAnswer: { choiceId: "read" },
      explanation: {
        short: "真实项目接管从读代码开始。",
        realProjectNote: `remix/${spec.lesson.path}`,
      },
      abilityTags: spec.lesson.abilityTags,
      sourceFilePath: spec.lesson.path,
      sourceNote: spec.lesson.summary,
      layer: "basic",
    }),
    q({
      type: "multi_choice",
      title: `${spec.lesson.title} · 上下游影响 ${spec.salt.slice(0, 4)}`,
      prompt: `改 remix/${spec.lesson.path} 时，下列哪些模块可能受影响？`,
      options: [
        { id: "caller", text: "调用方 / 导入方" },
        { id: "types", text: "同模块类型导出" },
        { id: "tests", text: "相关 server util" },
        { id: "doc", text: "完全无关的 README" },
      ],
      correctAnswer: { choiceIds: ["caller", "types", "tests"] },
      explanation: {
        short: "全栈改动看上下游。",
        realProjectNote: `remix/${spec.lesson.path}`,
      },
      abilityTags: spec.lesson.abilityTags,
      sourceFilePath: spec.lesson.path,
      sourceNote: spec.lesson.summary,
      layer: "code-reading",
    }),
    q({
      type: "true_false",
      title: `${spec.lesson.title} · 守门判断 ${spec.salt.slice(0, 4)}`,
      prompt: `${spec.lesson.title} 的所有安全检查都应该由前端按钮 disabled 兜底。`,
      correctAnswer: { type: "true_false", value: false },
      explanation: {
        short: "服务端必须独立守门。",
        realProjectNote: `remix/${spec.lesson.path}`,
      },
      abilityTags: spec.lesson.abilityTags,
      sourceFilePath: spec.lesson.path,
      sourceNote: spec.lesson.summary,
      layer: "state-reasoning",
    }),
    q({
      type: "position_judgement",
      title: `${spec.lesson.title} · 位置判断 ${spec.salt.slice(0, 4)}`,
      prompt: `要给「${spec.lesson.focus}」增加一个小能力，最稳妥的落点是哪里？`,
      options: [
        { id: "primary", text: `先从 remix/${spec.lesson.path} 或 primaryFile 附近读起`, locationHint: spec.lesson.path },
        { id: "random-ui", text: "直接改一个看起来相近的按钮组件", locationHint: "app/components/" },
        { id: "generated", text: "手改 generated 目录里的产物", locationHint: "app/generated/" },
        { id: "package", text: "先改 package.json 依赖", locationHint: "package.json" },
      ],
      correctAnswer: { positionId: "primary" },
      explanation: {
        short: "先找真实锚点文件，不手改生成产物。",
        realProjectNote: `remix/${spec.lesson.path}`,
      },
      abilityTags: spec.lesson.abilityTags,
      sourceFilePath: spec.lesson.path,
      sourceNote: spec.lesson.summary,
      layer: "code-reading",
    }),
    q({
      type: "branch_trace",
      title: `${spec.lesson.title} · 调用链追踪 ${spec.salt.slice(0, 4)}`,
      prompt: `追踪「${spec.lesson.focus}」时，合理的阅读顺序是？`,
      options: [
        { id: "entry", text: `从 remix/${spec.lesson.path} 这个锚点文件开始` },
        { id: "imports", text: "沿 import / 调用方找上下游" },
        { id: "guard", text: "确认 server/client、loader/action 或状态边界" },
        { id: "impact", text: "最后判断真实用户影响与回归测试" },
      ],
      correctAnswer: { pathIds: ["entry", "imports", "guard", "impact"] },
      explanation: {
        short: "从锚点到上下游，再到边界和影响。",
        realProjectNote: `remix/${spec.lesson.path}`,
      },
      abilityTags: spec.lesson.abilityTags,
      sourceFilePath: spec.lesson.path,
      sourceNote: spec.lesson.summary,
      layer: "state-reasoning",
    }),
  ];
  let i = 0;
  while (out.length < min && i < fillers.length * 5) {
    const filler = { ...fillers[i % fillers.length]!, orderIndex: n++ };
    if (passesQualityBar(filler)) out.push(filler);
    i++;
  }
  return out;
}

/** Cap to max, drop low-quality tail, and reindex orderIndex. */
function finalize(questions: Q[], max: number): Q[] {
  const seen = new Set<string>();
  const deduped: Q[] = [];
  for (const q0 of questions) {
    const key = `${q0.type}::${q0.prompt.trim()}`;
    if (seen.has(key)) continue;
    if (!passesQualityBar(q0)) continue;
    seen.add(key);
    deduped.push(q0);
    if (deduped.length >= max) break;
  }
  return deduped.map((q0, idx) => ({ ...q0, orderIndex: idx }));
}

/** Main entry — every per-lesson question is generated from spec + course. */
export function buildLessonQuestions(
  spec: LessonSpec,
  _lessonIdx: number,
  courseSlug: string,
): Q[] {
  const enhanced = enrichLessonSpec(spec, courseSlug);
  const min = enhanced.isNemesisUnit ? NEMESIS_MIN : NORMAL_MIN;
  const max = enhanced.isNemesisUnit ? NEMESIS_MAX : NORMAL_MAX;

  // For Nemesis units each generator runs twice so we reliably clear 36;
  // for normal lessons one pass hits ~22. We salt the second pass with the
  // pass index so prompts differ (otherwise dedup kills them).
  const passes = enhanced.isNemesisUnit ? 2 : 1;
  let cursor = 0;
  const all: Q[] = [];
  for (let pass = 0; pass < passes; pass++) {
    const saltedSpec: typeof enhanced = {
      ...enhanced,
      salt: pass === 0 ? enhanced.salt : djb2(enhanced.salt + "::p" + pass),
      pathTag:
        pass === 0
          ? enhanced.pathTag
          : `${enhanced.pathTag}#p${pass}`,
    };
    for (const gen of LAYER_GENERATORS) {
      const out = gen(saltedSpec, cursor);
      for (const q0 of out) {
        all.push({ ...q0, orderIndex: cursor++ });
      }
    }
  }
  const padded = padToMin(all, enhanced, min);
  return finalize(padded, max);
}

/** Local djb2 (mirrors lessonSpecEnricher; not exported there to keep salt
 * canonical). */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
