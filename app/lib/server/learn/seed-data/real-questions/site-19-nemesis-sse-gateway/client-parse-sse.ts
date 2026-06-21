/**
 * Real questions for site-19-nemesis-sse-gateway / client-parse-sse.
 *
 * Anchor: 客户端 SSE 解析与消费.
 *   app/hooks/useNemesisChat.client.ts (primary)
 *   app/lib/nemesis-sse.client.ts (secondary)
 *   app/lib/nemesis-chat-api.client.ts (touched)
 *
 * 学习目标: 理解客户端如何消费 SSE 流: fetch → reader → TextDecoder →
 *   事件边界检测 → 按 event 名路由 → UI 状态更新, 以及常见 AI 改坏模式.
 *
 * 题目数: 22.
 *
 * 引用 recipe: tsServerImportInClient (§12.2-TS-3) + reactUseEffectMissingDep
 *   (§19.2-1) + tsSseEventWiden (§12.2-TS-4) + reactSubmitDomDisabledOnly
 *   (§19.2-3) + nemesisLocalStorageUntrusted (§11.3-7).
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import {
  nemesisLocalStorageUntrusted,
  reactSubmitDomDisabledOnly,
  reactUseEffectMissingDep,
  tsServerImportInClient,
  tsSseEventWiden,
} from "../recipes";

const PRIMARY = "app/hooks/useNemesisChat.client.ts";
const SECONDARY = "app/lib/nemesis-sse.client.ts";
const API_CLIENT = "app/lib/nemesis-chat-api.client.ts";
const TOUCHED = [PRIMARY, SECONDARY, API_CLIENT];

const RECIPE_CTX = {
  lessonSlug: "client-parse-sse",
  courseSlug: "site-19-nemesis-sse-gateway",
  orderIndex: 0,
};

export const clientParseSseQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 fetch 关键配置",
    prompt: "requestNemesisStream 中对 /api/nemesis 发起 fetch 时, 哪些配置必须同时出现?",
    options: [
      { id: "A", text: "method: POST + headers Content-Type + Accept: text/event-stream + body JSON.stringify({ message, recentMessages })" },
      { id: "B", text: "method: GET" },
      { id: "C", text: "FormData body" },
      { id: "D", text: "无 headers" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "POST + Content-Type + Accept text/event-stream + JSON body 缺一不可.",
      detail: "SECONDARY L162-172: method: POST 提交用户消息; Content-Type 声明 JSON body; Accept: text/event-stream 提示服务端走 SSE 分支; body 携带 message + recentMessages. 缺 Accept 服务端可能返回 JSON; 缺 POST 命中不了 action; 缺 Content-Type 服务端无法 parse body.",
    },
    abilityTags: ["bridge.reactRouter.action", "ai.review.architecture"],
    sourceFilePath: SECONDARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 response.body.getReader",
    prompt: "response.body?.getReader() 的作用与必要性?",
    options: [
      { id: "A", text: "获取 ReadableStreamDefaultReader, 逐块读取流; 不存在则抛错说明服务端未返回流式响应" },
      { id: "B", text: "压缩响应体" },
      { id: "C", text: "解析 JSON" },
      { id: "D", text: "无作用" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "getReader() 拿到 reader 才能逐块消费流, 否则只能等完整下载.",
      detail: "SECONDARY L99-102: const reader = response.body?.getReader(); if (!reader) throw new Error(...). 这是 Fetch API 的 ReadableStream 消费入口. 没有 reader, fetch 只能等 response 完全下载后再处理, 失去流式意义. 判空抛错是因为服务端可能返回非流式错误页.",
    },
    abilityTags: ["frontend.effect.useEffect", "ai.review.architecture"],
    sourceFilePath: SECONDARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "single_choice",
    title: "Q3 TextDecoder stream:true",
    prompt: "decoder.decode(value, { stream: true }) 中 stream: true 的作用?",
    options: [
      { id: "A", text: "允许传入不完整 UTF-8 字节序列, decoder 会保留尾部不完整字符供下次解码" },
      { id: "B", text: "开启网络流" },
      { id: "C", text: "压缩数据" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "stream: true 让 decoder 处理跨 chunk 的多字节字符分片.",
      detail: "SECONDARY L104 + L114: TextDecoder 默认要求完整字节序列. stream: true 告诉它'还有更多 chunk 要来', 如果当前 chunk 末尾是截断的 UTF-8 多字节字符(如中文字符跨两个 chunk), decoder 会保留尾部字节下次拼接. 没有这个 flag, 跨 chunk 的中文字会变成乱码.",
    },
    abilityTags: ["frontend.effect.useEffect", "ai.review.architecture"],
    sourceFilePath: SECONDARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "single_choice",
    title: "Q4 SSE 事件边界",
    prompt: "readNemesisSseResponse 中, 如何判断一个 SSE 事件块已经完整到达?",
    options: [
      { id: "A", text: "buffer.indexOf('\\n\\n') !== -1" },
      { id: "B", text: "value.length > 0" },
      { id: "C", text: "done === true" },
      { id: "D", text: "JSON.parse 成功" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "\\n\\n 是 SSE 协议规定的事件边界.",
      detail: "SECONDARY L116: let boundary = buffer.indexOf('\\n\\n'). SSE 协议规定每个事件块以两个换行结束. 单个 \\n 可能出现在 data 内部(如多行 JSON), 只有 \\n\\n 才是可靠边界. 没有边界检测, 两个事件会粘在一起被当成一个 parse, 导致 JSON 解析失败或事件丢失.",
    },
    abilityTags: ["frontend.effect.useEffect", "ai.review.architecture"],
    sourceFilePath: SECONDARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "single_choice",
    title: "Q5 按 event 名路由",
    prompt: "parseSseBlock 解析出 event 和 data 后, readNemesisSseResponse 如何分发?",
    options: [
      { id: "A", text: "event === 'status' → handlers.onStatus; 'done' → handlers.onDone; 'error' → handlers.onError" },
      { id: "B", text: "全部走 handlers.onDone" },
      { id: "C", text: "全部 alert" },
      { id: "D", text: "忽略 event 字段" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "按 event 字段路由到三个不同 handler, 职责分离.",
      detail: "SECONDARY L124-133: status → applyStatusToProgress → setRequestStage 进度条更新; done → resolve Promise → setMessages + setTypingMessageId 打字机动画; error → reject Promise → setError 错误提示. 不分路由则所有事件混为一谈, UI 无法区分进度/结果/错误.",
    },
    abilityTags: ["frontend.effect.useEffect", "frontend.state.local"],
    sourceFilePath: SECONDARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 setRequestStage 回调链路",
    prompt: "onStatus 回调从 readNemesisSseResponse 经过哪些层最终更新 UI 进度条?",
    options: [
      { id: "A", text: "readNemesisSseResponse → requestNemesisStream callbacks → requestNemesisReply onProgress → useNemesisChat setRequestStage" },
      { id: "B", text: "直接修改 DOM" },
      { id: "C", text: "写 localStorage" },
      { id: "D", text: "无链路" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "三层透传: SSE 解析层 → stream 包装层 → hook 状态层.",
      detail: "SECONDARY L127: handlers.onStatus?.(statusEvent, progress). API_CLIENT L22-26: requestNemesisStream 的 onStatus 回调调用 onProgress(progress). PRIMARY L215: requestNemesisReply 的 onProgress 就是 setRequestStage. 这是典型的回调透传模式 — 底层不关心 UI, 只 push 事件; 顶层 hook 消费事件更新 React state.",
    },
    abilityTags: ["frontend.effect.useEffect", "frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, SECONDARY, API_CLIENT],
  }),
  // ─── 代码阅读 (Q7-Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: 发起 SSE fetch",
    prompt: "下面哪一行是 '客户端发起 SSE POST 请求' 的关键?",
    code: `1 export async function requestNemesisStream(
2   message: string,
3   recentMessages: Array<{ role: string; text: string }>,
4   callbacks: NemesisStreamCallbacks = {}
5 ): Promise<NemesisStreamResult> {
6   const response = await fetch("/api/nemesis", {
7     method: "POST",
8     headers: {
9       "Content-Type": "application/json",
10      Accept: "text/event-stream",
11    },
12    body: JSON.stringify({
13      message,
14      recentMessages,
15    }),
16  });`,
    options: [],
    linePickLines: [
      { id: "L6", lineNumber: 6, text: 'const response = await fetch("/api/nemesis", {' },
      { id: "L10", lineNumber: 10, text: 'Accept: "text/event-stream",' },
      { id: "L12", lineNumber: 12, text: "body: JSON.stringify({" },
    ],
    correctAnswer: { lineId: "L6" },
    explanation: {
      short: "L6: fetch POST /api/nemesis 是整个客户端 SSE 消费流的起点.",
      detail: "L6 是发起请求的调用点; L10 的 Accept 头虽然重要, 但它只是请求配置的一部分; L12 的 body 也是配置. 关键行是 fetch 调用本身 — 没有这一行就没有后续的 reader、decoder、事件解析.",
    },
    abilityTags: ["bridge.reactRouter.action", "frontend.effect.useEffect"],
    sourceFilePath: SECONDARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "fill_blank",
    title: "Q8 缓冲区累积",
    prompt: "在 readNemesisSseResponse 中, 每次 reader.read 返回 value 后, 如何把新字节追加到 buffer?",
    options: [],
    correctAnswer: { values: { v: "buffer += decoder.decode(value, { stream: true });" } },
    blanks: [
      {
        id: "v",
        placeholder: "单行代码",
        acceptedAnswers: [
          "buffer += decoder.decode(value, { stream: true });",
          "buffer += decoder.decode(value, {stream: true});",
        ],
      },
    ],
    explanation: {
      short: "buffer += decoder.decode(value, { stream: true }) 是跨 chunk 拼接的核心.",
      detail: "SECONDARY L114: buffer += decoder.decode(value, { stream: true }). 这行代码把新 chunk 解码后的字符串追加到 buffer. 必须带 stream: true, 否则跨 chunk 的 UTF-8 多字节字符会断裂成乱码. 也不能直接 JSON.parse(value), 因为 value 是 Uint8Array 且可能只包含半个事件.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: SECONDARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "line_pick",
    title: "Q9 关键行: 事件边界检测",
    prompt: "下面哪一行是 '检测 SSE 事件是否完整到达' 的关键?",
    code: `1   while (true) {
2     const { done, value } = await reader.read();
3     if (done) {
4       break;
5     }
6
7     buffer += decoder.decode(value, { stream: true });
8
9     let boundary = buffer.indexOf("\\n\\n");
10    while (boundary !== -1) {
11      const block = buffer.slice(0, boundary).trim();
12      buffer = buffer.slice(boundary + 2);`,
    options: [],
    linePickLines: [
      { id: "L3", lineNumber: 3, text: "if (done) {" },
      { id: "L9", lineNumber: 9, text: 'let boundary = buffer.indexOf("\\n\\n");' },
      { id: "L10", lineNumber: 10, text: "while (boundary !== -1) {" },
    ],
    correctAnswer: { lineId: "L9" },
    explanation: {
      short: "L9: indexOf('\\n\\n') 是事件边界检测的起点.",
      detail: "L3 是流结束判断; L10 是处理多个连续事件的循环. L9 是关键 — 它检查 buffer 中是否出现了 SSE 协议规定的事件边界. 没有这一行, 就不知道何时可以把 buffer 切片交给 parseSseBlock.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: SECONDARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "line_pick",
    title: "Q10 关键行: 按 event 路由",
    prompt: "下面哪一行是 '根据 event 名把 SSE 块路由到不同 handler' 的关键分支?",
    code: `1         if (parsed) {
2           if (parsed.event === "status") {
3             const statusEvent = parsed.data as NemesisSseStatusEvent;
4             progress = applyStatusToProgress(progress, statusEvent);
5             handlers.onStatus?.(statusEvent, progress);
6           } else if (parsed.event === "done") {
7             handlers.onDone?.(parsed.data as NemesisSseDoneEvent);
8           } else if (parsed.event === "error") {
9             const payload = parsed.data as { message?: string };
10            handlers.onError?.(payload.message || "Nemesis 暂时无法响应，请稍后再试。");
11          }
12        }`,
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: 'if (parsed.event === "status") {' },
      { id: "L6", lineNumber: 6, text: 'handlers.onDone?.(parsed.data as NemesisSseDoneEvent);' },
      { id: "L10", lineNumber: 10, text: 'handlers.onError?.(payload.message || "Nemesis 暂时无法响应，请稍后再试。");' },
    ],
    correctAnswer: { lineId: "L2" },
    explanation: {
      short: "L2: 第一个 if 分支是 event 路由的起点, 决定走 status / done / error 哪条链路.",
      detail: "L2 是路由分叉点. 虽然 L6 和 L10 也很重要, 但它们只是各自分支的执行体. 没有 L2 的分支判断, 所有事件都会走进 status 分支(或跳过), done/error 永远不会被处理. 这是 '按 event 名 dispatch' 的具体实现.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: SECONDARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "fill_blank",
    title: "Q11 done 后的 UI 状态更新",
    prompt: "useNemesisChat.sendMessage 中, requestNemesisReply resolve 后, 更新消息列表并启动打字动画的两行代码是?",
    options: [],
    correctAnswer: { values: { v: "setMessages(answeredMessages); setTypingMessageId(assistantMessage.id);" } },
    blanks: [
      {
        id: "v",
        placeholder: "两行代码",
        acceptedAnswers: [
          "setMessages(answeredMessages); setTypingMessageId(assistantMessage.id);",
          "setMessages(answeredMessages);\nsetTypingMessageId(assistantMessage.id);",
        ],
      },
    ],
    explanation: {
      short: "setMessages 更新列表, setTypingMessageId 启动打字机动画.",
      detail: "PRIMARY L219-221: setMessages(answeredMessages) 把助手回复加入消息列表; setTypingMessageId(assistantMessage.id) 触发打字机动画状态. 这两步必须在 requestNemesisReply resolve 后执行, 否则用户会在流结束前就看到完整文本, 失去打字机 UX. 它们也是 SSE done 事件与 React UI 的最终连接点.",
    },
    abilityTags: ["frontend.state.local", "frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, API_CLIENT],
  }),
  // ─── 状态推理 (Q12-Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 完整客户端 SSE 消费成功路径",
    prompt: "用户点击发送, 服务端正常流式返回 — 客户端从 fetch 到打字机动画的完整 7 步?",
    options: [
      { id: "1", text: "fetch POST /api/nemesis 并检查 response.ok + Content-Type" },
      { id: "2", text: "reader = response.body.getReader()" },
      { id: "3", text: "decoder.decode(value, { stream: true }) 追加到 buffer" },
      { id: "4", text: "buffer.indexOf('\\n\\n') 发现完整事件块" },
      { id: "5", text: "parseSseBlock 提取 event/data, 按 status/done/error 路由" },
      { id: "6", text: "status → applyStatusToProgress → setRequestStage; done → resolve Promise" },
      { id: "7", text: "setMessages(answeredMessages) + setTypingMessageId(id) 启动打字机动画" },
    ],
    correctAnswer: { pathIds: ["1", "2", "3", "4", "5", "6", "7"] },
    explanation: {
      short: "7 步: fetch → reader → decode → 边界 → parse → dispatch → UI.",
      detail: "完整 happy path. 任何一步失败都会提前退出: fetch 失败 → catch setError; reader 不存在 → throw; 无边界 → 继续读; parse 失败 → null 跳过; 无 done → 流结束 reject. 只有 7 步全部走完, 用户才看到打字机效果.",
    },
    abilityTags: ["frontend.effect.useEffect", "frontend.state.local"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, SECONDARY, API_CLIENT],
  }),
  q({
    type: "branch_trace",
    title: "Q13 分块到达但无完整事件边界",
    prompt: "reader.read 返回的 chunk 只包含 'event: status\\ndata: {\"step\":\"guard\",' , 没有 \\n\\n. 代码怎么走?",
    options: [
      { id: "a", text: "buffer += decoder.decode(value, { stream: true })" },
      { id: "b", text: "boundary = buffer.indexOf('\\n\\n') 返回 -1" },
      { id: "c", text: "不进入 while 循环体, 继续下一轮 reader.read" },
      { id: "d", text: "下次 chunk 到达后重新检查 boundary" },
    ],
    correctAnswer: { pathIds: ["a", "b", "c", "d"] },
    explanation: {
      short: "追加 → 无边界 → 继续读 → 下次再查.",
      detail: "SECONDARY L114-138: 单个 chunk 可能只包含半个事件(尤其网络分片或模型输出慢时). buffer 累积后 boundary 仍为 -1, while 不执行, 回到 while(true) 顶部继续 reader.read. 这是流式解析的正常情况 — 不能因为没有边界就抛错, 必须等更多字节.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: SECONDARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [SECONDARY],
  }),
  q({
    type: "branch_trace",
    title: "Q14 reader.read 返回 {done:true} 且未收到 done 事件",
    prompt: "服务端异常断流, buffer 里只有未完成的 status 事件, reader.read 返回 {done:true}. 后续?",
    options: [
      { id: "a", text: "while(true) 循环 break" },
      { id: "b", text: "buffer 中残留的未完成事件不会被 parseSseBlock" },
      { id: "c", text: "readNemesisSseResponse 返回后, .then(() => finish(() => reject(...)))" },
      { id: "d", text: "Promise reject, useNemesisChat catch 设置 error 状态" },
    ],
    correctAnswer: { pathIds: ["a", "b", "c", "d"] },
    explanation: {
      short: "break → 残留丢弃 → reject → UI 报错.",
      detail: "SECONDARY L110-112: done 为 true 时 break. L225-229: .then 中 finish(() => reject(new Error('Nemesis 流式响应意外结束。'))). 这意味着服务端在没有 emit done 的情况下关闭了流. 客户端不能把残留 buffer 当成有效事件(它可能是不完整的 JSON), 必须 reject 让 UI 显示错误.",
    },
    abilityTags: ["frontend.effect.useEffect", "frontend.state.local"],
    sourceFilePath: SECONDARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, SECONDARY],
  }),
  q({
    type: "branch_trace",
    title: "Q15 切换路由 mid-stream → cancelled 标记生效",
    prompt: "用户切路由时, useNemesisChat cleanup 中设置 cancelled=true. 后续 chunk 到达时的处理?",
    options: [
      { id: "a", text: "React 卸载 useNemesisChat, cleanup 设置 cancelled = true" },
      { id: "b", text: "后台 fetch reader 继续读取下一个 chunk" },
      { id: "c", text: "decoder.decode + buffer 检查边界仍在运行" },
      { id: "d", text: "parseSseBlock 提取 done 事件前检查 cancelled" },
      { id: "e", text: "若 cancelled 为 true, 直接 return 不调用 onDone / setMessages" },
    ],
    correctAnswer: { pathIds: ["a", "b", "c", "d", "e"] },
    explanation: {
      short: "cleanup 设标记 → 后续 chunk 仍读但被丢弃 → 防止状态泄漏.",
      detail: "这是 SSE 客户端必须处理的 race condition. fetch promise 不随组件卸载自动取消(除非显式 AbortController). 如果没有 cancelled 检查, onDone 会在已卸载组件上执行 setMessages, 触发 React 内存泄漏警告. 正确模式: cleanup 设标记 → handler 入口检查 → 提前 return. 这与 §21.4-2 (animDropCancelled) 同构.",
    },
    abilityTags: ["frontend.effect.useEffect"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, SECONDARY],
  }),
  // ─── AI 改坏 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    ...tsServerImportInClient({ ...RECIPE_CTX, orderIndex: 15, primaryFile: PRIMARY }),
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, "app/services/nemesis.server.ts"],
  }),
  q({
    ...reactUseEffectMissingDep({ ...RECIPE_CTX, orderIndex: 16, primaryFile: PRIMARY }),
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    ...tsSseEventWiden({ ...RECIPE_CTX, orderIndex: 17, primaryFile: "app/types/nemesis-sse.ts" }),
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: ["app/types/nemesis-sse.ts", PRIMARY, SECONDARY],
  }),
  q({
    ...reactSubmitDomDisabledOnly({ ...RECIPE_CTX, orderIndex: 18, primaryFile: PRIMARY }),
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY],
  }),
  q({
    ...nemesisLocalStorageUntrusted({ ...RECIPE_CTX, orderIndex: 19, primaryFile: PRIMARY }),
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, "app/routes/api.nemesis.ts"],
  }),
  // ─── 自由作答 (Q21-Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 四件套缺一不可",
    prompt: "用自己的话解释为什么客户端 SSE 消费必须同时存在这四样东西: response.body.getReader()、TextDecoder、事件边界 \\n\\n、按 event 名 dispatch. 缺任何一个会怎样?",
    options: [],
    correctAnswer: {
      text: "客户端 SSE 四件套缺一不可: (1) getReader() 拿到 ReadableStreamDefaultReader 才能逐块消费流, 不用 reader 只能等全部下载完失去流式意义; (2) TextDecoder 把 Uint8Array 字节流转成字符串, 且 stream:true 允许跨 chunk 的多字节 UTF-8 字符分片重组; (3) \\n\\n 是 SSE 协议事件边界, 没有它无法区分两个独立事件; (4) 按 event 名 dispatch 把 status/done/error 路由到不同 UI 状态更新器, 不分发则所有事件混为一谈. 四者形成 '读取 → 解码 → 分帧 → 路由' 的完整管线, 缺任何一环都会导致数据丢失、乱码、事件错乱或 UI 不更新.",
    },
    explanation: {
      short: "四件套形成读取 → 解码 → 分帧 → 路由的完整管线.",
      detail: "好的解释能说明每者的不可替代性: getReader 是流式消费入口, TextDecoder 是字节→字符翻译, \\n\\n 是协议分帧, dispatch 是业务路由. 缺 reader 退化成 fetch json; 缺 decoder 拿到乱码; 缺边界 事件粘连; 缺 dispatch 业务逻辑混为一谈.",
    },
    abilityTags: ["frontend.effect.useEffect", "ai.review.architecture"],
    sourceFilePath: SECONDARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, SECONDARY],
  }),
  q({
    type: "review_comment",
    title: "Q22 PR review: 删除 cancelled 标记",
    prompt: "PR 在 requestNemesisStream / useNemesisChat 中删除了 cancelled / abort 相关清理逻辑, 理由是 'fetch 自己会结束'. 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "fetch promise 在组件卸载后不会自动取消, reader 仍会在后台读取并调用 onDone/onStatus, 导致在已卸载组件上执行 setMessages 触发 React 内存泄漏警告. 请保留 cleanup 中的 cancelled 标记或 AbortController, 并在 handler 入口检查, 确保路由切换后不再更新状态.",
    },
    explanation: {
      short: "审查点: 删除 cancelled 标记会导致卸载后状态泄漏.",
      detail: "好的 review 指出 (1) fetch 不随组件卸载自动取消 (2) reader 回调泄漏 (3) React 内存警告 (4) 明确要求恢复 cancelled / abort 机制. 这是 SSE 客户端资源管理的必选项, 不是可选优化.",
    },
    abilityTags: ["frontend.effect.useEffect", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "client",
    touchedFiles: [PRIMARY, SECONDARY],
  }),
];
