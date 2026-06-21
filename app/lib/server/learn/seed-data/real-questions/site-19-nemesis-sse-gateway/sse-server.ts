/**
 * Real questions for site-19-nemesis-sse-gateway / sse-server.
 *
 * Anchor: remix/app/lib/nemesis-sse.server.ts
 * 学习目标: SSE 库模块的协议封装、流生命周期、错误处理与类型安全.
 *
 * 题目数: 22.
 *
 * 引用 recipe: tsSseEventWiden (§12.2-TS-4 SSE step 扩 string).
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { tsSseEventWiden } from "../recipes";

const SSE = "app/lib/nemesis-sse.server.ts";
const TOUCHED = [SSE];

const r19 = tsSseEventWiden({
  lessonSlug: "sse-server",
  courseSlug: "site-19-nemesis-sse-gateway",
  orderIndex: 18,
  primaryFile: SSE,
});

export const sseServerQuestions: RealQ[] = [
  // ─── 基础识别 (Q1–Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 SSE 响应构造",
    prompt: "createNemesisSseResponse(handler) 最终返回什么?",
    options: [
      { id: "A", text: "new Response(stream, { headers: NEMESIS_SSE_HEADERS }), 其中 stream 是 ReadableStream<Uint8Array>" },
      { id: "B", text: "一个普通 JSON 对象" },
      { id: "C", text: "WebSocket 连接" },
      { id: "D", text: "Promise<void>" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "返回包装了 ReadableStream 的 Response, 头为 text/event-stream.",
      detail: "L15-35: 先创建 ReadableStream<Uint8Array>, 在 start 中注册 emit 闭包; L35 用 new Response(stream, { headers: NEMESIS_SSE_HEADERS }) 返回标准 Fetch API Response. 这是 Worker 上 SSE 的标准写法.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 SSE 响应头",
    prompt: "NEMESIS_SSE_HEADERS 中 Content-Type 的值是?",
    options: [
      { id: "A", text: "text/event-stream; charset=utf-8" },
      { id: "B", text: "application/json" },
      { id: "C", text: "text/plain" },
      { id: "D", text: "application/octet-stream" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "text/event-stream; charset=utf-8 是 SSE 协议要求的 MIME type.",
      detail: "L3-7: NEMESIS_SSE_HEADERS 展开 NO_STORE_HEADERS (禁止缓存), 并显式设置 Content-Type 为 text/event-stream; charset=utf-8, 以及 Connection: keep-alive. SSE 协议要求浏览器按 event-stream 解析.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q3 SSE 事件格式",
    prompt: "formatSseEvent('status', { step: 'guard' }) 返回的字符串格式?",
    options: [
      { id: "A", text: "`event: status\\ndata: {\"step\":\"guard\"}\\n\\n` (双换行结尾)" },
      { id: "B", text: "JSON.stringify({ event: 'status', data: { step: 'guard' } })" },
      { id: "C", text: "`status: { step: 'guard' }`" },
      { id: "D", text: "XML 格式" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE 协议: event: 名 + \\n + data: JSON + \\n\\n (双换行 = 消息边界).",
      detail: "L11-13: 模板字符串 `event: ${event}\\ndata: ${JSON.stringify(data)}\\n\\n`. 双换行是 SSE 消息结束标志, 单换行不行. event: 前缀让客户端 EventSource 可按事件名 dispatch.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q4 ReadableStream 泛型",
    prompt: "new ReadableStream<Uint8Array> 中的泛型参数含义?",
    options: [
      { id: "A", text: "controller.enqueue 接受 Uint8Array (字节块), 不是原始字符串" },
      { id: "B", text: "限制只能传 8 位无符号整数" },
      { id: "C", text: "表示流只能有 8 个 chunk" },
      { id: "D", text: "无意义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ReadableStream<Uint8Array> 要求 enqueue 字节数组, 因此需要 TextEncoder 把字符串编码.",
      detail: "L16, 18, 21: const encoder = new TextEncoder(); controller.enqueue(encoder.encode(...)). ReadableStream 的类型参数决定了 controller.enqueue 的签名. 如果直接传 string 会 TS 报错.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q5 emit 类型签名",
    prompt: "NemesisSseEmit 的类型签名?",
    options: [
      { id: "A", text: "(event: string, data: unknown) => void" },
      { id: "B", text: "(data: unknown) => void" },
      { id: "C", text: "() => void" },
      { id: "D", text: "(event: string) => string" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "NemesisSseEmit 接受 event 名和 data 负载, 无返回值.",
      detail: "L9: export type NemesisSseEmit = (event: string, data: unknown) => void. event 是客户端 EventSource 监听器匹配的关键字, data 是任意 JSON 序列化值. void 表示 emit 只负责入队, 不返回.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q6 模块导出",
    prompt: "nemesis-sse.server.ts 导出了哪些符号? (多选)",
    options: [
      { id: "A", text: "NEMESIS_SSE_HEADERS" },
      { id: "B", text: "NemesisSseEmit" },
      { id: "C", text: "formatSseEvent" },
      { id: "D", text: "createNemesisSseResponse" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "4 个导出: headers 常量、emit 类型、格式化函数、响应构造器.",
      detail: "L3, 9, 11, 15 分别导出 NEMESIS_SSE_HEADERS (as const 对象)、NemesisSseEmit (类型别名)、formatSseEvent (纯函数)、createNemesisSseResponse (高阶函数). 这是完整的 SSE 工具集, 消费者只需 import createNemesisSseResponse 和 formatSseEvent.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  // ─── 代码阅读 (Q7–Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: controller.close",
    prompt: "下面哪一行是保证 SSE 流正确关闭的关键?",
    code: `1  export function createNemesisSseResponse(handler) {
2    const encoder = new TextEncoder();
3
4    const stream = new ReadableStream({
5      async start(controller) {
6        const emit = (event, data) => {
7          controller.enqueue(encoder.encode(formatSseEvent(event, data)));
8        };
9
10       try {
11         await handler(emit);
12       } catch (error) {
13         emit("error", { message });
14       } finally {
15         controller.close();
16       }
17     },
18   });
19
20   return new Response(stream, { headers: NEMESIS_SSE_HEADERS });
21 }`,
    options: [],
    linePickLines: [
      { id: "L7", lineNumber: 7, text: "controller.enqueue(encoder.encode(formatSseEvent(event, data)));" },
      { id: "L11", lineNumber: 11, text: "await handler(emit);" },
      { id: "L15", lineNumber: 15, text: "controller.close();" },
    ],
    correctAnswer: { lineId: "L15" },
    explanation: {
      short: "L15 finally controller.close 是 SSE 流关闭的兜底契约.",
      detail: "ReadableStream 要求 start 完成后必须 close, 否则客户端 reader.read() 永远 pending. finally 保证无论 handler 成功还是抛错, 流都会被关闭. 没有 close, Worker 端资源持续占用直到超时.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "line_pick",
    title: "Q8 关键行: TextEncoder 编码入队",
    prompt: "哪一行把字符串转成 Uint8Array 并入队?",
    code: `1  const encoder = new TextEncoder();
2
3  const stream = new ReadableStream({
4    async start(controller) {
5      const emit = (event, data) => {
6        controller.enqueue(encoder.encode(formatSseEvent(event, data)));
7      };
8    },
9  });`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "const encoder = new TextEncoder();" },
      { id: "L4", lineNumber: 4, text: "async start(controller) {" },
      { id: "L6", lineNumber: 6, text: "controller.enqueue(encoder.encode(formatSseEvent(event, data)));" },
    ],
    correctAnswer: { lineId: "L6" },
    explanation: {
      short: "L6 是编码 + 入队的核心行.",
      detail: "encoder.encode 把 UTF-8 字符串转为 Uint8Array, 再传给 controller.enqueue. 没有这一行, ReadableStream<Uint8Array> 无法接收字符串数据. TextEncoder 是 Web 标准 API, 高性能且处理多字节字符安全.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "fill_blank",
    title: "Q9 formatSseEvent 协议格式",
    prompt: "formatSseEvent 中 data 与下一条消息之间用几个换行符分隔?",
    options: [],
    correctAnswer: { values: { v: "2" } },
    blanks: [
      { id: "v", placeholder: "数字", acceptedAnswers: ["2", "两", "两个", "2个"] },
    ],
    explanation: {
      short: "双换行 \\n\\n 是 SSE 单条消息的结束标志.",
      detail: "L12: `\\n\\n` 结尾. SSE 协议规定每条消息由 field: value 行组成, 行内以 \\n 结束, 消息间以空行 (即 \\n\\n) 分隔. 单换行只结束当前 field, 不结束消息.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "multi_choice",
    title: "Q10 catch 块行为",
    prompt: "L26-28 catch (error) 块做了哪些事? (多选)",
    options: [
      { id: "A", text: "error instanceof Error 判断, 取 error.message" },
      { id: "B", text: "非 Error 实例时回退到固定中文文案" },
      { id: "C", text: "emit('error', { message }) 把错误作为 SSE 事件发出" },
      { id: "D", text: "把异常重新 throw 出去" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "catch 内收窄错误类型, 回退文案, emit error 事件, 不重新 throw.",
      detail: "L26-28: const message = error instanceof Error ? error.message : 'Nemesis 暂时无法响应，请稍后再试。'; emit('error', { message }). 不重新 throw 是因为 SSE 模式下 HTTP 头已发出, 状态锁死 200, 错误必须通过事件传递. finally close 保证流关闭.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "line_pick",
    title: "Q11 关键行: emit 类型声明",
    prompt: "哪一行声明了 emit 的 TypeScript 类型?",
    code: `1  import { NO_STORE_HEADERS } from "~/lib/cache-headers.server";
2
3  export const NEMESIS_SSE_HEADERS = {
4    ...NO_STORE_HEADERS,
5    "Content-Type": "text/event-stream; charset=utf-8",
6    Connection: "keep-alive",
7  };
8
9  export type NemesisSseEmit = (event: string, data: unknown) => void;
10
11 export function formatSseEvent(event: string, data: unknown) {
12   return \`event: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n\`;
13 }`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: 'import { NO_STORE_HEADERS } from "~/lib/cache-headers.server";' },
      { id: "L5", lineNumber: 5, text: '"Content-Type": "text/event-stream; charset=utf-8",' },
      { id: "L9", lineNumber: 9, text: "export type NemesisSseEmit = (event: string, data: unknown) => void;" },
    ],
    correctAnswer: { lineId: "L9" },
    explanation: {
      short: "L9 定义了 NemesisSseEmit 类型别名.",
      detail: "L9 是模块的公开类型契约, createNemesisSseResponse 的 handler 参数和 emit 闭包都引用它. 把 event 限定为 string、data 限定为 unknown, 保证消费者不能传入非法类型.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  // ─── 状态推理 (Q12–Q15) ─────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 handler 成功时的执行路径",
    prompt: "handler 正常完成、不抛错时的完整执行路径?",
    options: [
      { id: "start", text: "start(controller) 被调用" },
      { id: "emit-closure", text: "const emit = (event, data) => controller.enqueue(...)" },
      { id: "handler-await", text: "await handler(emit) 执行成功" },
      { id: "catch-skip", text: "catch 块被跳过" },
      { id: "finally-close", text: "finally { controller.close() } 执行" },
    ],
    correctAnswer: { pathIds: ["start", "emit-closure", "handler-await", "catch-skip", "finally-close"] },
    explanation: {
      short: "成功路径: start → emit 闭包 → handler 完成 → catch 跳过 → finally close.",
      detail: "handler 内通过 emit 发送任意数量事件, 只要没 throw, catch 不执行. finally 始终执行, 关闭流. 这是 ReadableStream 的标准生命周期.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 handler 抛错时的执行路径",
    prompt: "handler 抛错时的完整执行路径?",
    options: [
      { id: "start", text: "start(controller) 被调用" },
      { id: "emit-closure", text: "emit 闭包已创建" },
      { id: "handler-throw", text: "await handler(emit) 抛出异常" },
      { id: "catch-run", text: "catch 执行: emit('error', { message })" },
      { id: "finally-close", text: "finally { controller.close() } 执行" },
    ],
    correctAnswer: { pathIds: ["start", "emit-closure", "handler-throw", "catch-run", "finally-close"] },
    explanation: {
      short: "异常路径: start → emit → handler 抛错 → catch 发 error 事件 → finally close.",
      detail: "catch 内 emit('error') 把异常转为 SSE error 事件, 客户端通过 EventSource.on('error') 接收. finally 保证流关闭, 不依赖 handler 是否成功. 这是 SSE 错误处理与 REST API 的根本差异.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 漏写 finally close 的后果",
    prompt: "如果删除 finally { controller.close(); }, 且 handler 抛错, 会发生什么?",
    options: [
      { id: "A", text: "ReadableStream 保持 open, 客户端 reader.read() 永久 pending, 直到浏览器 fetch 超时" },
      { id: "B", text: "自动 500" },
      { id: "C", text: "自动 close" },
      { id: "D", text: "没有任何影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "finally close 是兜底契约, 删除后异常路径流不关闭.",
      detail: "ReadableStream 协议不自动关闭. 没有 finally, handler 抛错后流保持 open 状态. 客户端 EventSource / fetch reader 永远等待下一条消息, 直到浏览器内置超时 (通常 30-60s). Worker 端也持续持有资源.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q15 NO_STORE_HEADERS 的作用",
    prompt: "NEMESIS_SSE_HEADERS 展开 ...NO_STORE_HEADERS 的主要目的?",
    options: [
      { id: "A", text: "禁止 CDN / 浏览器缓存 SSE 流, 防止不同用户或同一用户的重复请求命中缓存" },
      { id: "B", text: "加速响应" },
      { id: "C", text: "压缩体积" },
      { id: "D", text: "无实际作用" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE 是 per-user 实时流, 绝不能缓存.",
      detail: "NO_STORE_HEADERS 通常包含 Cache-Control: no-store. SSE 响应按 URL 缓存会导致用户 A 的事件被用户 B 读到, 或旧事件被重复消费. no-store 保证每条连接都是实时数据.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  // ─── AI 改坏 (Q16–Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 删除 finally { controller.close(); }",
    prompt: "AI 改坏: AI 删除 finally { controller.close(); } 块, 理由是 'handler 自己应该负责关闭'. 最大风险是什么?",
    options: [
      { id: "A", text: "handler 抛错时流不关闭, 客户端永久 pending, Worker 资源不释放" },
      { id: "B", text: "TS 编译失败" },
      { id: "C", text: "代码更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "finally close 是 SSE 协议契约, 不能依赖调用方.",
      detail: "createNemesisSseResponse 是库函数, handler 由调用方传入. 库不能假设调用方在异常路径关闭流. 删除 finally 后任何 throw 都导致资源泄漏.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
    realWorldImpact: "客户端 loading 转圈 30s 后超时, ops 看到 Worker 内存持续增长, 高并发时连接数打满.",
    aiReviewRisk: "把库级兜底契约外包给调用方, 破坏封装边界.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, finally 删除语法合法.",
      C: "简洁 = 不健壮.",
      D: "有严重可用性影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 把 Content-Type 改成 application/json",
    prompt: "AI 改坏: AI 把 NEMESIS_SSE_HEADERS 的 Content-Type 改成 application/json, 理由是 '后面还是发 JSON 数据'. 最大风险是什么?",
    options: [
      { id: "A", text: "浏览器不会按 SSE 协议解析, EventSource 无法识别事件边界, 客户端收不到任何事件" },
      { id: "B", text: "JSON 解析变慢" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "text/event-stream 是 SSE 协议的必要条件.",
      detail: "EventSource / 自定义 fetch reader 依赖 Content-Type: text/event-stream 进入 SSE 解析模式. 改成 application/json 后浏览器当成普通文档流, 不会按 event: / data: 字段拆分事件. 前端 useNemesisChat 的 onmessage 永远不被触发.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [SSE, "app/hooks/useNemesisChat.client.ts"],
    realWorldImpact: "用户发送消息后前端没有任何反馈, 进度条不更新, 文本不出现, 看似系统崩溃.",
    aiReviewRisk: "只看到'数据是 JSON', 没意识到 SSE 是传输协议, Content-Type 决定解析模式.",
    wrongAnswerFeedback: {
      B: "解析模式与速度无关.",
      C: "TS 不会报错.",
      D: "整个前端事件系统失效.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 移除 TextEncoder 直接传字符串",
    prompt: "AI 改坏: AI 删除 TextEncoder, 把 controller.enqueue(encoder.encode(...)) 改成 controller.enqueue(formatSseEvent(...)), 理由是 '字符串更直观'. 最大风险是什么?",
    options: [
      { id: "A", text: "ReadableStream<Uint8Array> 的 enqueue 签名不接受 string, 运行时会 TypeError 或浏览器拒绝" },
      { id: "B", text: "编码变快" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ReadableStream<Uint8Array> 只能 enqueue 字节, 不能传字符串.",
      detail: "L18 显式声明 ReadableStream<Uint8Array>, 其 controller.enqueue 参数类型是 Uint8Array. 某些浏览器在运行期可能宽容转换, 但标准行为是拒绝非 Uint8Array chunk. 即使不抛错, 字符编码也可能错乱 (UTF-8 多字节字符被截断).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
    realWorldImpact: "Safari / Firefox 严格模式下直接抛 TypeError, SSE 连接建立后瞬间断开, 用户永远看不到回复.",
    aiReviewRisk: "忽视泛型约束, 把'直观'放在类型安全之上.",
    wrongAnswerFeedback: {
      B: "字符串与 Uint8Array 性能差异不是关注点.",
      C: "如果 any 化可能 TS 不报, 但运行期必炸.",
      D: "有兼容性风险.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §12.2-TS-4 SSE step 扩 string",
    prompt: r19.prompt,
    options: r19.options,
    correctAnswer: r19.correctAnswer,
    explanation: r19.explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "ai-review",
    serverClientBoundary: "shared",
    touchedFiles: [SSE, "app/hooks/useNemesisChat.client.ts"],
    realWorldImpact: "新增 step 拼错不会在编译期暴露, 客户端进度条静默不更新, 用户体验断裂.",
    aiReviewRisk: "把 union 退化成 string 等价于把 TS 严格模式降级成 any, 失去穷尽性检查.",
    wrongAnswerFeedback: r19.wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 formatSseEvent 改成单换行",
    prompt: "AI 改坏: AI 把 formatSseEvent 改成 `event: ${event}\\ndata: ${JSON.stringify(data)}\\n` (单换行结尾), 理由是 '省一个字节'. 最大风险是什么?",
    options: [
      { id: "A", text: "SSE 协议要求双换行结束消息, 单换行导致浏览器把多条消息当成一条, 事件解析失败" },
      { id: "B", text: "省流量" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE 消息边界是 \\n\\n, 单换行破坏协议.",
      detail: "L12: `\\n\\n` 是 SSE 规范 (WHATWG / HTML Standard) 规定的消息终止符. 单换行只表示 field 结束, 浏览器会继续缓冲下一条 field, 导致多条 event 合并成一条, 或事件永远不被 dispatch.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
    realWorldImpact: "前端 EventSource 只触发一次 onmessage, 后续所有事件被缓冲合并, 进度条和文本一次性乱序弹出.",
    aiReviewRisk: "为省一个字节破坏标准协议, 属于'微优化'反模式.",
    wrongAnswerFeedback: {
      B: "省 1 字节失去协议正确性.",
      C: "TS 不会报错.",
      D: "事件解析会彻底失败.",
    },
  }),
  // ─── 自由作答 (Q21–Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 SSE 库的三层封装",
    prompt: "用自己的话说明 nemesis-sse.server.ts 的三层封装 —— formatSseEvent (协议层)、NemesisSseEmit / emit 闭包 (API 层)、createNemesisSseResponse (生命周期层) —— 各自职责及如何配合.",
    options: [],
    correctAnswer: {
      text: "三层封装: (1) formatSseEvent 是协议层, 负责把 event 名和 data 对象序列化为符合 SSE 规范的字符串 (event: + \\n + data: JSON + \\n\\n); (2) NemesisSseEmit 类型 + emit 闭包是 API 层, 给业务方一个薄接口, 隐藏 controller + encoder 细节; (3) createNemesisSseResponse 是生命周期层, 负责创建 ReadableStream、注册 start、执行 try/catch/finally、保证 controller.close、返回 Response. 配合方式: 业务方只调用 createNemesisSseResponse(async (emit) => { ... }), 在 handler 内用 emit 发事件, 库负责编码、入队、关闭、返回标准 Response.",
    },
    explanation: {
      short: "三层职责分离: 协议格式化 / 业务 API / 流生命周期.",
      detail: "好的回答应指出每一层的边界、类型约束、以及 finally close 的契约意义. 遗漏任何一层都会导致代码泄漏到错误层级.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 PR review: 删除 TextEncoder",
    prompt: "PR 把 `const encoder = new TextEncoder();` 和 `encoder.encode(...)` 删除, 改成直接 `controller.enqueue(formatSseEvent(...))`. 写一条 1-2 句的 review comment.",
    options: [],
    correctAnswer: {
      comment: "ReadableStream<Uint8Array> 的 enqueue 只接受 Uint8Array, 直接传 string 违反泛型约束, Safari/Firefox 会抛 TypeError. 请保留 TextEncoder 编码链, 这是 Worker SSE 的标准做法.",
    },
    explanation: {
      short: "审查点: ReadableStream<Uint8Array> 不能 enqueue 字符串.",
      detail: "好的 review 应指出 (1) 泛型约束 (2) 跨浏览器兼容性 (3) 标准做法保留.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
];
