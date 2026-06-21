/**
 * Real questions for site-02-root-shell / root-loader.
 *
 * **Source of truth: timu.MD §4「root loader 真题样卷」(lines 337-1330).**
 * The 28 questions below are direct ports of the user-authored sample exam.
 * Style follows timu.MD §5 quality standards: concise prompts, plain text
 * (no markdown bold), short option strings, 解析 1-3 lines, 真实工程后果 as
 * separate prose where the source provides it, 错因反馈 keyed by option id.
 *
 * Layer mapping (timu.MD §3 has 4 main layers; Phase 3 split AI审查 into
 * sub-layers, so we map):
 *   - Part 1 (Q1-Q5)   → basic
 *   - Part 2 (Q6-Q10)  → code-reading
 *   - Part 3 (Q11-Q15) → state-reasoning
 *   - Part 4 (Q16-Q19) → ai-review (advanced reasoning about wrong choices)
 *   - Part 5 (Q20-Q24) → ai-review
 *   - Part 6 (Q25-Q26) → ai-review (minimal fixes after AI breakage)
 *   - Part 7 (Q27-Q28) → free-response
 *
 * Anchor file: remix/app/root.tsx (loader at L32-46).
 * timu.MD's「参考代码」is a SIMPLIFIED 8-line teaching snippet — we use it
 * verbatim as the question `code`, not the full 16-line prod loader, to
 * keep focus on theme/session 守门 (the lesson's actual learning goal).
 */

import { q } from "../../types";
import type { RealQ } from "../index";

// timu.MD §4「参考代码」— the canonical teaching snippet. Use this exact
// 8-line form in question `code`, not the full prod loader.
const ROOT_LOADER_REF = `export const loader = async ({ request }: LoaderFunctionArgs) => {
  const theme = await getTheme(request);

  const session = requestHasAuthSessionCookie(request)
    ? await getSessionCached(request)
    : null;

  return json({
    theme,
    session: toPublicSession(session),
  });
};`;

// 9-line numbered version used by Q7 (line_pick).
const ROOT_LOADER_NUMBERED = `1 export const loader = async ({ request }: LoaderFunctionArgs) => {
2   const theme = await getTheme(request);
3
4   const session = requestHasAuthSessionCookie(request)
5     ? await getSessionCached(request)
6     : null;
7
8   return json({ theme, session: toPublicSession(session) });
9 };`;

// AI's「无条件读取 session」mistake (Q20, Q25, Q27).
const AI_DROP_GUARD_CODE = `export const loader = async ({ request }: LoaderFunctionArgs) => {
  const theme = await getTheme(request);
  const session = await getSessionCached(request);

  return json({
    theme,
    session: toPublicSession(session),
  });
};`;

const AI_DROP_GUARD_DIFF = ` export const loader = async ({ request }: LoaderFunctionArgs) => {
   const theme = await getTheme(request);

-  const session = requestHasAuthSessionCookie(request)
-    ? await getSessionCached(request)
-    : null;
+  const session = await getSessionCached(request);

   return json({
     theme,
     session: toPublicSession(session),
   });
 };`;

const ROOT_TOUCHED = ["app/root.tsx"];
const AUTH_TOUCHED = ["app/root.tsx", "app/lib/auth.server.ts"];

export const rootLoaderQuestions: RealQ[] = [
  // ─── 第一部分：基础识别题 (Q1–Q5) ────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 root loader 的角色",
    prompt: "root.tsx 里的 loader 最接近下面哪种角色？",
    options: [
      { id: "A", text: "只负责按钮点击事件" },
      { id: "B", text: "页面请求进入时，在服务端准备全站需要的数据" },
      { id: "C", text: "只负责 Tailwind 样式" },
      { id: "D", text: "只负责浏览器 localStorage" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "root loader 是服务端数据入口。",
      detail:
        "它在页面请求时运行，把 theme、session 等全站共享数据准备好，再交给 React 树使用。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: ROOT_TOUCHED,
    wrongAnswerFeedback: {
      A: "把服务端 loader 和客户端交互混淆了。按钮点击是浏览器侧逻辑；loader 是请求时的服务端逻辑。",
      D: "localStorage 是浏览器侧逻辑；loader 是请求时的服务端逻辑。",
    },
  }),
  q({
    type: "single_choice",
    title: "Q2 theme 来自哪里？",
    prompt: "下面哪一行负责读取主题？",
    code: `const theme = await getTheme(request);

const session = requestHasAuthSessionCookie(request)
  ? await getSessionCached(request)
  : null;`,
    options: [
      { id: "A", text: "getTheme(request)" },
      { id: "B", text: "getSessionCached(request)" },
      { id: "C", text: "requestHasAuthSessionCookie(request)" },
      { id: "D", text: "toPublicSession(session)" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "getTheme(request) 负责从请求中解析主题信息。",
      detail: "通常来自 cookie。",
      realProjectNote: "remix/app/utils/theme.server.ts",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: ["app/root.tsx", "app/utils/theme.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q3 谁是 session 守门员？",
    prompt: "哪个函数负责判断请求里是否存在 auth session cookie？",
    options: [
      { id: "A", text: "getTheme" },
      { id: "B", text: "json" },
      { id: "C", text: "requestHasAuthSessionCookie" },
      { id: "D", text: "toPublicSession" },
    ],
    correctAnswer: { choiceId: "C" },
    explanation: {
      short: "requestHasAuthSessionCookie 是 session 读取前的守门逻辑。",
      detail:
        "它不负责读取 session，只负责判断是否值得进入 session 读取链路。",
      realProjectNote: "remix/app/lib/auth.server.ts",
    },
    abilityTags: ["backend.session.cookie", "bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q4 哪个函数可能触发 D1 或 session 存储读取？",
    prompt: "下面哪个函数最可能涉及 session 查询、缓存读取或 D1 读取？",
    options: [
      { id: "A", text: "getTheme(request)" },
      { id: "B", text: "getSessionCached(request)" },
      { id: "C", text: "json(...)" },
      { id: "D", text: "toPublicSession(...)" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "getSessionCached 是真正读取 session 的函数。",
      detail:
        "虽然名字里有 Cached，但 cache miss 时仍然可能触发数据库或 session 存储读取。",
      realProjectNote: "remix/app/lib/auth.server.ts",
    },
    abilityTags: ["backend.session.cookie", "bridge.reactRouter.loader"],
    sourceFilePath: "app/lib/auth.server.ts",
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
  q({
    type: "true_false",
    title: "Q5 theme 和 session 的关系",
    prompt: "判断：匿名用户不会读取 session，所以也不会读取 theme。",
    correctAnswer: { type: "true_false", value: false },
    explanation: {
      short: "theme 和 session 是两条不同链路。",
      detail: "theme 可以始终读取；session 需要 auth cookie 守门。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: ROOT_TOUCHED,
  }),

  // ─── 第二部分：读代码理解题 (Q6–Q10) ────────────────────────────────────
  q({
    type: "sort",
    title: "Q6 执行顺序排序",
    prompt: "请排列 root loader 读取数据的合理顺序。",
    sortItems: [
      { id: "A", text: "返回 json，注入 React 树" },
      { id: "B", text: "读取 theme cookie" },
      { id: "C", text: "如果有 auth cookie，则读取 session" },
      { id: "D", text: "检查是否存在 auth session cookie" },
    ],
    correctAnswer: { type: "sort", itemIds: ["B", "D", "C", "A"] },
    explanation: {
      short: "B → D → C → A。",
      detail:
        "root loader 先读取 theme，然后检查 auth cookie。只有存在 auth cookie 时，才读取 session。最后把数据通过 json 返回。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: ROOT_TOUCHED,
  }),
  q({
    type: "line_pick",
    title: "Q7 关键行定位",
    prompt: "哪一行阻止了匿名用户读取 session？",
    code: ROOT_LOADER_NUMBERED,
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "const theme = await getTheme(request);" },
      {
        id: "L4",
        lineNumber: 4,
        text: "const session = requestHasAuthSessionCookie(request)",
        explanation: "守门逻辑。只有这一行为真，才会执行第 5 行的 getSessionCached。",
      },
      { id: "L5", lineNumber: 5, text: "  ? await getSessionCached(request)" },
      {
        id: "L8",
        lineNumber: 8,
        text: "return json({ theme, session: toPublicSession(session) });",
      },
    ],
    correctAnswer: { type: "line_pick", lineId: "L4" },
    explanation: {
      short: "第 4 行是守门逻辑。",
      detail:
        "只有 requestHasAuthSessionCookie(request) 为真，才会执行第 5 行。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["backend.session.cookie", "bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: ROOT_TOUCHED,
  }),
  q({
    type: "fill_blank",
    title: "Q8 代码填空",
    prompt: "补全下面代码。",
    code: `const session = requestHasAuthSessionCookie(request)
  ? await ________(request)
  : null;`,
    blanks: [
      {
        id: "fn",
        placeholder: "函数名",
        acceptedAnswers: ["getSessionCached"],
      },
    ],
    correctAnswer: { type: "fill_blank", values: { fn: "getSessionCached" } },
    explanation: {
      short: "有 auth cookie 时才调用 getSessionCached，否则 session 是 null。",
      detail:
        "题目质量备注：这个题只能作为基础巩固题，不能单独作为核心题。因为它主要考函数名，不一定考理解。必须搭配状态推演题和 AI 审查题。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["backend.session.cookie", "bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q9 代码意图识别",
    prompt: "下面这段代码的主要意图是什么？",
    code: `const session = requestHasAuthSessionCookie(request)
  ? await getSessionCached(request)
  : null;`,
    options: [
      { id: "A", text: "让所有访问都读取 session，确保绝对安全" },
      { id: "B", text: "只有请求里存在 auth cookie 时，才尝试读取 session" },
      { id: "C", text: "禁止所有用户登录" },
      { id: "D", text: "把 theme 写入数据库" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "关键不是读取 session，而是条件读取 session。",
      detail:
        "它通过 auth cookie 判断来避免匿名请求进入 session 读取链路。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["backend.session.cookie", "bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q10 返回数据识别",
    prompt: "下面哪些数据会被 root loader 返回给 React 树？",
    code: `return json({
  theme,
  session: toPublicSession(session),
});`,
    options: [
      { id: "A", text: "theme" },
      { id: "B", text: "public session" },
      { id: "C", text: "原始 request 对象" },
      { id: "D", text: "数据库连接对象" },
    ],
    correctAnswer: { choiceIds: ["A", "B"] },
    explanation: {
      short: "返回 theme 和经过 toPublicSession 处理后的 session。",
      detail: "不应该把原始 request 或数据库连接对象返回给前端。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["bridge.reactRouter.loader", "backend.session.cookie"],
    sourceFilePath: "app/root.tsx",
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: ROOT_TOUCHED,
  }),

  // ─── 第三部分:状态推演题 (Q11–Q15) ─────────────────────────────────────
  q({
    type: "multi_choice",
    title: "Q11 匿名用户访问首页",
    prompt:
      "场景:用户匿名访问首页(有 theme cookie,没有 auth session cookie)。这次请求会发生什么?",
    options: [
      { id: "A", text: "会执行 getTheme(request)" },
      { id: "B", text: "会执行 getSessionCached(request)" },
      { id: "C", text: "session 最终是 null" },
      { id: "D", text: "一定会访问 D1 session 表" },
    ],
    correctAnswer: { choiceIds: ["A", "C"] },
    explanation: {
      short: "有 theme cookie → 读 theme;没有 auth cookie → session=null,跳过 D1。",
      detail:
        "有 theme cookie,所以会读取 theme。没有 auth session cookie,所以不会执行 getSessionCached(request)。因此 session 是 null,也不应该访问 D1 session 表。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["backend.session.cookie", "bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q12 登录用户访问任意页面",
    prompt:
      "场景:用户已登录,访问任意页面(有 theme cookie,有 auth session cookie)。下面哪些说法正确?",
    options: [
      { id: "A", text: "会读取 theme" },
      { id: "B", text: "会先检查 auth cookie" },
      { id: "C", text: "可能读取 session" },
      { id: "D", text: "root loader 不会运行" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "root loader 是全站入口,登录态会进入 session 读取链路。",
      detail: "已登录用户有 auth cookie,所以会进入 session 读取逻辑。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["backend.session.cookie", "bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q13 没有 theme cookie,也没有 auth cookie",
    prompt:
      "场景:用户第一次访问网站(没有 theme cookie,没有 auth session cookie)。最合理的结果是什么?",
    options: [
      { id: "A", text: "loader 必然报错" },
      { id: "B", text: "theme 使用默认值,session 是 null" },
      { id: "C", text: "session 自动变成登录状态" },
      { id: "D", text: "页面无法渲染" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "theme 落默认值;session 因无 auth cookie 而 null。",
      detail:
        "正常设计里,theme 没有 cookie 时应该回落到默认主题。没有 auth cookie 时,session 是 null。",
      realProjectNote: "remix/app/root.tsx + remix/app/utils/theme.server.ts",
    },
    abilityTags: ["bridge.reactRouter.loader", "backend.session.cookie"],
    sourceFilePath: "app/root.tsx",
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: ["app/root.tsx", "app/utils/theme.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q14 auth cookie 存在,但 session 已失效",
    prompt:
      "场景:用户请求里存在 auth session cookie,但服务端 session 已经过期或无效。最合理的行为是什么?",
    options: [
      { id: "A", text: "因为有 auth cookie,所以一定登录成功" },
      {
        id: "B",
        text: "会进入 getSessionCached(request),但最终可能得到 null 或无效 session",
      },
      { id: "C", text: "不会读取 theme" },
      { id: "D", text: "应该直接信任 cookie 里的所有用户信息" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "auth cookie 只是进入读取链路的条件,不等于登录有效。",
      detail: "真正的 session 仍然需要服务端验证。",
      realProjectNote: "remix/app/lib/auth.server.ts",
    },
    abilityTags: ["backend.session.cookie", "bridge.reactRouter.loader"],
    sourceFilePath: "app/lib/auth.server.ts",
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q15 性能成本判断",
    prompt:
      "为什么要先判断 requestHasAuthSessionCookie(request),再调用 getSessionCached(request)?",
    options: [
      { id: "A", text: "为了让代码更长" },
      { id: "B", text: "为了避免匿名请求进入 session 读取链路" },
      { id: "C", text: "为了让 Tailwind 生效" },
      { id: "D", text: "为了让 React 组件重新渲染" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "匿名请求不应该触发 session 查询。",
      detail:
        "守门判断可以减少不必要的 session 解析、缓存读取、D1 查询风险。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["backend.session.cookie", "ai.review.architecture"],
    sourceFilePath: "app/root.tsx",
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),

  // ─── 第四部分:进阶理解题 (Q16–Q19) ─────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q16 为什么不能把 session 全部放到前端 localStorage?",
    prompt:
      "AI 建议:为了减少 loader 复杂度,把 session 存到 localStorage,root loader 不再读取 session。这个建议最大的问题是什么?",
    options: [
      { id: "A", text: "localStorage 只能存 CSS" },
      {
        id: "B",
        text: "登录态属于安全敏感状态,不能只依赖前端 localStorage 判断",
      },
      { id: "C", text: "root loader 不能返回 json" },
      { id: "D", text: "theme 不能使用 cookie" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "登录态必须以服务端可信数据为准。",
      detail: "localStorage 可以被用户修改,不能作为安全边界。",
      realProjectNote: "remix/app/lib/auth.server.ts",
      aiReviewNote:
        "如果只依赖 localStorage 判断登录态,用户可能伪造前端状态,导致 UI 和后端权限判断不一致。",
    },
    abilityTags: ["backend.auth.required", "ai.review.architecture"],
    sourceFilePath: "app/lib/auth.server.ts",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/root.tsx", "app/lib/auth.server.ts"],
  }),
  q({
    type: "single_choice",
    title: "Q17 为什么要用 toPublicSession?",
    prompt: "toPublicSession(session) 的主要作用是什么?",
    options: [
      { id: "A", text: "把 session 转成前端安全可见的数据" },
      { id: "B", text: "把 theme 写进数据库" },
      { id: "C", text: "强制用户退出登录" },
      { id: "D", text: "删除所有 cookie" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "原始 session 可能包含敏感字段,toPublicSession 只暴露公开字段。",
      detail:
        "原始 session 可能包含敏感字段,不应该直接返回给前端。toPublicSession 的作用是只暴露前端需要的公开字段。",
      realProjectNote: "remix/app/lib/auth.server.ts",
    },
    abilityTags: ["backend.session.cookie", "ai.review.architecture"],
    sourceFilePath: "app/lib/auth.server.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q18 重复读取 session 的架构问题",
    prompt:
      "如果每个子路由 loader 都重复读取 session,而 root loader 也读取 session,最大的问题是什么?",
    options: [
      { id: "A", text: "所有代码都会变成 CSS" },
      {
        id: "B",
        text: "session 读取分散,容易造成重复查询、状态不一致和维护困难",
      },
      { id: "C", text: "React 不能使用 loader" },
      { id: "D", text: "D1 会自动消失" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "全站共享的登录态适合在 root loader 统一读取。",
      detail:
        "重复分散读取会增加性能成本,也会让权限状态来源变得混乱。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["ai.review.architecture", "code.position.handler"],
    sourceFilePath: "app/root.tsx",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ROOT_TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q19 theme 为什么适合放在 root loader?",
    prompt: "theme 为什么适合在 root loader 读取?",
    options: [
      { id: "A", text: "因为 theme 只影响一个按钮" },
      {
        id: "B",
        text: "因为 theme 影响全站外观,Layout 和页面都可能需要",
      },
      { id: "C", text: "因为 theme 必须访问 D1" },
      { id: "D", text: "因为 theme 不能存在 cookie" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "theme 是全站 UI 状态。",
      detail:
        "放在 root loader 里可以保证 Layout、子路由、全局组件获得一致主题。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["frontend.state.global", "bridge.reactRouter.loader"],
    sourceFilePath: "app/root.tsx",
    layer: "ai-review",
    serverClientBoundary: "shared",
    touchedFiles: ROOT_TOUCHED,
  }),

  // ─── 第五部分:AI 改坏审查题 (Q20–Q24) ──────────────────────────────────
  q({
    type: "ai_review",
    title: "Q20 无条件读取 session",
    prompt: "Cursor 把代码改成了这样。这个改动最大的问题是什么?",
    code: AI_DROP_GUARD_CODE,
    options: [
      {
        id: "A",
        text: "匿名请求也会读取 session,破坏了 auth cookie 守门逻辑",
      },
      { id: "B", text: "代码更短,所以一定更好" },
      { id: "C", text: "主要问题是 theme 应该放在 session 后面" },
      { id: "D", text: "主要问题是 return json 写法错误" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "AI 改完后每个匿名请求也会执行 session 读取。",
      detail:
        "原代码中,getSessionCached(request) 只有在存在 auth cookie 时才执行。AI 改完后,每个匿名请求也会执行 session 读取,可能增加性能成本,也破坏了 root loader 的边界。",
      realProjectNote: "remix/app/root.tsx",
      aiReviewNote:
        "AI 喜欢「先 await 再判断」,删掉短路;理由通常是「代码更简洁」。",
    },
    abilityTags: ["ai.review.architecture", "backend.session.cookie"],
    sourceFilePath: "app/root.tsx",
    layer: "ai-review",
    expectedFixScope: "one-line",
    serverClientBoundary: "server",
    touchedFiles: ROOT_TOUCHED,
    realWorldImpact:
      "匿名访问量越大 → session 读取越多 → cache / D1 压力越大 → 页面整体变慢。",
    aiReviewRisk:
      "AI 倾向把「廉价守门 + 昂贵查询」两步压成一步;短路守门的存在本身就是为了不简洁地表达「不该查就不查」。",
  }),
  q({
    type: "single_choice",
    title: "Q21 cached 不等于免费",
    prompt:
      "AI 解释说:getSessionCached 里面有 cached,所以无条件调用也没关系。你应该如何判断?",
    options: [
      { id: "A", text: "完全同意,cached 等于没有成本" },
      {
        id: "B",
        text: "不完全同意,cached 只能降低重复读取成本,但匿名请求本来就不该进入 session 链路",
      },
      { id: "C", text: "同意,因为 root loader 查的数据越多越安全" },
      { id: "D", text: "不同意,因为 cached 会导致 Tailwind 冲突" },
    ],
    correctAnswer: { choiceId: "B" },
    explanation: {
      short: "cached 不等于免费。",
      detail:
        "cache miss 仍然可能有成本。更关键的是,匿名请求根本不应该进入 session 读取链路。",
      realProjectNote: "remix/app/lib/auth.server.ts",
    },
    abilityTags: ["ai.review.architecture", "backend.session.cookie"],
    sourceFilePath: "app/lib/auth.server.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
  q({
    type: "ai_review",
    title: "Q22 去掉 toPublicSession",
    prompt:
      "AI 把代码改成了这样,去掉了 toPublicSession(session)。这个改动有什么风险?",
    code: `return json({
  theme,
  session,
});`,
    options: [
      { id: "A", text: "可能把原始 session 中的敏感字段暴露给前端" },
      { id: "B", text: "可以显著提升 CSS 性能" },
      { id: "C", text: "会导致 theme cookie 无法读取" },
      { id: "D", text: "没有任何风险,越原始越好" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "toPublicSession 是服务端数据暴露给前端前的一层过滤。",
      detail: "去掉它可能把不该给浏览器看的字段传出去。",
      realProjectNote: "remix/app/lib/auth.server.ts",
    },
    abilityTags: ["ai.review.architecture", "backend.session.cookie"],
    sourceFilePath: "app/lib/auth.server.ts",
    layer: "ai-review",
    expectedFixScope: "one-line",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
    realWorldImpact:
      "敏感字段(token、内部 IP、风控字段)会一并出现在客户端 useLoaderData 里,可能被前端日志、Sentry breadcrumb 或恶意脚本读到。",
    aiReviewRisk:
      "AI 看到「toPublicSession(session)」会觉得是冗余包装;它不知道这是显式的 allow-list 安全边界。",
  }),
  q({
    type: "ai_review",
    title: "Q23 把 theme 放进 useState",
    prompt:
      "AI 建议:不用在 root loader 读 theme,直接在 Layout 里 useState('light') 就行。最大问题是什么?",
    options: [
      {
        id: "A",
        text: "这样会让全站初始主题不再来自请求 cookie,可能造成首屏主题不一致或闪烁",
      },
      { id: "B", text: "useState 不能用于 React" },
      { id: "C", text: "theme 必须来自 D1" },
      { id: "D", text: "Layout 不能读取任何状态" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "theme 是请求级状态,服务端渲染时就应该知道。",
      detail:
        "如果只在客户端 useState,首屏可能先渲染默认主题,再切换成用户主题,造成闪烁或不一致。",
      realProjectNote: "remix/app/root.tsx + Layout()",
    },
    abilityTags: ["ai.review.architecture", "frontend.state.global"],
    sourceFilePath: "app/root.tsx",
    layer: "ai-review",
    expectedFixScope: "single-function",
    serverClientBoundary: "mixed-risk",
    touchedFiles: ROOT_TOUCHED,
    realWorldImpact:
      "首屏闪烁:用户看到默认 light 主题,水合后才切到 dark;视觉抖动一两百毫秒,用户能感知。",
    aiReviewRisk:
      "AI 把请求级状态和组件级状态混淆;只要看起来像 React 状态它就倾向用 useState。",
  }),
  q({
    type: "ai_review",
    title: "Q24 把 root loader 数据重复塞到子路由",
    prompt:
      "AI 在多个子路由 loader 里都加了 const session = await getSessionCached(request);。你应该如何评价?",
    options: [
      {
        id: "A",
        text: "不推荐。全站共享 session 应由 root loader 统一处理,子路由只在需要额外权限校验时再做专门读取",
      },
      { id: "B", text: "完全正确,重复越多越安全" },
      { id: "C", text: "这主要是 Tailwind 的问题" },
      { id: "D", text: "子路由 loader 不能读取任何数据" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "root loader 适合提供全站公开 session。",
      detail:
        "子路由如果需要强权限校验,可以单独验证,但不应该无脑重复读取 session。",
      realProjectNote: "remix/app/root.tsx + 各 routes/*.tsx",
    },
    abilityTags: ["ai.review.architecture", "code.position.handler"],
    sourceFilePath: "app/root.tsx",
    layer: "ai-review",
    expectedFixScope: "cross-file",
    serverClientBoundary: "server",
    touchedFiles: ["app/root.tsx", "app/routes/"],
    realWorldImpact:
      "N 个子路由各查一次 session = N 倍 D1 read;权限来源分散后,下次改 session 形态要逐个文件改。",
    aiReviewRisk:
      "AI 把「职责分离」理解成「代码物理位置分散」,但 root 集中 session 的本质是数据契约,不是代码位置。",
  }),

  // ─── 第六部分:最小修改题 (Q25–Q26) ─────────────────────────────────────
  q({
    type: "code_fix",
    title: "Q25 修复无条件读取 session",
    prompt: "下面代码有问题,请做最小修复:",
    codeFixBaseline: AI_DROP_GUARD_CODE,
    correctAnswer: {
      type: "code_fix",
      patchedCode: ROOT_LOADER_REF,
    },
    explanation: {
      short: "最小修复 = 恢复 auth cookie 守门逻辑。",
      detail:
        "不是重构整个 loader,而是把 await getSessionCached(request) 改回 requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null。",
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["backend.session.cookie", "ai.review.architecture"],
    sourceFilePath: "app/root.tsx",
    layer: "ai-review",
    expectedFixScope: "one-line",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
    realWorldImpact:
      "缺这一行 = 全站每个匿名请求都打一次 D1。匿名 RPS 越高,损失越大。",
    aiReviewRisk:
      "AI 把短路守门当成可省的「冗余条件」,删之后单测仍能过——只有压测和成本账单才会暴露。",
  }),
  q({
    type: "code_fix",
    title: "Q26 补充 public session 过滤",
    prompt: "下面代码存在数据暴露风险,请做最小修复:",
    codeFixBaseline: `return json({
  theme,
  session,
});`,
    correctAnswer: {
      type: "code_fix",
      patchedCode: `return json({
  theme,
  session: toPublicSession(session),
});`,
    },
    explanation: {
      short: "服务端 session 不应该原样暴露给前端。",
      detail: "应该通过 toPublicSession 只返回公开字段。",
      realProjectNote: "remix/app/lib/auth.server.ts",
    },
    abilityTags: ["backend.session.cookie", "ai.review.architecture"],
    sourceFilePath: "app/lib/auth.server.ts",
    layer: "ai-review",
    expectedFixScope: "one-line",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
    realWorldImpact:
      "Better Auth 内部字段(含 token / 内部 IP / 风控分数等)会出现在 useLoaderData 返回值里。",
    aiReviewRisk:
      "AI 在「装饰函数 vs 安全边界」之间没有先验,包装函数容易被它当成可省略。",
  }),

  // ─── 第七部分:PR Review 自由回答题 (Q27–Q28) ───────────────────────────
  q({
    type: "review_comment",
    title: "Q27 写一句 Review Comment",
    prompt:
      "你看到 AI 提交了下面 diff。请写一句 PR review comment,说明为什么不能接受。",
    diffSnippet: AI_DROP_GUARD_DIFF,
    correctAnswer: {
      type: "review_comment",
      comment: "no correct answer — AI grades",
    },
    explanation: {
      short: "评语需覆盖 5 个要点(见详细评分标准)。",
      detail: [
        "参考答案:「这里不能无条件调用 getSessionCached。root loader 会在全站请求中执行,匿名用户没有 auth session cookie 时不应该进入 session 读取链路,否则会让匿名访问也产生 session 查询成本,甚至增加 D1 压力。建议保留 requestHasAuthSessionCookie 作为守门判断。」",
        "",
        "满分标准(回答需提到):",
        "1. root loader 是全站入口",
        "2. 匿名用户没有 auth cookie",
        "3. 不应该无条件读取 session",
        "4. 否则会增加性能 / D1 成本",
        "5. 应保留 requestHasAuthSessionCookie 守门",
      ].join("\n"),
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["ai.review.architecture", "backend.session.cookie"],
    sourceFilePath: "app/root.tsx",
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: ROOT_TOUCHED,
  }),
  q({
    type: "free_explain",
    title: "Q28 用自己的话解释本关",
    prompt:
      "用自己的话解释:为什么 root loader 适合读取 theme/session?为什么 session 读取必须有 auth cookie 守门?",
    code: ROOT_LOADER_REF,
    correctAnswer: {
      type: "free_explain",
      text: "no correct answer — AI grades",
    },
    explanation: {
      short: "示范答案 + 4 级评分标准(见详细)。",
      detail: [
        "参考答案:「root loader 是全站入口,Layout 和子路由都会挂在它下面,所以 theme 和 session 这种全站共享数据适合在这里统一读取。theme 是 UI 状态,可以每次请求都读取。session 是登录状态,可能涉及缓存或 D1 查询,所以不能对匿名请求无条件读取。应该先通过 requestHasAuthSessionCookie 判断是否存在 auth cookie,只有存在时才调用 getSessionCached。这样可以保证全站状态统一,也能避免匿名访问造成不必要的 session 查询成本。」",
        "",
        "评分标准:",
        "基础合格:能说出 root loader 是全站入口。",
        "良好:能说出 theme/session 是全站共享数据。",
        "优秀:能说出 session 读取有成本,匿名用户不应该进入 session 链路。",
        "满分:能同时提到 Layout/子路由、auth cookie 守门、toPublicSession、D1/性能风险。",
      ].join("\n"),
      realProjectNote: "remix/app/root.tsx",
    },
    abilityTags: ["bridge.reactRouter.loader", "backend.session.cookie"],
    sourceFilePath: "app/root.tsx",
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: AUTH_TOUCHED,
  }),
];
