/**
 * Per-lesson question generators (Phase 3, rewritten 2026-06-18).
 *
 * Earlier versions of this file had a templated structure where every
 * generator's *correct answer* was identical across lessons (state scope =
 * always "loader 注入", risk = always "全站逻辑链路失效", AI-review verdict
 * = always "拒绝局部补丁"). This produced ~22 questions per lesson but they
 * read like the same question with `${spec.pathTag}` substituted in. User
 * complaint summary: "需要的运行时状态应该归在哪？这一句我在几个模块里面
 * 都见到过了，选项都是一样的，固定选第一个 loader 注入到组件".
 *
 * Fix: every templated multi-choice / position / risk / AI-review item now
 * routes through a `pickXxx(spec)` helper that returns a different correct
 * answer + different distractors based on the lesson's actual:
 *   - abilityTags (state.local vs state.global vs session.cookie vs ...)
 *   - file path role (route / component / lib / service / styles / root)
 *   - layer (basic / state-reasoning / ai-review / ...)
 *
 * The answer-derivation is deterministic per-spec, so the same lesson seeded
 * twice produces identical questions; but two lessons with different tags or
 * paths get genuinely different correct answers, not just different prompts.
 */
import type { AbilityTag } from "~/lib/learn/abilityTags";
import type {
  CreateQuestionInput,
  ExpectedFixScope,
  Layer,
  ServerClientBoundary,
} from "~/lib/learn/types";
import { q, type SeedExplanation } from "../types";
import type { EnhancedLessonSpec } from "./lessonSpecEnricher";

type Q = Omit<CreateQuestionInput, "lessonId">;

/** Caller-supplied extras — explanation is Partial (q() will fill in detail). */
type Extra = Omit<Partial<Q>, "explanation"> & {
  explanation?: SeedExplanation;
};

type GeneratorFn = (spec: EnhancedLessonSpec, orderStart: number) => Q[];

/** Blacklist patterns the timu.MD §7.2 spec calls out as 烂题. */
const BLACKLIST_PROMPTS: RegExp[] = [
  /^.{0,12}$/, // empty / very short prompts
  /^(这个|那个)函数叫什么/, // function-name-only prompts
  /^.{0,4}扩展.{0,4}$/, // vague "extension" prompts
];

/**
 * Returns true if the question is safe to publish. The check is intentionally
 * conservative — false negatives are better than false positives, since the
 * fallback path (buildLessonQuestions padding) is always available.
 */
export function passesQualityBar(question: Q): boolean {
  if (!question.prompt || !question.title) return false;
  for (const re of BLACKLIST_PROMPTS) {
    if (re.test(question.prompt.trim())) return false;
  }
  if (!question.layer) return false;
  if (!question.explanation?.short) return false;
  if (!question.abilityTags || question.abilityTags.length === 0) return false;
  // AI-review / diff_review / code_fix without real-world impact is the
  // biggest offender in the original 1054-question dataset — gate them.
  if (
    (question.type === "ai_review" ||
      question.type === "diff_review" ||
      question.type === "code_fix") &&
    !question.realWorldImpact
  ) {
    return false;
  }
  return true;
}

function fileName(spec: EnhancedLessonSpec): string {
  const p = spec.lesson.path || "app/";
  const segs = p.split("/").filter(Boolean);
  const base = segs[segs.length - 1] ?? p;
  // Append a short slug hash so two lessons sharing a path (e.g. two
  // "entry.server.tsx" lessons) still get unique diffs and prompts.
  return `${base}__${spec.salt.slice(0, 4)}`;
}

// ---------------------------------------------------------------------------
// Spec-derived answer helpers
//
// These are the heart of the dedup-by-meaning fix: each one returns a
// `{correctId, options, explanation}` shape whose correct answer varies
// across lessons. Call sites just spread the return into withBase().
// ---------------------------------------------------------------------------

type FileRole =
  | "route-leaf" // app/routes/foo.tsx
  | "route-api" // app/routes/api.foo.ts
  | "route-layout" // app/routes/foo.tsx where children are foo._index, foo.bar.tsx
  | "root-shell" // app/root.tsx, app/entry.{server,client}.tsx
  | "component" // app/components/...
  | "hook" // app/hooks/...
  | "service" // app/services/*.server.ts
  | "lib" // app/lib/*.server.ts or app/utils/*.ts
  | "styles" // app/styles/*, *.css
  | "data" // app/data/*
  | "type" // app/types/*
  | "generated"; // app/generated/*

function fileRole(path: string): FileRole {
  const p = path.toLowerCase();
  if (/^app\/(root|entry\.(server|client))\./.test(p)) return "root-shell";
  if (/^app\/routes\/api\./.test(p)) return "route-api";
  if (/^app\/routes\/[^/]+\.tsx?$/.test(p) && /\$|\._index/.test(p)) return "route-layout";
  if (/^app\/routes\//.test(p)) return "route-leaf";
  if (/^app\/components\//.test(p)) return "component";
  if (/^app\/hooks\//.test(p)) return "hook";
  if (/^app\/services\//.test(p)) return "service";
  if (/^app\/(lib|utils)\//.test(p)) return "lib";
  if (/^app\/styles|\.css$/.test(p)) return "styles";
  if (/^app\/data\//.test(p)) return "data";
  if (/^app\/types\//.test(p)) return "type";
  if (/^app\/generated\//.test(p)) return "generated";
  return "lib";
}

function hasTag(spec: EnhancedLessonSpec, tag: AbilityTag): boolean {
  return spec.lesson.abilityTags.includes(tag);
}

/** Pick a state-scope answer derived from this lesson's actual ability tags. */
function pickStateScope(spec: EnhancedLessonSpec): {
  correctId: string;
  options: { id: string; text: string }[];
  short: string;
  detail: string;
} {
  // The four real choices come from the actual codebase patterns:
  // server cookie+session, root loader (global theme/session), per-route
  // loader (page data), per-component useState (UI ephemeral). Pick the one
  // that matches the lesson's tags; the other three become distractors.
  const all = {
    session: { id: "session", text: "服务端 cookie / session（root loader 写入）" },
    global: { id: "global", text: "root loader 注入的全局 state（theme / user）" },
    loader: { id: "loader", text: "本路由 loader 注入的 useLoaderData" },
    local: { id: "local", text: "组件内 useState（仅 UI 临时态）" },
    css: { id: "css", text: "CSS 变量 / Tailwind class" },
  } as const;

  let correctId: keyof typeof all;
  let short: string;
  if (hasTag(spec, "backend.session.cookie") || hasTag(spec, "backend.auth.required")) {
    correctId = "session";
    short = "认证状态属于服务端 session，不应该在浏览器复刻一份。";
  } else if (hasTag(spec, "frontend.state.global")) {
    correctId = "global";
    short = "全局共享态走 root loader 注入，避免每个子路由各取一份。";
  } else if (hasTag(spec, "frontend.state.local")) {
    correctId = "local";
    short = "纯 UI 临时态（输入框 / 折叠状态）只活在组件内 useState。";
  } else if (hasTag(spec, "bridge.reactRouter.loader")) {
    correctId = "loader";
    short = "页面数据由本路由 loader 提供给 useLoaderData。";
  } else if (hasTag(spec, "bridge.reactRouter.action")) {
    correctId = "loader";
    short = "action 写完后由 loader 重新供给数据，不要手动同步状态。";
  } else {
    correctId = "loader";
    short = "默认通过 loader 注入；只有真正的 UI 临时态才进 useState。";
  }
  const options = [all.session, all.global, all.loader, all.local, all.css];
  return {
    correctId,
    options: options.map((o) => ({ id: o.id, text: o.text })),
    short,
    detail: `${spec.pathTag} 的运行时状态归类来自其能力标签 ${spec.lesson.abilityTags.join(", ")}；`
      + `本课正确答案 = "${all[correctId].text}"，其它选项是 remix/ 其它课程的归类，记住区分场景。`,
  };
}

/** "上下游" question — multi-choice correct ids vary by file role. */
function pickContextNeighbors(spec: EnhancedLessonSpec): {
  correctIds: string[];
  options: { id: string; text: string }[];
  short: string;
} {
  const role = fileRole(spec.lesson.path);
  const ALL = {
    importers: { id: "importers", text: "import 这个文件的路由 / 父组件" },
    callers: { id: "callers", text: "调用方 server util / hook" },
    types: { id: "types", text: "同模块或上层的 TypeScript 类型导出" },
    children: { id: "children", text: "嵌套子路由（Outlet 渲染的下游）" },
    loader: { id: "loader", text: "对应的 loader / action / API 路由" },
    cookie: { id: "cookie", text: "Cookie / session 写入端" },
    db: { id: "db", text: "D1 migration 与 schema" },
    css: { id: "css", text: "Tailwind 配置 / app.css" },
    pkg: { id: "pkg", text: "package.json 依赖" },
    cdn: { id: "cdn", text: "Cloudflare CDN / cache 规则" },
  } as const;

  let correctIds: string[];
  let short: string;
  switch (role) {
    case "root-shell":
      correctIds = ["children", "css", "cookie"];
      short = "root/entry 改动会向下蔓延到所有子路由，并触发 cookie/CSS 全局回归。";
      break;
    case "route-api":
      correctIds = ["callers", "types", "db", "cookie"];
      short = "API 路由是 server-only：上游是调用它的客户端 fetch / hook，下游是 D1 migration 与 cookie。";
      break;
    case "route-layout":
      correctIds = ["children", "loader", "types"];
      short = "layout 路由动了，子路由的 useLoaderData 与 Outlet 都会受牵连。";
      break;
    case "route-leaf":
      correctIds = ["loader", "types", "callers"];
      short = "叶子路由通常牵连同文件 loader/action 与共享类型。";
      break;
    case "component":
      correctIds = ["importers", "types", "css"];
      short = "组件改动看 import 它的路由、props 类型契约和样式 token。";
      break;
    case "hook":
      correctIds = ["importers", "types"];
      short = "hook 改动只影响调用方组件与导出的类型契约。";
      break;
    case "service":
      correctIds = ["callers", "loader", "db"];
      short = "service 是 server util：调用它的 loader/action 与 D1 schema 都要看。";
      break;
    case "lib":
      correctIds = ["callers", "types"];
      short = "lib/utils 函数改动主要看调用方与类型签名。";
      break;
    case "styles":
      correctIds = ["css", "importers"];
      short = "样式改动看 Tailwind 配置与引入它的组件。";
      break;
    case "data":
      correctIds = ["importers", "types"];
      short = "data 模块改了形状，类型导出与消费方都要回归。";
      break;
    case "type":
      correctIds = ["importers", "types"];
      short = "type 改动会让所有 import 它的模块重新检查类型。";
      break;
    case "generated":
      correctIds = ["pkg"];
      short = "生成产物不要手改：它依赖于上游脚本与 package.json 配置。";
      break;
  }
  return {
    correctIds,
    options: Object.values(ALL).map((o) => ({ id: o.id, text: o.text })),
    short,
  };
}

/** Pick the right "守门 / 责任落点" position based on file role + tags. */
function pickGuardLocation(spec: EnhancedLessonSpec): {
  correctId: string;
  options: { id: string; text: string; locationHint: string }[];
  short: string;
} {
  const role = fileRole(spec.lesson.path);
  const wantsAuth = hasTag(spec, "backend.auth.required") || hasTag(spec, "backend.session.cookie");
  const wantsRate = hasTag(spec, "backend.rateLimit");

  // Build the option pool then pick correct id.
  const opts = {
    actionEntry: {
      id: "action-entry",
      text: "loader / action 入口前几行（fail-fast 守门）",
      locationHint: spec.lesson.path,
    },
    serviceLayer: {
      id: "service-layer",
      text: "对应的 services/*.server.ts（共用守门函数）",
      locationHint: "app/services/",
    },
    rootLoader: {
      id: "root-loader",
      text: "root loader（全站性的 session 读取）",
      locationHint: "app/root.tsx",
    },
    componentEvent: {
      id: "component-event",
      text: "组件 onClick / onSubmit 事件 handler",
      locationHint: "app/components/",
    },
    cssDisable: {
      id: "css-disable",
      text: "CSS 隐藏或 disabled 按钮",
      locationHint: "css",
    },
    cdnRule: {
      id: "cdn-rule",
      text: "Cloudflare CDN 规则",
      locationHint: "edge",
    },
  } as const;
  let correctId: string;
  let short: string;
  if (role === "route-api" || (wantsAuth && (role === "route-leaf" || role === "route-layout"))) {
    correctId = opts.actionEntry.id;
    short = "服务端守门必须放在 loader/action 入口；客户端按钮 disabled 不算守门。";
  } else if (role === "service") {
    correctId = opts.serviceLayer.id;
    short = "守门逻辑沉到 services/ 共用函数，多个 action/loader 复用同一份判断。";
  } else if (role === "root-shell") {
    correctId = opts.rootLoader.id;
    short = "全站性的 session 读取放 root loader，子路由从 useRouteLoaderData('root') 拿。";
  } else if (role === "component" && hasTag(spec, "frontend.event.click")) {
    correctId = opts.componentEvent.id;
    short = "组件交互发生在事件 handler；服务端守门仍然需要，但 UI 层先做基本验证。";
  } else if (wantsRate) {
    correctId = opts.serviceLayer.id;
    short = "限流逻辑应该集中在 services/ 单一来源，不要在每个 action 里复制。";
  } else {
    correctId = opts.actionEntry.id;
    short = "默认在 loader/action 入口做守门，离请求最近、最难绕过。";
  }
  return {
    correctId,
    options: Object.values(opts).map((o) => ({
      id: o.id,
      text: o.text,
      locationHint: o.locationHint,
    })),
    short,
  };
}

/** Pick the most-likely AI failure mode for this lesson type. */
function pickAiReviewIssue(spec: EnhancedLessonSpec): {
  riskId: string;
  /** Long-form description of why this risk applies HERE specifically. */
  reason: string;
  /** Short user-facing explanation. */
  short: string;
} {
  const role = fileRole(spec.lesson.path);
  if (hasTag(spec, "backend.auth.required") || hasTag(spec, "backend.session.cookie")) {
    return {
      riskId: "missing_session",
      reason: "AI 倾向跳过 session 检查直接进入业务逻辑，把鉴权失败当成「用户没登录而已」。",
      short: "AI 经常漏掉 session 检查这一行，让未登录用户也能走完链路。",
    };
  }
  if (hasTag(spec, "backend.validation.field")) {
    return {
      riskId: "missing_validation",
      reason: "AI 默认把 request.body 当成已经合法的对象，跳过 zod / 字段校验。",
      short: "AI 容易省掉字段校验，让格式异常的请求直接打到 D1。",
    };
  }
  if (hasTag(spec, "backend.rateLimit")) {
    return {
      riskId: "missing_rate_limit",
      reason: "AI 重写守门时常常把限流统计也一起删掉，认为它和业务无关。",
      short: "AI 常把限流当作「无关代码」删掉，让恶意刷接口畅通。",
    };
  }
  if (hasTag(spec, "bridge.reactRouter.loader") && hasTag(spec, "bridge.reactRouter.action")) {
    return {
      riskId: "loader_action_mix",
    reason: "AI 把 loader 改成「做点 mutation」或在 action 里做读，破坏读写分离。",
      short: "AI 经常混用 loader/action 职责，让缓存和 SSR 行为不一致。",
    };
  }
  if (role === "component" || hasTag(spec, "frontend.state.local")) {
    return {
      riskId: "client_server_mix",
      reason: "AI 倾向把服务端 state 复制到 useState，造成两份事实来源。",
      short: "AI 把服务端状态搬进 useState，会和服务端值发散。",
    };
  }
  if (role === "root-shell" || hasTag(spec, "ai.review.architecture")) {
    return {
      riskId: "architecture_boundary",
      reason: "AI 在改 root/entry 时常常打破 server/client 边界或路由职责分层。",
      short: "AI 改 shell 时容易破坏 server/client 边界。",
    };
  }
  return {
    riskId: "local_patch",
    reason: "AI 只动当前文件、不去碰真正错位的上下游，把 bug 用局部补丁掩盖。",
    short: "AI 在不了解架构时偏向「只改一个文件」，以补丁掩盖问题。",
  };
}

const AI_RISK_OPTIONS = [
  { id: "local_patch", label: "局部补丁冒充全局方案" },
  { id: "missing_session", label: "漏掉 session" },
  { id: "missing_validation", label: "漏掉字段校验" },
  { id: "missing_rate_limit", label: "漏掉限流" },
  { id: "loader_action_mix", label: "loader/action 职责混淆" },
  { id: "client_server_mix", label: "客户端/服务端状态混淆" },
  { id: "architecture_boundary", label: "破坏现有架构边界" },
];

/** Risk question — what's the *worst-case* if this file breaks? Varies by role. */
function pickWorstCase(spec: EnhancedLessonSpec): {
  correctId: string;
  options: { id: string; text: string }[];
  short: string;
} {
  const role = fileRole(spec.lesson.path);
  const ALL = {
    allRoutes: { id: "all-routes", text: "所有页面 SSR 失败 / 白屏" },
    authBypass: { id: "auth-bypass", text: "未登录用户绕过鉴权访问受限资源" },
    dataLeak: { id: "data-leak", text: "loader 把别的用户数据泄露给当前请求" },
    ddos: { id: "ddos", text: "限流失效，单用户可刷爆 D1 / AI 配额" },
    fouc: { id: "fouc", text: "首屏闪烁 / 主题不一致" },
    visualBug: { id: "visual-bug", text: "某个组件视觉错位（不影响数据）" },
    typeSlip: { id: "type-slip", text: "TypeScript 推断变 unknown，下游消费失败" },
    childRoutes: { id: "child-routes", text: "嵌套子路由 Outlet 拿不到数据" },
  } as const;

  let correctId: string;
  let short: string;
  if (role === "root-shell") {
    correctId = ALL.allRoutes.id;
    short = "root/entry 一炸全站炸，比单个组件失效严重一个数量级。";
  } else if (hasTag(spec, "backend.auth.required") || hasTag(spec, "backend.session.cookie")) {
    correctId = ALL.authBypass.id;
    short = "认证文件的「安静失败」= 鉴权绕过，是最严重的安全漏洞。";
  } else if (hasTag(spec, "bridge.reactRouter.loader") && (role === "route-leaf" || role === "route-api")) {
    correctId = ALL.dataLeak.id;
    short = "loader 错误最容易造成跨用户串数据，远比看着报错严重。";
  } else if (hasTag(spec, "backend.rateLimit")) {
    correctId = ALL.ddos.id;
    short = "限流失效 = 单人能刷爆共享配额，钱包先报警。";
  } else if (role === "route-layout") {
    correctId = ALL.childRoutes.id;
    short = "layout 路由是子路由的 Outlet 容器，挂了所有子页一起挂。";
  } else if (role === "styles" || role === "component") {
    correctId = ALL.fouc.id;
    short = "样式 / 组件错误的真实风险是首屏闪烁与视觉错位。";
  } else if (role === "type") {
    correctId = ALL.typeSlip.id;
    short = "type 改坏整条调用链都会丢掉编译期保护。";
  } else {
    correctId = ALL.dataLeak.id;
    short = "默认按「数据正确性」评估风险，远高于视觉。";
  }
  return {
    correctId,
    options: Object.values(ALL).map((o) => ({ id: o.id, text: o.text })),
    short,
  };
}

// ---------------------------------------------------------------------------

function withBase(
  spec: EnhancedLessonSpec,
  orderIndex: number,
  layer: Layer,
  extra: Extra = {},
): Q {
  const fallbackShort = `「${spec.lesson.title}」职责即 ${spec.lesson.focus}`;
  const fallbackDetail = `${spec.pathTag} · ${spec.lesson.focus}`;
  const e = (extra.explanation ?? {}) as {
    short?: string;
    detail?: string;
    realProjectNote?: string;
    commonMistake?: string;
    aiReviewNote?: string;
  };
  const explanation = {
    short: e.short ?? fallbackShort,
    detail: e.detail ?? e.short ?? fallbackDetail,
    realProjectNote: e.realProjectNote ?? spec.pathTag,
    commonMistake: e.commonMistake,
    aiReviewNote: e.aiReviewNote,
  };
  // Drop keys the caller set that we now own (explanation) so q() doesn't see
  // a partial Explanation object typed as full.
  const { explanation: _ignored, abilityTags, ...rest } = extra;
  void _ignored;
  return q({
    ...rest,
    abilityTags: (abilityTags as AbilityTag[] | undefined) ?? spec.lesson.abilityTags,
    sourceFilePath: spec.lesson.path,
    sourceNote: spec.lesson.summary,
    orderIndex,
    layer,
    explanation,
  } as Parameters<typeof q>[0]);
}

// ---------------------------------------------------------------------------
// Layer 1: basic
// ---------------------------------------------------------------------------

const buildBasicQuestions: GeneratorFn = (spec, orderStart) => {
  const lesson = spec.lesson;
  const title = lesson.title;
  const focus = lesson.focus;
  const role = fileRole(lesson.path);
  const worst = pickWorstCase(spec);

  // Distractors for "core responsibility" — pick three plausibly-wrong roles
  // that don't match this lesson, so the right one isn't always option A.
  // We deterministically rotate the correct option's id by salt to avoid the
  // "always option a" pattern users were seeing.
  const correctRot = parseInt(spec.salt.slice(0, 1), 16) % 4;
  const baseOpts = [
    { id: "right", text: focus },
    { id: "static", text: "仅承担静态资源 CDN 配置" },
    { id: "devonly", text: "只在开发环境存在的辅助代码" },
    { id: "irrelevant", text: "与 Cloudflare Worker 运行无关的纯文档" },
  ];
  const rotated = [
    baseOpts[correctRot]!,
    ...baseOpts.filter((_, i) => i !== correctRot),
  ];

  return [
    withBase(spec, orderStart, "basic", {
      type: "true_false",
      title: `${title} · 职责判断 · ${spec.salt.slice(0, 4)}`,
      prompt: `「${title}」由 remix/${lesson.path} 承载（slug=${lesson.slug}）。下列判断：核心职责就是「${focus}」。`,
      correctAnswer: { type: "true_false", value: true },
      explanation: {
        short: `职责即 ${focus}。`,
        detail: `${spec.pathTag} 的主要职责：${focus}。`,
        realProjectNote: spec.pathTag,
      },
    }),
    withBase(spec, orderStart + 1, "basic", {
      type: "single_choice",
      title: `${title} · 核心职责 · ${spec.salt.slice(0, 4)}`,
      prompt: `${spec.pathTag} 的核心职责是？`,
      options: rotated,
      correctAnswer: { choiceId: "right" },
      explanation: {
        short: `职责：${focus}。`,
        realProjectNote: spec.pathTag,
      },
    }),
    withBase(spec, orderStart + 2, "basic", (() => {
      const ctx = pickContextNeighbors(spec);
      return {
        type: "multi_choice",
        title: `${title} · 上下游 · ${spec.salt.slice(0, 4)}`,
        prompt: `修改 ${spec.pathTag}（角色=${role}）时，最该回归的上下游是？`,
        options: ctx.options,
        correctAnswer: { choiceIds: ctx.correctIds },
        explanation: {
          short: ctx.short,
          realProjectNote: spec.pathTag,
        },
      };
    })()),
    withBase(spec, orderStart + 3, "basic", (() => {
      const guard = pickGuardLocation(spec);
      return {
        type: "position_judgement",
        title: `${title} · 改动落点 · ${spec.salt.slice(0, 4)}`,
        prompt: `实现「${focus}」时，代码应主要落在？`,
        options: guard.options,
        correctAnswer: { positionId: guard.correctId },
        explanation: {
          short: guard.short,
          realProjectNote: spec.pathTag,
        },
      };
    })()),
    withBase(spec, orderStart + 4, "basic", {
      type: "true_false",
      title: `${title} · 责任边界 · ${spec.salt.slice(0, 4)}`,
      prompt: `${spec.pathTag}（slug=${lesson.slug}）应该承担所有跨模块的杂活，反正都在同一文件。`,
      correctAnswer: { type: "true_false", value: false },
      explanation: {
        short: "职责要克制。",
        detail: `${spec.pathTag} 只承载「${focus}」；其它职责应该独立模块。`,
        realProjectNote: spec.pathTag,
      },
    }),
    withBase(spec, orderStart + 5, "basic", {
      type: "single_choice",
      title: `${title} · 风险等级 · ${spec.salt.slice(0, 4)}`,
      prompt: `${spec.pathTag} 改坏了最大风险是？`,
      options: worst.options,
      correctAnswer: { choiceId: worst.correctId },
      explanation: {
        short: worst.short,
        realProjectNote: spec.pathTag,
      },
    }),
  ].filter(passesQualityBar);
};

// ---------------------------------------------------------------------------
// Layer 2: code-reading
// ---------------------------------------------------------------------------

const buildCodeReadingQuestions: GeneratorFn = (spec, orderStart) => {
  const lesson = spec.lesson;
  const title = lesson.title;
  const code = spec.codeExcerpt;
  const codeLines = code.split("\n");
  const pickLine = (offset: number) =>
    Math.min(codeLines.length - 1, Math.max(0, offset));
  const lines = [
    { id: `L${spec.salt.slice(0, 4)}-1`, lineNumber: 2, text: codeLines[pickLine(2)] ?? "" },
    { id: `L${spec.salt.slice(0, 4)}-2`, lineNumber: 4, text: codeLines[pickLine(4)] ?? "" },
    { id: `L${spec.salt.slice(0, 4)}-3`, lineNumber: 6, text: codeLines[pickLine(6)] ?? "" },
    { id: `L${spec.salt.slice(0, 4)}-4`, lineNumber: 8, text: codeLines[pickLine(8)] ?? "" },
  ].filter((l) => l.text);

  // Pick the "key line" by salt to avoid always being line 1.
  const keyLineIdx = lines.length > 0 ? parseInt(spec.salt.slice(2, 3), 16) % lines.length : 0;
  const role = fileRole(lesson.path);
  // Function name expected from path role — varies real signature.
  const expectedFn =
    role === "route-api" || role === "route-leaf" || role === "route-layout"
      ? "loader"
      : role === "service" || role === "lib"
        ? `${spec.salt.slice(0, 4)}Helper`
        : role === "root-shell"
          ? "Layout"
          : role === "component"
            ? "Component"
            : "handler";

  return [
    withBase(spec, orderStart, "code-reading", {
      type: "line_pick",
      title: `${title} · 关键行定位 · ${spec.salt.slice(0, 4)}`,
      prompt: `下列哪一行最体现「${lesson.focus}」这一职责？`,
      code,
      linePickLines: lines,
      correctAnswer: { type: "line_pick", lineId: lines[keyLineIdx]?.id ?? "" },
      explanation: {
        short: `从 path=${lesson.path} 与 focus=${lesson.focus} 出发。`,
        realProjectNote: spec.pathTag,
      },
    }),
    withBase(spec, orderStart + 1, "code-reading", {
      type: "fill_blank",
      title: `${title} · 签名填空 · ${spec.salt.slice(0, 4)}`,
      prompt: `补全 ${spec.pathTag} 中"${expectedFn}"导出的签名：`,
      code: `export async function _____({ request }) { /* ${lesson.focus} */ }`,
      blanks: [
        {
          id: "fn",
          placeholder: "函数名",
          acceptedAnswers: [expectedFn],
        },
      ],
      correctAnswer: { type: "fill_blank", values: { fn: expectedFn } },
      explanation: {
        short: `${role} 角色文件的导出名遵循 React Router 约定：${expectedFn}。`,
        realProjectNote: spec.pathTag,
      },
    }),
    withBase(spec, orderStart + 2, "code-reading", {
      type: "sort",
      title: `${title} · 阅读顺序 · ${spec.salt.slice(0, 4)}`,
      prompt: `理解 ${spec.pathTag} 的推荐步骤：`,
      sortItems: [
        { id: "s1", text: `打开 ${spec.pathTag}`, title: "定位", category: "frontend" },
        { id: "s2", text: "阅读导出符号", title: "读签名", category: "frontend" },
        { id: "s3", text: lesson.focus, title: "抓重点", category: "frontend" },
        { id: "s4", text: "对照调用方验证", title: "验证", category: "frontend" },
      ],
      correctAnswer: { type: "sort", itemIds: ["s1", "s2", "s3", "s4"] },
      explanation: {
        short: "先读后关联。",
        realProjectNote: spec.pathTag,
      },
    }),
    withBase(spec, orderStart + 3, "code-reading", (() => {
      // File-structure "what should this file have" — vary correct ids by role.
      const ALL = {
        exports: { id: "exports", text: `导出与角色匹配的符号（${role} → ${expectedFn}）` },
        types: { id: "types", text: "导出 / 重新导出 TypeScript 类型契约" },
        comments: { id: "comments", text: `注释聚焦「${lesson.focus}」` },
        clientGuard: { id: "client-guard", text: '".client" 后缀或 ClientOnly 包裹' },
        serverGuard: { id: "server-guard", text: '".server" 后缀（拒绝进入客户端 bundle）' },
        noTests: { id: "no-tests", text: "从不写测试 / 不导出类型（反例）" },
      } as const;
      let correctIds: string[];
      let short: string;
      if (role === "service" || role === "route-api" || (role === "lib" && lesson.path.includes(".server"))) {
        correctIds = ["exports", "serverGuard", "comments"];
        short = ".server 文件必须导出明确符号、靠后缀阻止泄漏到 client bundle。";
      } else if (role === "component" && lesson.path.includes(".client")) {
        correctIds = ["exports", "clientGuard", "comments"];
        short = ".client 后缀的组件应明示客户端边界并保留专注的注释。";
      } else if (role === "type") {
        correctIds = ["exports", "types"];
        short = "type 模块的全部价值就是导出明确的 TypeScript 契约。";
      } else {
        correctIds = ["exports", "comments"];
        short = "默认形态：导出与角色匹配的符号 + 关注职责的注释。";
      }
      // Map correctIds to actual option ids that exist in ALL.
      const idMap: Record<string, string> = {
        exports: "exports",
        types: "types",
        comments: "comments",
        clientGuard: "client-guard",
        serverGuard: "server-guard",
      };
      const finalCorrect = correctIds.map((k) => idMap[k] ?? k);
      return {
        type: "multi_choice",
        title: `${title} · 文件结构 · ${spec.salt.slice(0, 4)}`,
        prompt: `下列哪些是 ${spec.pathTag}（角色=${role}）应有的特征？`,
        options: Object.values(ALL).map((o) => ({ id: o.id, text: o.text })),
        correctAnswer: { choiceIds: finalCorrect },
        explanation: {
          short,
          realProjectNote: spec.pathTag,
        },
      };
    })()),
  ].filter(passesQualityBar);
};

// ---------------------------------------------------------------------------
// Layer 3: state-reasoning
// ---------------------------------------------------------------------------

const buildStateReasoningQuestions: GeneratorFn = (spec, orderStart) => {
  const lesson = spec.lesson;
  const title = lesson.title;
  return [
    withBase(spec, orderStart, "state-reasoning", {
      type: "branch_trace",
      title: `${title} · 守门失败分支 · ${spec.salt.slice(0, 4)}`,
      prompt: `调用 ${spec.pathTag} 但参数不合法时，请求走向：`,
      branchScenario: `调用 ${spec.pathTag} 但参数不合法`,
      options: [
        { id: "enter", text: "进入 handler/action" },
        { id: "validate", text: "执行字段/权限校验" },
        { id: "fail", text: "校验失败，立即 return 4xx" },
      ],
      correctAnswer: { type: "branch_trace", pathIds: ["enter", "validate", "fail"] },
      explanation: {
        short: "fail fast，不带坏数据继续。",
        realProjectNote: spec.pathTag,
      },
    }),
    withBase(spec, orderStart + 1, "state-reasoning", (() => {
      const guard = pickGuardLocation(spec);
      return {
        type: "position_judgement",
        title: `${title} · 守门位置 · ${spec.salt.slice(0, 4)}`,
        prompt: `${spec.pathTag} 的请求守门（auth / validate / rate-limit）应该放在哪？`,
        options: guard.options,
        correctAnswer: { positionId: guard.correctId },
        explanation: {
          short: guard.short,
          realProjectNote: spec.pathTag,
        },
      };
    })()),
    withBase(spec, orderStart + 2, "state-reasoning", (() => {
      const scope = pickStateScope(spec);
      return {
        type: "single_choice",
        title: `${title} · 状态选择 · ${spec.salt.slice(0, 4)}`,
        prompt: `${spec.pathTag}（标签：${spec.lesson.abilityTags.join(", ")}）需要的运行时状态应该归在哪？`,
        options: scope.options,
        correctAnswer: { choiceId: scope.correctId },
        explanation: {
          short: scope.short,
          detail: scope.detail,
          realProjectNote: spec.pathTag,
        },
      };
    })()),
    withBase(spec, orderStart + 3, "state-reasoning", {
      type: "true_false",
      title: `${title} · 缓存一致 · ${spec.salt.slice(0, 4)}`,
      prompt: `在 ${spec.pathTag} 写入后未主动失效 cache，下一次读取一定看到旧数据。`,
      correctAnswer: { type: "true_false", value: true },
      explanation: {
        short: "写后缓存必须显式失效。",
        realProjectNote: spec.pathTag,
      },
    }),
  ].filter(passesQualityBar);
};

// ---------------------------------------------------------------------------
// Layer 4: ai-review
// ---------------------------------------------------------------------------

const buildAiReviewQuestions: GeneratorFn = (spec, orderStart) => {
  const lesson = spec.lesson;
  const title = lesson.title;
  const issue = pickAiReviewIssue(spec);
  // Make the AI-改坏 diff genuinely match the lesson's failure mode.
  const diff =
    issue.riskId === "missing_session"
      ? `--- a/${fileName(spec)}\n+++ b/${fileName(spec)}\n@@\n-  const session = await getSession(request);\n-  if (!session) throw redirect("/auth");\n+  // 直接进入业务\n`
      : issue.riskId === "missing_validation"
        ? `--- a/${fileName(spec)}\n+++ b/${fileName(spec)}\n@@\n-  const data = schema.parse(body);\n+  const data = body as any;\n`
        : issue.riskId === "missing_rate_limit"
          ? `--- a/${fileName(spec)}\n+++ b/${fileName(spec)}\n@@\n-  await rateLimit(userId);\n+  // 直接调用上游\n`
          : issue.riskId === "loader_action_mix"
            ? `--- a/${fileName(spec)}\n+++ b/${fileName(spec)}\n@@\n-export async function loader() { return data(...); }\n+export async function loader() { await db.delete(); return data(...); }\n`
            : issue.riskId === "client_server_mix"
              ? `--- a/${fileName(spec)}\n+++ b/${fileName(spec)}\n@@\n-  const data = useLoaderData<typeof loader>();\n+  const [data, setData] = useState(initial);\n`
              : issue.riskId === "architecture_boundary"
                ? `--- a/${fileName(spec)}\n+++ b/${fileName(spec)}\n@@\n-  // 走 loader → 子路由 Outlet\n+  // 直接在 root 里 fetch + setState\n`
                : `--- a/${fileName(spec)}\n+++ b/${fileName(spec)}\n@@\n-  // 真正的 ${lesson.focus} 实现\n+  // 仅仅 try/catch 一下\n`;

  // Distractors for the AI-review choice — keep one "好评" option but its text
  // varies by issue, so it doesn't always read the same.
  const goodOptions = {
    missing_session: "合格：登录拦截下游再做就行",
    missing_validation: "合格：D1 自己会拒掉错误数据",
    missing_rate_limit: "合格：Cloudflare 边缘会兜底",
    loader_action_mix: "合格：少一次往返反正更快",
    client_server_mix: "合格：客户端 state 写起来更顺",
    architecture_boundary: "合格：少一层抽象更快",
    local_patch: "合格：只动一个文件最稳",
  } as const;

  return [
    withBase(spec, orderStart, "ai-review", {
      type: "ai_review",
      title: `${title} · AI 改法评审 · ${spec.salt.slice(0, 4)}`,
      prompt: `AI 给 ${spec.pathTag}（${title}）提了改法："${issue.short}"。这个改法合格吗？`,
      options: [
        { id: "bad", text: `不合格：${issue.reason}` },
        { id: "ok", text: goodOptions[issue.riskId as keyof typeof goodOptions] ?? "合格" },
        { id: "ok2", text: "合格：CSS 会自动继承补齐缺失逻辑" },
        { id: "ok3", text: "合格：只需改一个文件即可" },
      ],
      correctAnswer: { choiceId: "bad", riskIds: [issue.riskId] },
      aiReviewMeta: { riskTypeOptions: AI_RISK_OPTIONS },
      explanation: {
        short: issue.short,
        detail: `${spec.pathTag}（角色=${fileRole(lesson.path)}）的高频 AI 失误是：${issue.reason}`,
        realProjectNote: spec.pathTag,
        aiReviewNote: issue.reason,
      },
      realWorldImpact: `按这种改法发版，${lesson.title} 涉及的链路会出现 ${issue.short}`,
      aiReviewRisk: issue.reason,
      serverClientBoundary: "server" as ServerClientBoundary,
      touchedFiles: [lesson.path, `${spec.courseSlug}/...`],
    }),
    withBase(spec, orderStart + 1, "ai-review", {
      type: "diff_review",
      title: `${title} · AI Diff 审查 · ${spec.salt.slice(0, 4)}`,
      prompt: `AI 给 ${spec.pathTag} 提了下列 diff，是否接受？`,
      diffSnippet: diff,
      correctAnswer: { type: "diff_review", verdict: "reject", reason: issue.reason },
      explanation: {
        short: `拒绝：${issue.short}`,
        aiReviewNote: issue.reason,
        realProjectNote: spec.pathTag,
      },
      serverClientBoundary: "server" as ServerClientBoundary,
      touchedFiles: [lesson.path],
      aiReviewRisk: issue.reason,
      realWorldImpact: `合并这个 diff 会让 ${lesson.title} 出现 ${issue.short}`,
    }),
    withBase(spec, orderStart + 2, "ai-review", {
      type: "code_fix",
      title: `${title} · 最小修复 · ${spec.salt.slice(0, 4)}`,
      prompt: `把 ${spec.pathTag} 的"${issue.short}"用一行修复回来。`,
      codeFixBaseline: spec.codeExcerpt + "\n// TODO: " + issue.short,
      correctAnswer: {
        type: "code_fix",
        patchedCode:
          spec.codeExcerpt +
          (issue.riskId === "missing_session"
            ? `\nif (!session) throw redirect('/auth');`
            : issue.riskId === "missing_validation"
              ? `\nconst data = schema.parse(body);`
              : issue.riskId === "missing_rate_limit"
                ? `\nawait rateLimit(userId);`
                : `\nthrow redirect('/');`),
      },
      expectedFixScope: "one-line" as ExpectedFixScope,
      serverClientBoundary: "server" as ServerClientBoundary,
      touchedFiles: [lesson.path],
      explanation: {
        short: "针对这条具体失败补一行最小修复。",
        realProjectNote: spec.pathTag,
      },
      realWorldImpact: `缺这一行会让 ${title} 涉及的整条链暴露在 ${issue.short}。`,
    }),
  ].filter(passesQualityBar);
};

// ---------------------------------------------------------------------------
// Layer 5: typescript-review
// ---------------------------------------------------------------------------

const buildTypeScriptReviewQuestions: GeneratorFn = (spec, orderStart) => {
  const lesson = spec.lesson;
  const title = lesson.title;
  return [
    withBase(spec, orderStart, "typescript-review", {
      type: "true_false",
      title: `${title} · 类型契约 · ${spec.salt.slice(0, 4)}`,
      prompt: `${spec.pathTag} 返回类型用 as any 来"快速通过" TS 检查，是可以接受的临时方案。`,
      correctAnswer: { type: "true_false", value: false },
      explanation: {
        short: "`as` 抹掉错误，不是修复。",
        realProjectNote: spec.pathTag,
      },
      typeSafetyRisk: "`as any` 会沿调用链向下传播，下游消费者失去类型契约。",
    }),
    withBase(spec, orderStart + 1, "typescript-review", {
      type: "multi_choice", title: `${title} · 类型习惯 · ${spec.salt.slice(0, 4)}`,
      prompt: `为 ${spec.pathTag} 写 loader 时，下列哪些是健康的 TypeScript 习惯？`,
      options: [
        { id: "typeof", text: "用 typeof loader 推导 useLoaderData 的类型" },
        { id: "zod", text: "用 zod 校验请求体" },
        { id: "any", text: "用 any 避开错误" },
        { id: "union", text: "用 discriminated union 表达错误形态" },
      ],
      correctAnswer: { choiceIds: ["typeof", "zod", "union"] },
      explanation: {
        short: "推导 + 校验 + 联合类型。",
        realProjectNote: spec.pathTag,
      },
      typeSafetyRisk: "放弃 typeof / zod 会让 loader 返回值变成 unknown,前端需手动 narrow。",
    }),
    withBase(spec, orderStart + 2, "typescript-review", {
      type: "single_choice",
      title: `${title} · unknown vs any · ${spec.salt.slice(0, 4)}`,
      prompt: `对 ${spec.pathTag} 接受的未知输入字段，哪种类型处理最安全？`,
      options: [
        { id: "unknown", text: "unknown + 收窄（typeof / zod）" },
        { id: "any", text: "any 让编译器闭嘴" },
        { id: "string", text: "string 然后 cast" },
        { id: "never", text: "never 假装永远不会到这里" },
      ],
      correctAnswer: { choiceId: "unknown" },
      explanation: {
        short: "unknown 强制收窄。",
        realProjectNote: spec.pathTag,
      },
      typeSafetyRisk: "any 与 string-cast 都跳过了真实校验，是线上 bug 的温床。",
    }),
  ].filter(passesQualityBar);
};

// ---------------------------------------------------------------------------
// Layer 6: production-debugging
// ---------------------------------------------------------------------------

type DebugScenario = {
  id: string;
  symptom: string;
  firstCheck: string;
  wrong: [string, string, string];
  short: string;
  impact: string;
};

function pickDebugScenario(spec: EnhancedLessonSpec): DebugScenario {
  const haystack = [
    spec.lesson.path,
    spec.lesson.focus,
    spec.lesson.summary,
    ...spec.lesson.remixModules,
  ]
    .join(" ")
    .toLowerCase();

  if (/auth|session|login|oauth|cookie/.test(haystack)) {
    return {
      id: "session",
      symptom: "登录用户偶发被当成匿名用户",
      firstCheck: "检查 session cookie 是否被正确读取、SameSite/Domain 是否匹配",
      wrong: ["先重启 Worker", "先改 Tailwind class", "先清空 D1 表"],
      short: "认证问题先查 cookie/session 边界。",
      impact: `session 边界错会让 ${spec.pathTag} 把已登录用户误判为匿名用户。`,
    };
  }

  if (/api|nemesis|action|sse|gateway|route/.test(haystack)) {
    return {
      id: "api",
      symptom: "POST 后前端只看到 loading，不出现最终回复",
      firstCheck: "检查 action 返回的 SSE error/done 事件与 429/5xx 状态映射",
      wrong: ["先换按钮颜色", "先删掉 loading UI", "先改首页 meta"],
      short: "API/SSE 问题先查事件流与错误映射。",
      impact: `${spec.pathTag} 的 SSE/Action 事件错位会让用户卡在 loading，重复提交请求。`,
    };
  }

  if (/css|theme|html|layout|fouc|motion/.test(haystack)) {
    return {
      id: "theme",
      symptom: "首屏主题闪烁或动效偏好不生效",
      firstCheck: "检查 html class、theme cookie、inline script 与 reduced-motion 分支",
      wrong: ["先重建 D1 索引", "先调整 API 限流", "先改 OAuth 回调"],
      short: "主题/动效问题先查 SSR 与客户端首帧一致性。",
      impact: `${spec.pathTag} 首帧不一致会造成 FOUC、hydration mismatch 或可访问性退化。`,
    };
  }

  if (/loader|params|redirect|cache|header/.test(haystack)) {
    return {
      id: "loader",
      symptom: "同一页面不同用户看到的数据不一致或缓存串台",
      firstCheck: "检查 loader 的 Cache-Control、params 守卫与 redirect 分支",
      wrong: ["先改 CSS grid", "先换模型 provider", "先删除 useEffect"],
      short: "loader 问题先查缓存头、params 与 redirect。",
      impact: `${spec.pathTag} 的 loader 缓存策略错会让用户读到过期或他人的数据。`,
    };
  }

  if (/d1|migration|messages|audit|db|sqlite/.test(haystack)) {
    return {
      id: "d1",
      symptom: "线上写入成功但后台审计或历史记录缺字段",
      firstCheck: "检查 migration、JSON column 解析与 D1 prepare/bind 参数顺序",
      wrong: ["先改 hero 动画", "先换字体", "先禁用路由"],
      short: "D1 问题先查 schema、JSON 列与 bind 顺序。",
      impact: `${spec.pathTag} 的 D1 字段错会让审计/历史记录长期失真。`,
    };
  }

  return {
    id: "cache",
    symptom: "生产偶发 5xx，调用方说「我什么都没改」",
    firstCheck: "检查 CDN 是否缓存了上一次错误响应，以及 D1 read 命中率",
    wrong: ["先改 Tailwind class", "先换字体", "先改 import 排序"],
    short: "通用排障先查缓存与数据访问。",
    impact: `CDN 缓存了 ${spec.pathTag} 的错误响应会让所有用户看到错误页直到 TTL 过期。`,
  };
}

const buildProductionDebuggingQuestions: GeneratorFn = (spec, orderStart) => {
  const lesson = spec.lesson;
  const title = lesson.title;
  const scenario = pickDebugScenario(spec);
  return [
    withBase(spec, orderStart, "production-debugging", {
      type: "debug",
      title: `${title} · 排障 1 · ${spec.salt.slice(0, 4)}`,
      prompt: `${spec.pathTag} ${scenario.symptom}。第一个排查方向？`,
      code: `// remix/${spec.pathTag}\n// ${lesson.focus}\n// scenario=${scenario.id}`,
      options: [
        { id: scenario.id, text: scenario.firstCheck },
        { id: "wrong-a", text: scenario.wrong[0] },
        { id: "wrong-b", text: scenario.wrong[1] },
        { id: "wrong-c", text: scenario.wrong[2] },
      ],
      correctAnswer: { issueId: scenario.id },
      explanation: {
        short: scenario.short,
        detail: `${spec.pathTag} 的职责是「${lesson.focus}」，排障先从这条真实调用链的边界开始，而不是随意改 UI。`,
        realProjectNote: spec.pathTag,
      },
      realWorldImpact: scenario.impact,
    }),
    withBase(spec, orderStart + 1, "production-debugging", {
      type: "debug",
      title: `${title} · 排障 2 · ${spec.salt.slice(0, 4)}`,
      prompt: `${spec.pathTag} 在大流量时延显著升高，且现象集中在「${lesson.focus}」路径。最应该先看哪条证据？`,
      code: `// remix/${spec.pathTag}\n// ${lesson.summary}\n// focus=${lesson.focus}`,
      options: [
        { id: "logs", text: "按请求链看服务端日志 / status / D1 或上游调用耗时" },
        { id: "css", text: "CSS 选择器层级" },
        { id: "img", text: "无关页面图片大小" },
        { id: "font", text: "字体回退链路" },
      ],
      correctAnswer: { issueId: "logs" },
      explanation: {
        short: "大流量延迟先看链路证据。",
        detail: `排障要沿 ${spec.pathTag} 的真实调用链看 status、日志、D1 或上游调用耗时。`,
        realProjectNote: spec.pathTag,
      },
      realWorldImpact: `只看 UI 细节会错过 ${title} 的真实瓶颈，让线上延迟继续扩大。`,
    }),
  ].filter(passesQualityBar);
};

// ---------------------------------------------------------------------------
// Layer 7: free-response
// ---------------------------------------------------------------------------

const buildFreeResponseQuestions: GeneratorFn = (spec, orderStart) => {
  const lesson = spec.lesson;
  const title = lesson.title;
  const issue = pickAiReviewIssue(spec);
  return [
    withBase(spec, orderStart, "free-response", {
      type: "review_comment",
      title: `${title} · PR Review · ${spec.salt.slice(0, 4)}`,
      prompt: `针对 ${spec.pathTag} 的下列 diff（AI 试图${issue.short}）写一段 PR Review 评语（>1 句）。`,
      diffSnippet:
        `--- a/${fileName(spec)}\n+++ b/${fileName(spec)}\n@@\n-  // before: ${lesson.focus}\n+  // after:  ${issue.short}\n`,
      correctAnswer: { type: "review_comment", comment: "no correct answer — AI grades" },
      expectedFixScope: "single-function" as ExpectedFixScope,
      serverClientBoundary: "server" as ServerClientBoundary,
      explanation: {
        short: "自由评语，AI 评分。",
        realProjectNote: spec.pathTag,
      },
    }),
    withBase(spec, orderStart + 1, "free-response", {
      type: "free_explain",
      title: `${title} · 自由复述 · ${spec.salt.slice(0, 4)}`,
      prompt: `用自己的话讲讲 ${spec.pathTag} 的执行流程（重点：${lesson.focus}）。`,
      code: spec.codeExcerpt,
      correctAnswer: { type: "free_explain", text: "no correct answer — AI grades" },
      explanation: {
        short: "自由复述，AI 评分。",
        realProjectNote: spec.pathTag,
      },
    }),
  ].filter(passesQualityBar);
};

export const LAYER_GENERATORS: GeneratorFn[] = [
  buildBasicQuestions,
  buildCodeReadingQuestions,
  buildStateReasoningQuestions,
  buildAiReviewQuestions,
  buildTypeScriptReviewQuestions,
  buildProductionDebuggingQuestions,
  buildFreeResponseQuestions,
];
