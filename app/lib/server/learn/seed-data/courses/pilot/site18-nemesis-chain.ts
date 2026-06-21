import type { CreateQuestionInput, TeachingBlock } from "~/lib/learn/types";
import { SNIPPETS } from "../../snippets";
import { q } from "../../types";

type Q = Omit<CreateQuestionInput, "lessonId">;

const AI_RISK = [
  { id: "missing_session", label: "漏掉 session" },
  { id: "missing_validation", label: "漏掉字段校验" },
  { id: "missing_rate_limit", label: "漏掉限流" },
  { id: "loader_action_mix", label: "loader/action 职责混淆" },
];

export const NEMESIS_CHAIN_TEACHING: TeachingBlock[] = [
  {
    type: "concept",
    title: "Nemesis API 是一条守门链，不是「直接调模型」",
    content:
      "api.nemesis.ts 的 action 必须按固定顺序完成身份、字段、限流、内容审查，最后才调用 AI Gateway。任何一步失败都应尽早返回 4xx，而不是带着风险继续往下走。",
    keyPoints: [
      "requireNemesisUser → validate → rateLimit → guard → callModel",
      "限流必须在模型调用之前，否则浪费算力且可被滥用",
      "未登录应返回明确中文提示，而不是 500",
    ],
  },
  {
    type: "code_walkthrough",
    title: "api.nemesis 守门片段",
    sourceFilePath: "app/routes/api.nemesis.ts",
    code: SNIPPETS.apiNemesisAuth,
    highlights: [
      {
        lineStart: 1,
        lineEnd: 2,
        label: "登录守门",
        explanation: "requireNemesisUser 是第一道门，失败直接返回 Response。",
      },
    ],
  },
  {
    type: "example",
    title: "失败案例：先调 AI 再限流",
    scenario: "AI 生成的伪代码把 callNemesisModel 放在 checkNemesisRateLimit 之前",
    code: `const reply = await callNemesisModel(...);
const limit = await checkNemesisRateLimit(user);`,
    explanation: "这会让恶意或误触请求在限流前消耗模型配额。",
  },
  {
    type: "checkpoint",
    title: "主动回忆",
    prompt: "未登录 POST /api/nemesis 时，会不会进入 validateNemesisRequest？",
  },
];

export function nemesisChainQuestions(): Q[] {
  return [
    q({
      type: "single_choice",
      title: "Nemesis API 方法",
      prompt: "api.nemesis.ts 对非 POST 请求应如何处理？",
      options: [
        { id: "a", text: "返回 405 Method Not Allowed" },
        { id: "b", text: "当作 GET 返回历史消息" },
        { id: "c", text: "重定向到 /chat" },
        { id: "d", text: "忽略并继续" },
      ],
      correctAnswer: { choiceId: "a" },
      explanation: { short: "资源路由只处理 POST。", realProjectNote: "api.nemesis.ts" },
      abilityTags: ["bridge.reactRouter.action"],
      orderIndex: 0,
    }),
    q({
      type: "multi_choice",
      title: "调用模型前的守门",
      prompt: "callNemesisModel 之前必须完成哪些检查？（多选）",
      options: [
        { id: "auth", text: "requireNemesisUser" },
        { id: "valid", text: "validateNemesisRequest" },
        { id: "rate", text: "checkNemesisRateLimit" },
        { id: "theme", text: "getTheme" },
      ],
      correctAnswer: { choiceIds: ["auth", "valid", "rate"] },
      explanation: { short: "先身份、再字段、再限流。", realProjectNote: SNIPPETS.apiNemesisChain },
      abilityTags: ["backend.auth.required", "backend.rateLimit"],
      orderIndex: 1,
    }),
    q({
      type: "sort",
      title: "api.nemesis 服务端顺序",
      prompt: "排列 Nemesis action 关键步骤：",
      sortItems: [
        { id: "1", text: "requireNemesisUser", title: "登录", category: "backend" },
        { id: "2", text: "validateNemesisRequest", title: "校验", category: "backend" },
        { id: "3", text: "checkNemesisRateLimit", title: "限流", category: "backend" },
        { id: "4", text: "guardNemesisMessage", title: "内容审查", category: "ai" },
        { id: "5", text: "callNemesisModel / SSE", title: "模型", category: "ai" },
      ],
      correctAnswer: { itemIds: ["1", "2", "3", "4", "5"] },
      explanation: { short: "守门顺序错误会泄密或浪费算力。", realProjectNote: "api.nemesis.ts" },
      abilityTags: ["backend.auth.required"],
      orderIndex: 2,
    }),
    q({
      type: "fill_blank",
      title: "未登录响应文案",
      prompt: "补全未登录时的错误提示：",
      code: `return json({ error: "{{msg}}" }, { status: error.status });`,
      blanks: [
        {
          id: "msg",
          placeholder: "提示文案",
          acceptedAnswers: ["请先登录后再使用 Nemesis。", "请先登录后再使用 Nemesis"],
        },
      ],
      correctAnswer: { values: { msg: "请先登录后再使用 Nemesis。" } },
      explanation: { short: "401 需要明确中文提示。", realProjectNote: SNIPPETS.apiNemesisAuth },
      abilityTags: ["backend.auth.required"],
      orderIndex: 3,
    }),
    q({
      type: "debug",
      title: "先调 AI 再限流",
      prompt: "以下顺序的问题是什么？",
      code: `const reply = await callNemesisModel(...);
const limit = await checkNemesisRateLimit(user);
if (!limit.allowed) return json({ error: "限流" }, { status: 429 });`,
      debugMeta: { suspiciousLineStart: 1, suspiciousLineEnd: 1 },
      options: [
        { id: "order", text: "限流应在模型调用之前" },
        { id: "ok", text: "顺序无所谓" },
        { id: "cookie", text: "cookie 未设置" },
        { id: "sse", text: "SSE 断流" },
      ],
      correctAnswer: { issueId: "order" },
      explanation: {
        short: "限流是廉价守门，必须早于 AI。",
        realProjectNote: "真实项目在 validate 之后、模型之前限流。",
      },
      abilityTags: ["backend.rateLimit", "ai.review.architecture"],
      orderIndex: 4,
    }),
    q({
      type: "branch_trace",
      title: "未登录 POST 分支",
      prompt: "未登录 POST /api/nemesis 的路径：",
      branchScenario: "POST /api/nemesis，无 session",
      options: [
        { id: "post", text: "收到 POST" },
        { id: "auth", text: "requireNemesisUser 抛出 Response" },
        { id: "401", text: "返回请先登录 JSON，不进入校验/限流/模型" },
      ],
      correctAnswer: { pathIds: ["post", "auth", "401"] },
      explanation: { short: "登录是第一道门。", realProjectNote: SNIPPETS.apiNemesisAuth },
      abilityTags: ["backend.auth.required"],
      orderIndex: 5,
    }),
    q({
      type: "position_judgement",
      title: "限流逻辑应放哪",
      prompt: "Nemesis 限流检查最应该放在哪？",
      options: [
        { id: "action", text: "api.nemesis.ts action 内，模型调用前", locationHint: "routes/api.nemesis.ts" },
        { id: "client", text: "useNemesisChat 里 if 一下", locationHint: "client hook" },
        { id: "css", text: "tailwind.config", locationHint: "config" },
        { id: "root", text: "root loader", locationHint: "app/root.tsx" },
      ],
      correctAnswer: { positionId: "action" },
      explanation: { short: "服务端必须独立守门。", realProjectNote: "客户端隐藏按钮不等于安全。" },
      abilityTags: ["code.position.handler", "backend.rateLimit"],
      orderIndex: 6,
    }),
    q({
      type: "ai_review",
      title: "AI 生成无守门 API",
      prompt: "AI 生成的聊天 API 直接 callNemesisModel，无登录与限流。可上线吗？",
      code: `export async function action({ request }) {
  const body = await request.json();
  return callNemesisModel(body.message);
}`,
      options: [
        { id: "bad", text: "不可：缺 auth、校验、限流与错误映射" },
        { id: "ok", text: "可以：内网使用" },
      ],
      correctAnswer: {
        choiceId: "bad",
        riskIds: ["missing_session", "missing_validation", "missing_rate_limit"],
      },
      aiReviewMeta: { riskTypeOptions: AI_RISK },
      explanation: {
        short: "服务端必须独立守门。",
        aiReviewNote: "看似能跑通，实际任何人可打穿到模型层。",
        realProjectNote: "对照 api.nemesis.ts 完整链。",
      },
      abilityTags: ["ai.review.architecture"],
      orderIndex: 7,
    }),
  ];
}
