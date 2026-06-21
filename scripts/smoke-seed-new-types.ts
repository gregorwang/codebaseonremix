/**
 * One-off smoke seeding: plant one of each Phase 2 question type
 * (true_false, line_pick, code_fix, diff_review, review_comment, free_explain)
 * into the first lesson of the theme-global-state course on the LOCAL D1.
 * Used to manually verify end-to-end rendering of the new types before
 * Phase 5 densifies the real curriculum.
 */
import { getPlatformProxy } from "wrangler";
import { createQuestion } from "../app/lib/server/learn/questions.server";
import { getLessonsByCourse } from "../app/lib/server/learn/lessons.server";
import { getCourseBySlug } from "../app/lib/server/learn/courses.server";
import { refreshLearnPublicCache } from "../app/lib/server/learn/cache-public.server";

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  const course = await getCourseBySlug(env.DB, "theme-global-state");
  if (!course) throw new Error("theme-global-state course not found");
  const lessons = await getLessonsByCourse(env.DB, course.id);
  const lesson = lessons[0];
  if (!lesson) throw new Error("no lesson in theme-global-state");

  const orderBase = 9000; // park them at the end of the lesson
  const baseMeta = {
    lessonId: lesson.id,
    explanation: {
      short: "新题型占位",
      detail: "本条目用于在 lesson 页面手动验证渲染。",
    },
    abilityTags: ["frontend.state.scope"] as Array<
      "frontend.state.scope"
    >,
    difficulty: "intermediate" as const,
    isPublished: true,
  };

  const created: string[] = [];

  created.push(
    (await createQuestion(env.DB, {
      ...baseMeta,
      type: "true_false",
      title: "Phase 2 smoke · true_false",
      prompt: "测试这条：把错答显示为红色。（正确）",
      correctAnswer: { type: "true_false", value: true },
      layer: "basic",
      orderIndex: orderBase,
    })).id,
  );

  created.push(
    (await createQuestion(env.DB, {
      ...baseMeta,
      type: "line_pick",
      title: "Phase 2 smoke · line_pick",
      prompt: "下列哪一行是 theme 守门后真正读取 session 的位置？",
      code: [
        "export async function loader({ request }) {",
        "  const theme = await getTheme(request);",
        "  const session = await getSessionCached(request);",
        "  if (!session) throw redirect('/login');",
        "  return json({ theme, user: session.user });",
        "}",
      ].join("\n"),
      linePickLines: [
        { id: "L1", lineNumber: 1, text: "export async function loader({ request }) {" },
        { id: "L2", lineNumber: 2, text: "  const theme = await getTheme(request);" },
        { id: "L3", lineNumber: 3, text: "  const session = await getSessionCached(request);" },
        { id: "L4", lineNumber: 4, text: "  if (!session) throw redirect('/login');" },
      ],
      correctAnswer: { type: "line_pick", lineId: "L3" },
      layer: "code-reading",
      orderIndex: orderBase + 1,
    })).id,
  );

  created.push(
    (await createQuestion(env.DB, {
      ...baseMeta,
      type: "code_fix",
      title: "Phase 2 smoke · code_fix",
      prompt: "补全 session 守门（缺 throw redirect 那一行）。",
      codeFixBaseline:
        "const session = await getSessionCached(request);\nreturn json({ user: session.user });",
      correctAnswer: {
        type: "code_fix",
        patchedCode:
          "const session = await getSessionCached(request);\nif (!session) throw redirect('/login');\nreturn json({ user: session.user });",
      },
      expectedFixScope: "one-line",
      serverClientBoundary: "server",
      realWorldImpact: "缺这一行会让未登录用户也能拿到 user JSON，前端路由再补 guard 就晚了。",
      layer: "production-debugging",
      orderIndex: orderBase + 2,
    })).id,
  );

  created.push(
    (await createQuestion(env.DB, {
      ...baseMeta,
      type: "diff_review",
      title: "Phase 2 smoke · diff_review",
      prompt: "AI 把 session 守门简化成 try/catch，下列 diff 是否接受？",
      diffSnippet:
        "--- a/app/root.tsx\n+++ b/app/root.tsx\n@@\n-  if (!session) throw redirect('/login');\n+  try { return json({ user: session.user }); } catch { return null; }\n",
      correctAnswer: { type: "diff_review", verdict: "reject", reason: "AI 用 try/catch 吞掉异常，等于把未登录当成已登录处理。" },
      serverClientBoundary: "server",
      aiReviewRisk: "AI 倾向用 try/catch 兜底，掩盖 401/403 路径。",
      touchedFiles: ["app/root.tsx"],
      layer: "ai-review",
      orderIndex: orderBase + 3,
    })).id,
  );

  created.push(
    (await createQuestion(env.DB, {
      ...baseMeta,
      type: "review_comment",
      title: "Phase 2 smoke · review_comment",
      prompt: "请对下列 diff 写一段 PR Review 评语（>1 句）。",
      diffSnippet:
        "--- a/app/routes/api.foo.ts\n+++ b/app/routes/api.foo.ts\n@@\n-  if (!session) return new Response('forbidden', { status: 403 });\n+  return json({ ok: true });\n",
      correctAnswer: { type: "review_comment", comment: "no correct answer — AI grades" },
      expectedFixScope: "single-function",
      serverClientBoundary: "server",
      typeSafetyRisk: "返回类型签名仍是 Promise<{ok:true}>，但实际未做授权会破坏类型契约。",
      layer: "free-response",
      orderIndex: orderBase + 4,
    })).id,
  );

  created.push(
    (await createQuestion(env.DB, {
      ...baseMeta,
      type: "free_explain",
      title: "Phase 2 smoke · free_explain",
      prompt: "用自己的话讲讲下面这段 loader 的执行流程。",
      code: [
        "export async function loader({ request }) {",
        "  const session = await getSessionCached(request);",
        "  if (!session) throw redirect('/login');",
        "  return json({ user: session.user });",
        "}",
      ].join("\n"),
      correctAnswer: { type: "free_explain", text: "no correct answer — AI grades" },
      layer: "free-response",
      orderIndex: orderBase + 5,
    })).id,
  );

  await refreshLearnPublicCache(env.DB, env.LEARN_CACHE);

  console.log("Smoke-seeded 6 new-type questions into lesson", lesson.slug);
  console.log("IDs:", created);
} finally {
  await dispose();
}
