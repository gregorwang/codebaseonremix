/**
 * Real questions for site-19-nemesis-sse-gateway / stream-response.
 *
 * Anchor: remix/app/routes/api.nemesis.ts L141-179 (createNemesisSseResponse 包裹)
 *          + remix/app/lib/nemesis-sse.server.ts (ReadableStream + encoder + emit).
 * 学习目标: SSE 在 Worker 上的正确姿势, 头 / 编码 / controller / 异常关闭,
 * 与 fetch().then(json) 的本质区别.
 *
 * 题目数: 22.
 *
 * 引用 recipe: tsSseEventWiden (§12.2-TS-4 SSE step 扩 string) + animGsapImportToTop.
 */

import { q } from "../../types";
import type { RealQ } from "../index";
import { tsSseEventWiden } from "../recipes";

const PRIMARY = "app/routes/api.nemesis.ts";
const SSE = "app/lib/nemesis-sse.server.ts";
const TOUCHED = [PRIMARY, SSE];

export const streamResponseQuestions: RealQ[] = [
  // ─── 基础识别 (Q1-Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 SSE 响应本质",
    prompt: "createNemesisSseResponse 返回的 Response 是什么?",
    options: [
      { id: "A", text: "new Response(stream, { headers }) — stream 是 ReadableStream<Uint8Array>, Content-Type: text/event-stream" },
      { id: "B", text: "普通 JSON response" },
      { id: "C", text: "WebSocket upgrade" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "Response 包裹 ReadableStream<Uint8Array>, Content-Type: text/event-stream.",
      detail: "nemesis-sse.server.ts L18-35: new ReadableStream<Uint8Array> 在 start() 里注册 emit 闭包, controller.enqueue(encoder.encode(...)). L35: return new Response(stream, { headers: NEMESIS_SSE_HEADERS }). 这是 Worker / Fetch API 标准 SSE 姿势.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 NEMESIS_SSE_HEADERS 内容",
    prompt: "NEMESIS_SSE_HEADERS = ?",
    options: [
      { id: "A", text: "{ ...NO_STORE_HEADERS, 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive' }" },
      { id: "B", text: "{ 'Content-Type': 'application/json' }" },
      { id: "C", text: "无 headers" },
      { id: "D", text: "{ 'Cache-Control': 'public, max-age=60' }" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "no-store + text/event-stream + keep-alive, 不缓存 + 长连接.",
      detail: "L3-7: no-store 防止 CDN 缓存 SSE 响应 (SSE 是流不是文档, CDN 缓存无意义); text/event-stream 是 SSE 协议要求; keep-alive 让 Worker / 浏览器不关闭 TCP. Connection 在 fetch API 实际上是 hint, Workers 平台通常会自动管理.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
  }),
  q({
    type: "single_choice",
    title: "Q3 formatSseEvent 格式",
    prompt: "formatSseEvent(event, data) 返回?",
    options: [
      { id: "A", text: "`event: ${event}\\ndata: ${JSON.stringify(data)}\\n\\n` (双换行结尾)" },
      { id: "B", text: "JSON.stringify({ event, data })" },
      { id: "C", text: "text/plain" },
      { id: "D", text: "无格式" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE 协议: 'event:' + '\\n' + 'data: ' + JSON + '\\n\\n' (双换行 = 消息边界).",
      detail: "L11-13: SSE 协议规定每条消息以两个换行结束, event: 客户端 event listener 匹配, data: 是负载. JSON.stringify 统一序列化, 客户端按 event 名 dispatch.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
  }),
  q({
    type: "single_choice",
    title: "Q4 TextEncoder 角色",
    prompt: "new TextEncoder() 的作用?",
    options: [
      { id: "A", text: "把 UTF-8 字符串编码成 Uint8Array 喂给 controller.enqueue" },
      { id: "B", text: "压缩" },
      { id: "C", text: "加密" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ReadableStream<Uint8Array> 需要字节, TextEncoder 把字符串转 UTF-8 字节.",
      detail: "L16: const encoder = new TextEncoder(). L21: controller.enqueue(encoder.encode(formatSseEvent(...))). ReadableStream 类型参数是 Uint8Array, 必须先 encode 才能 enqueue. TextEncoder 是 Web API 标准组件, 性能好且处理多字节字符.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
  }),
  q({
    type: "single_choice",
    title: "Q5 emit 闭包",
    prompt: "emit(event, data) 闭包做了什么?",
    options: [
      { id: "A", text: "controller.enqueue(encoder.encode(formatSseEvent(event, data))) — 把事件编码后入队" },
      { id: "B", text: "console.log" },
      { id: "C", text: "fetch 后端" },
      { id: "D", text: "无" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "emit 是 controller + encoder 的薄封装, 业务方不直接看到 controller.",
      detail: "L20-22: const emit = (event, data) => controller.enqueue(encoder.encode(formatSseEvent(event, data))). 业务方拿到 emit 闭包, 不需要碰 controller, 也避免在业务代码里到处传 controller + encoder. start() 内声明的闭包天然捕获这两个变量.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
  }),
  q({
    type: "single_choice",
    title: "Q6 emit 事件类型",
    prompt: "api.nemesis.ts L53-179 emit 的事件名?",
    options: [
      { id: "A", text: "status / done / error (3 类), 加上 onProgress 透传的子 step: guard / route / fallback / generate" },
      { id: "B", text: "无事件名" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "全用 'message'" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "顶层 3 类事件: status / done / error; status 内含 step + state 标识子阶段.",
      detail: "api.nemesis.ts L54-178: emit('status', {...}) 含 step (guard/route/fallback/generate) + state (running/done) + label; emit('done', { text, attachments, mode, modelRoute, ... }) 是最终结果; emit('error', { message }) 是 catch 路径. 顶层事件名有限, 子阶段用 step 字段.",
    },
    abilityTags: ["bridge.reactRouter.action", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  // ─── 代码阅读 (Q7-Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: start 内 try/finally close",
    prompt: "下面哪一行是 'ReadbaleStream 必须 finally close' 的关键?",
    code: `1 export function createNemesisSseResponse(handler) {
2   const encoder = new TextEncoder();
3
4   const stream = new ReadableStream({
5     async start(controller) {
6       const emit = (event, data) => {
7         controller.enqueue(encoder.encode(formatSseEvent(event, data)));
8       };
9
10      try {
11        await handler(emit);
12      } catch (error) {
13        emit("error", { message });
14      } finally {
15        controller.close();
16      }
17    },
18  });`,
    options: [],
    linePickLines: [
      { id: "L6", lineNumber: 6, text: "const emit = (event, data) => {" },
      { id: "L11", lineNumber: 11, text: "await handler(emit);" },
      { id: "L15", lineNumber: 15, text: "controller.close();" },
    ],
    correctAnswer: { lineId: "L15" },
    explanation: {
      short: "L15: finally close 保证无论 handler 抛错还是成功都关闭流.",
      detail: "ReadableStream 协议要求 start 完成后必须 close, 否则浏览器 reader.read() 会一直 pending. finally 让异常路径也能 close, 客户端不会再等下一次 event. 没有 close, fetch stream 在 Worker 端会一直持有资源直到超时.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
  }),
  q({
    type: "single_choice",
    title: "Q8 catch 内 emit error",
    prompt: "L12-13 handler 抛错时?",
    options: [
      { id: "A", text: "emit('error', { message: error.message }) 把错误作为 SSE 事件发出, 然后 finally close" },
      { id: "B", text: "直接 throw 出去" },
      { id: "C", text: "吞掉" },
      { id: "D", text: "返回 500" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE catch 转成 error 事件, status 永远 200, 客户端按 event 区分.",
      detail: "SSE 模式下 HTTP status 永远是 200 (响应头已经发出), 错误必须通过 error 事件传递. 客户端 useNemesisChat 的 onmessage 按 event 路由 — error event 触发 setError(message). 这是 SSE 与普通 JSON 响应的核心差异.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
  }),
  q({
    type: "multi_choice",
    title: "Q9 guard mode 早返回时 SSE 行为",
    prompt: "L128-133 guard.mode 是 reject / safe / quick 预写文案时, SSE 行为? (多选)",
    options: [
      { id: "A", text: "modeReply = getNemesisModeReply(guard.mode) 取到非空字符串" },
      { id: "B", text: "recordAudit({ assistantMessage: modeReply }) — audit 记录" },
      { id: "C", text: "emit('done', { text: modeReply, mode: guard.mode }) — 早返回正常完成" },
      { id: "D", text: "不再走 callNemesisModel 主模型" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C", "D"] },
    explanation: {
      short: "四步: modeReply 取值 → audit 记录 → emit done 早返回 → 跳过主模型.",
      detail: "guard reject / safe / quick 模式直接走预写文案, 不调主模型. 完整 SSE 流程仍执行: emit 一次 status done, emit done 带 modeReply, finally close. 用户感知是'系统快速回答'而非'跳到错误'.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "fill_blank",
    title: "Q10 callNemesisModel 异常路径",
    prompt: "L169-178 catch (error) 时, instanceof NemesisModelError 走 ___, 否则走 ___ 错误事件.",
    options: [],
    correctAnswer: { values: { v: "error.message / 'Nemesis 暂时无法响应，请稍后再试。'" } },
    blanks: [
      { id: "v", placeholder: "两个分支", acceptedAnswers: [
        "error.message / 'Nemesis 暂时无法响应，请稍后再试。'",
        "error.message / 通用文案",
        "model error / 通用 fallback 文案",
      ] },
    ],
    explanation: {
      short: "NemesisModelError 用 error.message (真实诊断信息), 其他用固定中文文案.",
      detail: "L171-177: 是 NemesisModelError (业务自定义, 来自守门或主模型) 时把它的 message 透传 — 这是诊断线索; 否则 console.error + 固定文案 (防止把内部 stack / provider 错误暴露给用户). 都走 emit('error', ...) 不改 HTTP status.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q11 onProgress 透传",
    prompt: "L147-149 onProgress 透传实现?",
    options: [
      { id: "A", text: "onProgress: (event) => { emit('status', event); } — 把 nemesis.server 的 status 事件包成 SSE status" },
      { id: "B", text: "忽略" },
      { id: "C", text: "console.log" },
      { id: "D", text: "重新 fetch" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "onProgress 是 callback 接口, 用 emit('status', event) 透传为 SSE status 事件.",
      detail: "callNemesisModel 提供 onProgress 抽象, 不直接依赖 SSE. route 层把这个 callback 包成 emit('status', ...), 让 service 层不知道流式协议存在. 这是关注点分离 — service 只 push 状态, 路由层决定传输协议.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  // ─── 状态推理 (Q12-Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 完整成功 SSE 流路径",
    prompt: "主模型正常返回 → 完整 SSE 事件流?",
    options: [
      { id: "s-guard-r", text: "status: { step: guard, state: running, label: 正在做安全判断 }" },
      { id: "s-guard-d", text: "status: { step: guard, state: done, mode, detail }" },
      { id: "s-route-r", text: "status: { step: route, state: running, label: Gemini 意图分类 }" },
      { id: "s-route-d", text: "status: { step: route, state: done, provider, model } (onProgress 透传)" },
      { id: "s-gen", text: "status: { step: generate, state: running/done, label } (onProgress 透传)" },
      { id: "done", text: "done: { text, attachments, mode, modelRoute, modelProvider, modelName, ... }" },
    ],
    correctAnswer: { pathIds: ["s-guard-r", "s-guard-d", "s-route-r", "s-route-d", "s-gen", "done"] },
    explanation: {
      short: "guard(r→d) → route(r→d) → generate(r→d) → done, 6 个事件.",
      detail: "完整流: 2 个 status (guard) + 1 个 status (route running) + N 个 status (onProgress 透传) + 1 个 done. 客户端 useNemesisChat 的 setRequestStage 把这些映射成 UI 进度条 (3 段: 安全判断 / 路由 / 生成), 全部完成才出文本.",
    },
    abilityTags: ["bridge.reactRouter.action", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "branch_trace",
    title: "Q13 主模型 429 + fallback 全失败路径",
    prompt: "主模型 429 → fallback lite 也 500 → fallback deepseek 也失败. SSE 事件流?",
    options: [
      { id: "s-guard", text: "status: guard done" },
      { id: "s-route-r", text: "status: route running" },
      { id: "s-fb-1", text: "status: { step: fallback, state: running, attemptIndex: 1 }" },
      { id: "s-fb-2", text: "status: { step: fallback, state: running, attemptIndex: 2 }" },
      { id: "s-fb-d", text: "status: { step: fallback, state: failed } (或 done 但标 failed)" },
      { id: "error", text: "error: { message: 'Nemesis 暂时无法响应，请稍后再试。' } (非 NemesisModelError 走通用文案)" },
    ],
    correctAnswer: { pathIds: ["s-guard", "s-route-r", "s-fb-1", "s-fb-2", "s-fb-d", "error"] },
    explanation: {
      short: "guard → route running → fallback x2 → 全部失败 → emit error 通用文案.",
      detail: "callNemesisModel 抛最后错误, api.nemesis.ts L169-178 catch. 不是 NemesisModelError (本例是 provider 抛的 Error) → 走通用中文 'Nemesis 暂时无法响应，请稍后再试。', console.error 保留 stack 给 ops. SSE status 失败也先发, 客户端能显示 'fallback 失败' 状态, 最后 error toast.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q14 SSE 与 JSON 响应在 HTTP 层的区别",
    prompt: "SSE 响应在 HTTP 层与普通 JSON 响应的关键区别?",
    options: [
      { id: "A", text: "SSE 响应头在第一个字节就发出, status 永远是 200; JSON 可以在 handle 完后根据 body 设置 status" },
      { id: "B", text: "无区别" },
      { id: "C", text: "SSE 走 HTTPS, JSON 走 HTTP" },
      { id: "D", text: "SSE 用 GET, JSON 用 POST" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE 头先行, status 锁死 200, 错误必须通过事件传递.",
      detail: "SSE 是流式响应, 第一个字节就是 'event: status\\ndata: {...}\\n\\n', HTTP 状态行已经在第一个 chunk 之前. 一旦状态发出就是 200 (或 5xx, 不能再改). 业务错误只能通过 emit('error', ...) 让客户端区分. 这是为何 api.nemesis 的 catch 不能返回 5xx JSON, 而必须 emit event.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q15 controller.enqueue 顺序保证",
    prompt: "controller.enqueue 调用顺序与客户端收到事件的顺序?",
    options: [
      { id: "A", text: "FIFO — enqueue 顺序就是客户端 reader.read() 收到顺序" },
      { id: "B", text: "乱序" },
      { id: "C", text: "随机" },
      { id: "D", text: "由 Worker 决定" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "ReadableStream 是 FIFO 队列, enqueue 顺序 = 客户端收到顺序.",
      detail: "ReadableStream 协议保证先进先出. emit('status', {step: 'guard'}) 先 enqueue → 客户端先收; emit('done', ...) 后 enqueue → 后收. 这保证 UI 进度按 guard → route → generate → done 顺序更新, 不会跳帧.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
  }),
  // ─── AI 改坏 (Q16-Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把 SSE 改成普通 fetch JSON",
    prompt: "AI 改坏: AI 觉得 'SSE 太复杂', 改成 fetch().then(res => res.json()) 一次性拿完整结果. 后果是?",
    options: [
      { id: "A", text: "用户看不到进度, 长任务 (主模型 1-3s + fallback) 全程空白, 体验退步; 错误用 status 区分, 但前端要重写 setRequestStage 逻辑" },
      { id: "B", text: "更简单" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "更快" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE 是进度反馈的载体, 改 JSON 失去流式 UX + 客户端要重写.",
      detail: "改 JSON 一次性响应: (1) useNemesisChat 的 setRequestStage 不再有数据来源, 进度条消失; (2) 错误从 emit('error') 变成 status 4xx/5xx, 客户端要重写 setError 路径; (3) 路由要等 callNemesisModel + parse + ensure attachment 全部完成才能响应, 端到端延迟等于总耗时 (而非第一个 status). 流式 UX 的核心价值丢失.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
    realWorldImpact: "用户每次问 1-3 秒空白, 不知道系统在做什么, 怀疑崩溃.",
    aiReviewRisk: "把 SSE 当成'炫技', 没看到流式 UX 是产品级承诺.",
    wrongAnswerFeedback: {
      B: "简单 = 失去进度, 体验退步.",
      C: "TS 不会报错.",
      D: "响应延迟没改善, 反而更糟.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 忘记 controller.close()",
    prompt: "AI 改坏: AI 在 start() 里删除 finally { controller.close(); } 块, 理由是 'handler 自己会 close'. 后果是?",
    options: [
      { id: "A", text: "handler 抛错时 controller 永远不 close, 浏览器 reader.read() 永久 pending, 客户端卡在 loading 直到超时" },
      { id: "B", text: "TS 报错" },
      { id: "C", text: "更简洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "finally close 是契约, 删了异常路径卡住.",
      detail: "handler 是用户传入的 async 函数, 它只在自身 try/catch 后 return, 异常路径自己不会调 controller.close. 没有 finally, 任何 throw (包括 callNemesisModel 抛错 / recordAudit 抛错 / 任何 SSE emit 间抛错) 都会让流保持 open. Worker 端 resource 持续占用, 客户端 fetch reader 永远 await.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
    realWorldImpact: "用户看到 loading 转圈, 30s 后浏览器 fetch timeout 才报错, ops 看到 Worker 内存持续增长.",
    aiReviewRisk: "把 'handler 自己 close' 当成默认契约, 忽略 finally 是 SSE 协议兜底.",
    wrongAnswerFeedback: {
      B: "TS 不会报, finally 删了语法合法.",
      C: "删 finally 反而让代码不健壮.",
      D: "有严重可用性影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 改 NEMESIS_SSE_HEADERS 加 public cache",
    prompt: "AI 改坏: AI 把 NEMESIS_SSE_HEADERS 的 Cache-Control 改成 'public, max-age=60'. 后果是?",
    options: [
      { id: "A", text: "CDN 会按 URL 缓存 SSE 响应, 不同 user 拿到同一 chunk; SSE 永远不应 public cache" },
      { id: "B", text: "更快" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "SSE 是 per-user 流, public cache 把多用户响应混在一起, 严重错乱.",
      detail: "类似 §18.3-1 (messages loader public cache) 反例: CDN 按 URL 缓存, 用户 A 触发 /api.nemesis POST 拿到响应, 用户 B 触发同 URL 直接读 A 的 chunk. SSE 即使 GET 不一样 (实际上 POST), 一旦改为 GET 行为错乱; 即便 POST, no-store 头是为了明确语义. max-age + public 把流锁进 CDN 60s.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
    realWorldImpact: "用户 A 收到的 thinking 阶段进度被用户 B 直接看到, audit 维度错位, 输出串台.",
    aiReviewRisk: "把 '加速' 当成 cache 的全部, 忽略 per-user / no-store 边界.",
    wrongAnswerFeedback: {
      B: "public cache 在 SSE 路径上是 bug 不是优化.",
      C: "TS 不会报错, 是行为级破坏.",
      D: "用户数据混在一起, 严重隐私事故.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 引用 §12.2-TS-4 SSE step 扩 string",
    prompt: tsSseEventWiden({
      lessonSlug: "stream-response",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 18,
      primaryFile: SSE,
    }).prompt,
    options: tsSseEventWiden({
      lessonSlug: "stream-response",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 18,
      primaryFile: SSE,
    }).options,
    correctAnswer: tsSseEventWiden({
      lessonSlug: "stream-response",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 18,
      primaryFile: SSE,
    }).correctAnswer,
    explanation: tsSseEventWiden({
      lessonSlug: "stream-response",
      courseSlug: "site-19-nemesis-sse-gateway",
      orderIndex: 18,
      primaryFile: SSE,
    }).explanation,
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [SSE, "app/hooks/useNemesisChat.client.ts"],
    realWorldImpact: "新增 step 拼错 state 不会在编译期暴露, 客户端 setRequestStage 静默不更新进度, 用户看不到 UI 反馈.",
    aiReviewRisk: "把 union 退化成 string, 等于把 TS 严格模式降级成 any.",
    wrongAnswerFeedback:
      tsSseEventWiden({
        lessonSlug: "stream-response",
        courseSlug: "site-19-nemesis-sse-gateway",
        orderIndex: 18,
        primaryFile: SSE,
      }).wrongAnswerFeedback ?? {},
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 把 done 改成 await 后才发",
    prompt: "AI 改坏: AI 觉得 'onProgress 是过度设计', 改成 await callNemesisModel 拿到 result 后再 emit('done', ...). 后果是?",
    options: [
      { id: "A", text: "进度反馈丢失 — 用户在主模型生成 1-3s 期间看不到 route / generate 状态, 体验与一次性 JSON 一样" },
      { id: "B", text: "更整洁" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "onProgress 是流式 UX 的灵魂, 删除等于退化成一次性响应.",
      detail: "callNemesisModel 的 onProgress 在 selectNemesisModel / 每次 fallback attempt / 每次 model.generate 调用前后都会触发. 删了以后整个 SSE 退化成一个 emit('status', guard) + 沉默 1-3s + emit('done'), 用户感受不到 '正在分类 → 正在生成' 的细分, 体验等同 Q16 的 '改 JSON'. 进度条进度停在'正在分类'.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
    realWorldImpact: "用户看到进度条卡 1-3s 不动, 怀疑崩溃, 重复点击触发多次请求.",
    aiReviewRisk: "把 onProgress 当 '装饰回调', 看不到它是流式 UX 的核心.",
    wrongAnswerFeedback: {
      B: "整洁 = 失去进度, 体验退步.",
      C: "TS 不会报错.",
      D: "有可见体验影响.",
    },
  }),
  // ─── 自由作答 (Q21-Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 SSE 在 Worker 上的关键约束",
    prompt: "用自己的话说明 (1) SSE 响应头先于 body 发出导致 status 锁死 (2) 错误必须通过 event 传递 (3) finally controller.close 是契约 (4) TextEncoder + Uint8Array 链是不可省的. 这 4 点如何一起决定 SSE 写法.",
    options: [],
    correctAnswer: {
      text: "SSE 在 Worker 上的关键约束: (1) 头先出: new Response(stream, { headers }) 那一刻 status 已锁, 之后只能 enqueue bytes, 不能改 status; (2) 错误用 event: catch 内 emit('error', { message }) 让客户端用 event 区分, 不能返回 4xx/5xx; (3) finally close: handler 异常路径必须 finally controller.close, 否则 reader 永久 pending, 资源不释放; (4) Uint8Array 链: stream 类型参数是 Uint8Array, 必须 TextEncoder.encode() 字符串再 enqueue. 四点共同决定: handler 顶层 try/catch/finally + emit 闭包 + encode 模式, 任何一点破坏整条链路静默出错.",
    },
    explanation: {
      short: "四点共同决定 SSE 写法: 头先出 / 错误事件化 / finally close / Uint8Array 链.",
      detail: "好的解释能联起 SSE 协议层 + Worker API 约束 + 错误处理纪律. 任何一点遗漏都会让客户端看到'卡住'或'空白', ops 看到'Worker 内存涨'.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 删除 finally { controller.close(); } 块, 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "finally controller.close 是 SSE 协议契约: handler 异常路径 (callNemesisModel 抛错 / recordAudit 抛错 / emit 间任意 throw) 都会让流保持 open, 浏览器 reader.read() 永久 pending, Worker 端 resource 不释放. 请保留 finally 块, 这是 SSE 错误处理纪律的兜底.",
    },
    explanation: {
      short: "审查点: finally close 是 SSE 协议契约, 不能删.",
      detail: "好的 review 指出 (1) 协议层契约 (2) 异常路径风险 (3) 客户端表现 (4) Worker 资源影响 (5) 明确保留.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: SSE,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [SSE],
  }),
];
