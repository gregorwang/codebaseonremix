/**
 * Real questions for site-20-d1-errors-capstone / error-mapping.
 *
 * Anchor: remix/app/hooks/useNemesisChat.client.ts (DEFAULT_ERROR_MESSAGE + setError
 *          + 错误文案映射表 + 上游 / 网络 / 表单错误分类).
 * 学习目标: 客户端错误处理,技术错误 → 用户文案,DEFAULT_ERROR_MESSAGE 默认兜底,
 * catch 中 instanceof Error / fetch Response 区分.
 *
 * 题目数: 22.
 *
 * 引用 recipe: nemesisProviderErrorSwallow (§11.3-5 错误吞没丢失证据).
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { nemesisProviderErrorSwallow } from "../recipes";

const PRIMARY = "app/hooks/useNemesisChat.client.ts";
const CHAT_API = "app/lib/nemesis-chat-api.client.ts";
const SSE_CLIENT = "app/lib/nemesis-sse.client.ts";
const TOUCHED = [PRIMARY, CHAT_API, SSE_CLIENT];

export const errorMappingQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 DEFAULT_ERROR_MESSAGE",
    prompt: "DEFAULT_ERROR_MESSAGE = ?",
    options: [
      { id: "A", text: "'上游模型服务暂时繁忙，稍后重试通常可以恢复。' — 上游不可用时通用兜底" },
      { id: "B", text: "'出错了。'" },
      { id: "C", text: "空字符串" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "DEFAULT_ERROR_MESSAGE = '上游模型服务暂时繁忙，稍后重试通常可以恢复。'",
      detail: "useNemesisChat.client.ts L24: 模块顶层常量. 兜底场景: (1) SSE error 事件带 message 但被 catch 吞掉; (2) requestNemesisReply 抛非 Error; (3) 用户网络断. 文案故意乐观 — '通常可以恢复' 让用户有 retry 意愿, 同时不暴露内部 provider / status.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 useNemesisChat 错误状态",
    prompt: "错误状态保存在哪个 state?",
    options: [
      { id: "A", text: "useState<string | null>(null), error, setError — 顶层 useState 维护" },
      { id: "B", text: "useRef" },
      { id: "C", text: "localStorage" },
      { id: "D", text: "URL hash" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "useState<string | null>(null) 保存 error, setError(null) 清除.",
      detail: "L33: const [error, setError] = useState<string | null>(null). 单一字符串: 一次只显示一个错误. 每次 sendMessage / submitFeedback 开始前 setError(null) 清除, catch 中 setError(message). UI 通过 error 状态控制 toast / inline 错误条.",
    },
    abilityTags: ["frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 sendMessage 错误捕获",
    prompt: "sendMessage (L180-231) 的 catch 块?",
    options: [
      { id: "A", text: "catch (err) { setError(err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE); } finally { setIsLoading(false); setRequestStage(null); }" },
      { id: "B", text: "let crash" },
      { id: "C", text: "window.alert(err.message)" },
      { id: "D", text: "throw 出去" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "instanceof Error 取 message, 否则用 DEFAULT_ERROR_MESSAGE; finally 必清 loading.",
      detail: "L223-228: 三步 — (1) instanceof 守卫防止 string 错误 (2) DEFAULT_ERROR_MESSAGE 兜底 (3) finally 无论成功失败都 setIsLoading(false) + setRequestStage(null). finally 缺一会让按钮卡在 disabled, 用户重复点击.",
    },
    abilityTags: ["frontend.state.local", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q4 复制失败错误",
    prompt: "copyMessage (L333-337) 失败时?",
    options: [
      { id: "A", text: "navigator.clipboard.writeText(...).catch(() => setError('复制失败，请手动选择文本。')) — 静默失败时给用户提示" },
      { id: "B", text: "无处理" },
      { id: "C", text: "throw" },
      { id: "D", text: "弹窗" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "clipboard 写失败时 setError 提示, 不让用户感觉无反应.",
      detail: "L334-336: clipboard API 在非安全上下文或权限被拒时 throw. catch 中给具体文案 '复制失败，请手动选择文本。' — 既不暴露内部 error.message (可能含技术信息), 又给用户可操作建议.",
    },
    abilityTags: ["frontend.event.click", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q5 submitFeedback 错误路径",
    prompt: "submitFeedback (L288-331) catch 中错误文案?",
    options: [
      { id: "A", text: "setError(err instanceof Error ? err.message : '反馈提交失败，请稍后重试。')" },
      { id: "B", text: "window.alert" },
      { id: "C", text: "throw 出去" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "feedback 提交失败用 err.message 或固定 '反馈提交失败，请稍后重试。'",
      detail: "L324-326: 与 sendMessage 一致模式 — instanceof Error 优先, 否则固定兜底. feedback 路由的 JSON error body 有 { error: '请求格式错误。' } 等用户文案, fetch().then(res => res.json()) 抛错或 ok=false 时 message 自然可读, 无需再包装.",
    },
    abilityTags: ["ai.review.architecture", "frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 找不到回复对应问题",
    prompt: "submitFeedback 中 '找不到这条回复对应的用户问题' 错误条件?",
    options: [
      { id: "A", text: "messageIndex <= 0 (无前序) 或 previousUserMessage.role !== 'user' (前序不是 user) — 数据结构不合法" },
      { id: "B", text: "网络错误" },
      { id: "C", text: "权限" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "feedback 锚定 '回复前一条必须是 user', 否则视作非法状态.",
      detail: "L294-303: 双重守卫 — messageIndex 必须 > 0 (有前序), 且前一条 role === 'user'. 任何一项不满足直接 setError + return, 不打 audit. 这防止 AI 改坏 (在 assistant 前塞 system) 或 localStorage 篡改导致 audit 锚定到错对话.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  // ─── 代码阅读 (Q7-Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: DEFAULT_ERROR_MESSAGE 引用",
    prompt: "下面哪一行展示了 'err 非 Error 实例时降级到 DEFAULT_ERROR_MESSAGE' 的关键?",
    code: `1 const DEFAULT_ERROR_MESSAGE = "上游模型服务暂时繁忙，稍后重试通常可以恢复。";
2
3 export function useNemesisChat() {
4   const [error, setError] = useState<string | null>(null);
5
6   const sendMessage = useCallback(async (messageToSend) => {
7     try {
8       const answer = await requestNemesisReply(message, history, setRequestStage);
9     } catch (err) {
10      setError(err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE);
11    } finally {
12      setIsLoading(false);
13      setRequestStage(null);
14    }
15  });`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "const DEFAULT_ERROR_MESSAGE = '上游模型服务暂时繁忙，稍后重试通常可以恢复。';" },
      { id: "L10", lineNumber: 10, text: "setError(err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE);" },
      { id: "L13", lineNumber: 13, text: "setRequestStage(null);" },
    ],
    correctAnswer: { lineId: "L10" },
    explanation: {
      short: "L10: instanceof Error 三元, 拿不到 message 时降级 DEFAULT_ERROR_MESSAGE.",
      detail: "L1 是常量定义. L10 是关键 — 当上游 fetch reject 的是 string / null / undefined (非 Error 子类), err.message 访问会 undefined, UI 看到 'undefined' 没意义. DEFAULT_ERROR_MESSAGE 是乐观兜底, 给用户可读文案 + retry 暗示.",
    },
    abilityTags: ["ai.review.architecture", "frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q8 setError 触发位置",
    prompt: "setError 触发的位置? (多选)",
    options: [
      { id: "A", text: "sendMessage catch (L223)" },
      { id: "B", text: "regenerateResponse catch (L268)" },
      { id: "C", text: "submitFeedback catch (L325)" },
      { id: "D", text: "submitFeedback 找不到前序 user (L296-303)" },
      { id: "E", text: "copyMessage clipboard 失败 (L336)" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D", "E"] },
    explanation: {
      short: "5 处 setError: sendMessage / regenerate / submit / 找不到前序 / copy 失败.",
      detail: "全部 5 处都是异常路径, 触发点不同: 3 个是网络/上游错误 (用 err.message 优先), 1 个是数据完整性错误 (固定文案), 1 个是浏览器 API 失败 (固定文案). 没有 setError 在 success 路径, 保证 error 是真正的错误状态.",
    },
    abilityTags: ["ai.review.architecture", "frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q9 反馈提交兜底文案",
    prompt: "submitFeedback catch (L325) 中, 当 err 不是 Error 实例时, 错误文案是 ___.",
    options: [],
    correctAnswer: { values: { v: "反馈提交失败，请稍后重试。" } },
    blanks: [{ id: "v", placeholder: "中文文案", acceptedAnswers: ["反馈提交失败，请稍后重试。", "反馈提交失败"] }],
    explanation: {
      short: "feedback 兜底: '反馈提交失败，请稍后重试。'",
      detail: "与 sendMessage 的 DEFAULT_ERROR_MESSAGE 不同, submitFeedback 显式写了固定文案. 这是因为: (1) feedback 通常是 fetch 失败 (网络 / 401 / 500), err.message 通常可读; (2) 兜底只覆盖 'err 是 string / null' 等非典型场景, 文案直接说'反馈'更准确.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q10 错误清除时机",
    prompt: "setError(null) 在哪些路径?",
    options: [
      { id: "A", text: "sendMessage 开始 (L204) / regenerateResponse (L255) / submitFeedback (L307) / openFeedback (L285) — 每次新操作前清" },
      { id: "B", text: "从不" },
      { id: "C", text: "componentWillUnmount" },
      { id: "D", text: "useEffect" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "4 个动作开始前显式 setError(null), 保证新错误覆盖旧错误.",
      detail: "L204 / L255 / L307 / L285: 4 个 '新动作开始' 路径都先 setError(null). 设计上: 上次失败不应污染下次交互, 用户点'新对话' / '重新生成' 时旧 toast 自动消失. 这是 UX 细节, 但缺一会让用户疑惑'之前的错还在不在'.",
    },
    abilityTags: ["frontend.state.local", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q11 typingMessageId 状态关联",
    prompt: "typingMessageId 与 error 关系?",
    options: [
      { id: "A", text: "sendMessage 成功 → setTypingMessageId(assistantMessage.id) 启动打字动画; catch 不清 typingMessageId 但 setIsLoading(false) + setRequestStage(null)" },
      { id: "B", text: "无关联" },
      { id: "C", text: "同时清" },
      { id: "D", text: "自动清" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "成功路径才设 typingMessageId; catch 不动它, 用户继续看打字动画直到手动结束.",
      detail: "L221-228: 成功流 — setMessages(answeredMessages) + setTypingMessageId(assistant.id) + scrollToBottom. 失败流 — setError 提示, 但不 clear typingMessageId (它本来就是 null, 因为成功才设). 实际效果: 错误时 UI 没有半截打字动画, 干净错误条.",
    },
    abilityTags: ["frontend.state.local", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  // ─── 状态推理 (Q12-Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 sendMessage 失败完整路径",
    prompt: "用户发送消息, 上游返回 5xx. 客户端路径?",
    options: [
      { id: "send", text: "sendMessage 触发" },
      { id: "loading", text: "setIsLoading(true) + setRequestStage(initial)" },
      { id: "request", text: "await requestNemesisReply throw (fetch reject / Response !ok)" },
      { id: "catch", text: "catch (err): setError(err.message ?? DEFAULT_ERROR_MESSAGE)" },
      { id: "finally", text: "finally: setIsLoading(false) + setRequestStage(null)" },
      { id: "ui", text: "UI: 错误条显示 + 按钮恢复可点 + 输入框保留 (因为 setInputMessage 在 try 开头已清)" },
    ],
    correctAnswer: { pathIds: ["send", "loading", "request", "catch", "finally", "ui"] },
    explanation: {
      short: "send → loading → request throw → catch setError → finally clear loading → UI 错误条.",
      detail: "完整路径. 注意 finally 顺序保证 loading 状态先清, 用户才能再次点; setError 触发错误条 UI. 输入框在 L203 setInputMessage(\"\") 已清, 用户可立即重输, 不会被旧 message 干扰.",
    },
    abilityTags: ["ai.review.architecture", "frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, CHAT_API],
  }),
  q({
    type: "branch_trace",
    title: "Q13 regenerateResponse 失败恢复原状",
    prompt: "用户点重新生成, 上游失败. 路径?",
    options: [
      { id: "reg", text: "regenerateResponse 触发" },
      { id: "commit", text: "commitMessages([...beforeRegenerate, ...following]) — 先把原回复 + 后续保留" },
      { id: "loading", text: "setIsLoading(true) + setRequestStage(initial)" },
      { id: "request", text: "await requestNemesisReply throw" },
      { id: "catch", text: "commitMessages([...beforeRegenerate, previousAssistantMessage, ...following]) + setError" },
      { id: "finally", text: "finally: setIsLoading(false) + setRequestStage(null)" },
    ],
    correctAnswer: { pathIds: ["reg", "commit", "loading", "request", "catch", "finally"] },
    explanation: {
      short: "reg → commit 旧顺序 → loading → 失败 → commit 恢复原 assistant → finally.",
      detail: "regenerate 失败时把原 assistant 重新插入 messages, 恢复用户原本看到的对话. 这与 sendMessage 不同 — send 失败没有可恢复的旧消息, regenerate 失败有, 必须放回. 否则用户点重试就'消息消失了', 是灾难性 UX.",
    },
    abilityTags: ["ai.review.architecture", "frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q14 错误暴露原则",
    prompt: "错误映射的核心原则?",
    options: [
      { id: "A", text: "技术错误 → 友好文案, 不暴露 provider / status / stack; 用户能 retry 的给暗示, 结构性错误的给具体动作" },
      { id: "B", text: "直接显示 raw error.message" },
      { id: "C", text: "全部 '出错了'" },
      { id: "D", text: "无原则" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "三原则: 不暴露内部 / 给 retry 暗示 / 结构性错误给具体动作.",
      detail: "DEFAULT_ERROR_MESSAGE '通常可以恢复' 是 retry 暗示. '找不到这条回复对应的用户问题' 是结构性错误 + 具体动作 (让用户重选). '请先登录后再提交反馈' 是结构性 + 引导. raw error.message 会被攻击者用来探测系统, 全'出错了'让用户无 retry 意愿.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q15 SSE error 事件与 catch 关系",
    prompt: "requestNemesisReply 内 SSE 收到 error 事件时, 与外层 catch 关系?",
    options: [
      { id: "A", text: "SSE 客户端解析到 error 事件就 throw Error(message), 让外层 catch 走 setError; 上层不需要知道 SSE 协议" },
      { id: "B", text: "SSE 客户端 console.log 后继续" },
      { id: "C", text: "SSE 客户端吞掉" },
      { id: "D", text: "SSE 客户端 alert" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE 错误事件通过 throw 冒泡到外层 catch, 协议层对调用方不可见.",
      detail: "requestNemesisReply 是 CHAT_API 抽象, 它内部把 SSE 'event: error' 转成 throw Error(message). useNemesisChat 不感知 SSE 协议存在, 只看到 await 抛错. 关注点分离: 协议层 (CHAT_API / SSE_CLIENT) 翻译, UI 层 (useNemesisChat) 统一 catch.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: CHAT_API,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  // ─── AI 改坏 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把 setError(err.message) 去掉兜底",
    prompt: "AI 改坏: AI 把 setError(err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE) 改成 setError(err.message). 后果是?",
    options: [
      { id: "A", text: "err 是 string / null / undefined 时 UI 显示 'undefined' 或 'null', 完全没有兜底" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "缺 instanceof 守卫 + 兜底文案, 错误状态会显示 undefined / null.",
      detail: "fetch().catch(reject) 在网络断开 / CORS / 解析失败时 reject 的可能不是 Error 子类 (例如部分 fetch polyfill reject string). 访问 .message 会得到 undefined. UI 把 undefined setState 后, 错误条渲染 'undefined' 字面量, 用户困惑, ops 排查难.",
    },
    abilityTags: ["ai.review.architecture", "frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户看到 'undefined' / 'null' 错误条, 不知道是网络问题还是系统问题, retry 意愿大幅下降.",
    aiReviewRisk: "把 'err.message' 当成总存在, 忽略 reject 的多态性.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, err 类型是 unknown, message 访问不报错.",
      C: "简洁 = 缺兜底, 鲁棒性下降.",
      D: "生产环境会出 'undefined' UI.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把错误文案全部改成 '出错了请重试'",
    prompt: "AI 改坏: AI 觉得 '错误文案太多', 把所有 setError 统一改成 '出错了，请重试。'. 后果是?",
    options: [
      { id: "A", text: "丢失差异化: 复制失败 / 找不到前序 / 上游繁忙 全部变成同一文案, 用户无法判断, retry 率下降" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更统一" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "错误文案必须差异化, 上下文决定可操作建议.",
      detail: "复制失败 → '复制失败，请手动选择文本。' 给具体动作; 找不到前序 → '找不到这条回复对应的用户问题，无法提交反馈。' 解释原因; 上游繁忙 → '上游模型服务暂时繁忙，稍后重试通常可以恢复。' 给乐观暗示. 全统一成'出错了请重试'等于剥夺用户的诊断线索, 任何错误都让用户怀疑系统崩溃.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户每次错误都怀疑站点崩了, 实际是 copy 权限问题, 不会去手动复制.",
    aiReviewRisk: "把'统一'当成设计目标, 忽略错误文案的诊断价值.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "统一 ≠ 有用, 文案要有上下文.",
      D: "用户感知降级明显.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 引用 §11.3-5 错误吞没丢失证据 (客户端版本)",
    prompt: "AI 改坏: AI 觉得 '用户看 raw 错误更好', 把 setError(err.message) 不再做 instanceof 守卫, 把网络 raw error (含 'TypeError: Failed to fetch' 等技术信息) 直接展示. 后果是?",
    options: [
      { id: "A", text: "用户看到 'TypeError: Failed to fetch' 等技术栈信息, 体验差, 也暴露内部实现; 真实诊断信息应该留在 console / Sentry, UI 给可读文案" },
      { id: "B", text: "更准确" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "raw error.message 是给开发者的, UI 必须用友好文案; 证据留在服务端日志.",
      detail: "Sentry / console / 服务端日志才是诊断证据, 用户不应该看到 stack-like 字符串. 把 'TypeError: Failed to fetch' 展示给用户: (1) 体验差 (技术 jargon); (2) 暴露内部 (可能让攻击者知道 fetch 用了什么); (3) 不可操作 (用户不知道该怎么办). 正确: UI 用 DEFAULT_ERROR_MESSAGE, 真实 stack 进 console / Sentry.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户看到 'TypeError: NetworkError when attempting to fetch resource.', 以为是编程语言, 怀疑系统很 low.",
    aiReviewRisk: "把 '准确' 当成 UI 错误文案的唯一目标, 忽略可读性 + 暴露风险.",
    wrongAnswerFeedback: {
      B: "准确 = 不可读 + 暴露, 不是 UI 目标.",
      C: "TS 不会报错.",
      D: "用户体验受重伤.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 AI 把 setError(null) 全部去掉",
    prompt: "AI 改坏: AI 觉得 'setError(null) 太多冗余', 在 4 个动作开始前都不清 error. 后果是?",
    options: [
      { id: "A", text: "上次错误持续显示, 用户点'新对话'时旧错误条还在, 体验混乱, retry 意愿下降" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "新动作开始前清旧 error 是 UX 纪律, 删了用户被旧错误打扰.",
      detail: "L204 / L255 / L307 / L285 的 setError(null) 是隐式承诺: '你刚刚做新动作了, 旧错误作废'. 删了以后: 用户上一次 send 失败, 错误条一直挂着, 用户切 session / 重新生成 / 反馈时还看到 5 分钟前的 '上游繁忙' 文案, 困惑'我现在是在 retry 吗'.",
    },
    abilityTags: ["frontend.state.local", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
    realWorldImpact: "用户切到新 session 看到旧错误, 怀疑两个 session 串台, 实际是 useState 没清.",
    aiReviewRisk: "把 setError(null) 当成'可以省', 忽略它是隐式 UX 承诺.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "省略状态清理是 UX bug.",
      D: "用户感知混乱.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q20 引用 §11.3-5 错误吞没丢失证据 (服务端版本)",
    prompt: nemesisProviderErrorSwallow({
      lessonSlug: "error-mapping",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 19,
      primaryFile: PRIMARY,
    }).prompt,
    options: nemesisProviderErrorSwallow({
      lessonSlug: "error-mapping",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 19,
      primaryFile: PRIMARY,
    }).options,
    correctAnswer: nemesisProviderErrorSwallow({
      lessonSlug: "error-mapping",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 19,
      primaryFile: PRIMARY,
    }).correctAnswer,
    explanation: nemesisProviderErrorSwallow({
      lessonSlug: "error-mapping",
      courseSlug: "site-20-d1-errors-capstone",
      orderIndex: 19,
      primaryFile: PRIMARY,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: TOUCHED,
    realWorldImpact: "线上 5xx 排查时只能看到 '出错了' / 'undefined', ops 无法分辨 Gemini 429 / DeepSeek 401 / 网络抖动 / 守门 audit 失败.",
    aiReviewRisk: "把错误处理当成 '用户体验优化', 破坏生产可观测性.",
    wrongAnswerFeedback:
      nemesisProviderErrorSwallow({
        lessonSlug: "error-mapping",
        courseSlug: "site-20-d1-errors-capstone",
        orderIndex: 19,
        primaryFile: PRIMARY,
      }).wrongAnswerFeedback ?? {},
  }),
  // ─── 自由作答 (Q21-Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释客户端错误映射的纪律",
    prompt: "用自己的话说明 (1) 错误状态必须 string | null (2) instanceof Error 守卫 + DEFAULT_ERROR_MESSAGE 兜底 (3) 4 个新动作开始前 setError(null) (4) 错误文案分三类: 网络/上游/数据完整性. 这 4 点如何共同保证错误 UX 鲁棒.",
    options: [],
    correctAnswer: {
      text: "客户端错误映射的 4 条纪律: (1) string | null 单值: 一次只显示一个错误, UI 简单且无冲突; (2) instanceof Error 守卫 + DEFAULT_ERROR_MESSAGE 兜底: 防止 'undefined' 错误条, 给乐观 retry 暗示; (3) 4 个 setError(null) 时机 (sendMessage / regenerate / submit / openFeedback): 新动作开始前清旧错误, 旧 toast 不污染新交互; (4) 错误文案三类: 网络/上游 (err.message 优先) / 数据完整性 (固定文案 + 解释原因) / 浏览器 API 失败 (固定文案 + 引导动作). 4 条合起来保证: 用户看到的永远是 1 个具体可操作错误, 不会被旧错误打扰, 也不会看到 'undefined' / '出错了'.",
    },
    explanation: {
      short: "四条共同保证错误 UX 鲁棒: 单一 / 兜底 / 清旧 / 分类.",
      detail: "好的解释能联起 (1) 状态形状 (2) 类型守卫 (3) 清旧纪律 (4) 文案分类. 任何一条破坏都让错误 UX 退步.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 setError(err.message) 改成 setError(err.message.toString()). 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "err.message.toString() 强转 string 在 err 是 string 时会变 'str', 但当 err 是 null / undefined 时抛 TypeError, UI 状态变 undefined / 抛错. 应保留 'err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE' 三元 + 兜底文案, 这是客户端错误处理纪律. 强转 toString() 不解决类型不确定问题, 反而引入新 throw 路径.",
    },
    explanation: {
      short: "审查点: instanceof 守卫 + DEFAULT_ERROR_MESSAGE 兜底, 不能用 toString 替代.",
      detail: "好的 review 指出 (1) toString 在 null/undefined 时抛错 (2) instanceof 守卫解决类型多态 (3) 兜底文案是 UX 鲁棒性 (4) 给出明确保留.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
];
