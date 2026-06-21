/**
 * Real questions for site-20-d1-errors-capstone / db-server.
 *
 * Anchor: remix/app/lib/db.server.ts (D1 binding、参数归一化、prepare 包装器、Kysely 封装).
 *   app/utils/cloudflare-env.server.ts (getDatabaseBinding 入口)
 * 学习目标: 理解 D1 绑定如何通过 context.cloudflare.env 流入, 为什么必须是 .server.ts,
 *   prepare / bind / all / get / run 的调用链, 参数归一化与 SQL 注入防御,
 *   D1 无多语句事务的限制, 以及 AI 改坏数据库层时的评审能力.
 *
 * 题目数: 22.
 *
 * 引用 recipe: tsServerImportInClient (§12.2-TS-3) + nemesisProviderErrorSwallow (§11.3-5).
 */

import { q } from "../../types";
import type { RealQ } from "../index";

const PRIMARY = "app/lib/db.server.ts";
const ENV = "app/utils/cloudflare-env.server.ts";
const TOUCHED = [PRIMARY, ENV];

export const dbServerQuestions: RealQ[] = [
  // ─── 基础识别 (Q1–Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 db 对象暴露的方法",
    prompt: "db.server.ts 中导出的 `db` 对象暴露了哪些方法?",
    options: [
      { id: "A", text: "`prepare(query)` 返回 D1PreparedStatementWrapper + `exec(sql)` 执行原始 SQL" },
      { id: "B", text: "`query / insert / update / delete`" },
      { id: "C", text: "`connect / disconnect / transaction`" },
      { id: "D", text: "`select / insertRaw / batch`" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "`db` 只有 `prepare` + `exec`, 所有参数化查询走 prepare 路径.",
      detail: "L137-144: `export const db = { prepare, exec }`. `prepare` 返回 `D1PreparedStatementWrapper`, 提供 `.all() / .get() / .run()`; `exec` 直接透传原生 `D1Database.exec`. 没有 ORM 式 query/insert/update/delete, 也没有 connect/disconnect, 因为 D1 是无连接模型.",
    },
    abilityTags: ["ai.review.architecture", "backend.validation.field"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q2 D1 binding 流入路径",
    prompt: "db.server.ts 里的 D1Database binding 从哪里流入?",
    options: [
      { id: "A", text: "`getDatabaseBinding()` 读取 `context.cloudflare.env.DB`, 该函数定义在 `app/utils/cloudflare-env.server.ts`" },
      { id: "B", text: "从 `import { DB } from '...'` 静态导入" },
      { id: "C", text: "从 localStorage 读取" },
      { id: "D", text: "从 URL query 读取" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "D1 binding 通过 Cloudflare context 流入, 不是静态模块.",
      detail: "L3: `import { getDatabaseBinding } from '~/utils/cloudflare-env.server'`. L31: `getDatabaseBinding().prepare(this.query)`. Worker 运行时把 `env.DB` 注入 context, `getDatabaseBinding()` 从中提取 `D1Database` 实例. 静态 import 拿不到 binding, 因为 binding 只在请求上下文存在.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: ENV,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, ENV],
  }),
  q({
    type: "single_choice",
    title: "Q3 为什么必须是 .server.ts",
    prompt: "`db.server.ts` 使用 `.server.ts` 后缀的核心原因?",
    options: [
      { id: "A", text: "Vite 把 `.server.ts` 视为服务端边界, 阻止文件及其依赖 (D1 binding / cloudflare-env) 被打包进 client bundle" },
      { id: "B", text: "TypeScript 强制要求" },
      { id: "C", text: " Remix 文件系统路由需要" },
      { id: "D", text: "没有特殊原因" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "`.server.ts` 是 Vite 强制的 server/client 隔离边界.",
      detail: "Remix / React Router 7 + Vite 约定: `.server.ts` 后缀的文件不会进入 client bundle. 如果 `db.server.ts` 被拉进浏览器, 其依赖树 (kysely / kysely-d1 / cloudflare-env.server.ts) 也会被打包, 其中可能包含 Worker-only API (如 `D1Database`), 在浏览器直接抛错, 且暴露服务端内部结构.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q4 normalizeParam 职责",
    prompt: "`normalizeParam` 对参数做了哪些归一化?",
    options: [
      { id: "A", text: "boolean → 1/0, undefined → null, Uint8Array/ArrayBuffer 透传, 其他 → String" },
      { id: "B", text: "全部 JSON.stringify" },
      { id: "C", text: "什么都不做, 直接透传" },
      { id: "D", text: "只接受 string" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "normalizeParam 把 JS 类型收敛到 D1 StatementParam 可接受的子集.",
      detail: "L7-25: `null / string / number` 直传; `boolean` 转成 1/0 (D1 INTEGER 语义); `Uint8Array / ArrayBuffer` 直传 (BLOB); `undefined` 转成 `null` (避免 D1 报错); 其他走 `String(value)`. 这是 D1 参数绑定前的最后一道收敛层, 防止非法类型进入原生 bind.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q5 get() 与 all() 的差异",
    prompt: "`D1PreparedStatementWrapper.get()` 与 `.all()` 的核心差异?",
    options: [
      { id: "A", text: "`get` 调用原生 `.first()` 返回 `T | undefined`; `all` 调用原生 `.all()` 返回 `T[]`" },
      { id: "B", text: "没有差异" },
      { id: "C", text: "`get` 返回数组, `all` 返回单条" },
      { id: "D", text: "`get` 在找不到时抛错" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "`get` 是 first-or-undefined, `all` 是 results-array.",
      detail: "L34-37: `all` 取 `result.results ?? []`, 永远返回数组. L39-42: `get` 取 `result ?? undefined`, 把 D1 的 `null` 转成 `undefined`. 这是应用层约定: `all` 不返回 null, `get` 用 undefined 表示'没有行'.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q6 参数绑定语义",
    prompt: "`db.prepare('SELECT * FROM user WHERE id = ?').bind(userId)` 的 `?` + `.bind` 语义?",
    options: [
      { id: "A", text: "`?` 是占位符, `.bind` 让 D1 引擎在查询层绑定参数, 防止 SQL 注入" },
      { id: "B", text: "`?` 是模板字符串插值, 运行时拼接" },
      { id: "C", text: "`?` 是正则表达式" },
      { id: "D", text: "没有语义, 只是风格" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "`?` + `.bind` 是 D1 参数化查询, 由引擎在查询层绑定, 不是字符串拼接.",
      detail: "L30-32: `bind(params)` 先 `map(normalizeParam)`, 再调用原生 `D1PreparedStatement.bind(...)`。D1 在 SQLite 层把参数作为绑定值处理, 用户输入中的单引号不会被解释为 SQL 语法, 从根本上阻断 SQL 注入. 这与字符串模板拼接 `` `${userId}` `` 有本质安全差异.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  // ─── 代码阅读 (Q7–Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: prepare 实际返回包装器",
    prompt: "下面哪一行是 'prepare 实际返回 D1PreparedStatementWrapper' 的关键?",
    code: "1 export const db = {\n" +
      "2   prepare<T = Record<string, unknown>>(query: string) {\n" +
      "3     return new D1PreparedStatementWrapper<T>(query);\n" +
      "4   },\n" +
      "5   async exec(sql: string) {\n" +
      "6     return getDatabaseBinding().exec(sql);\n" +
      "7   },\n" +
      "8 };",
    options: [],
    linePickLines: [
      { id: "L2", lineNumber: 2, text: "prepare<T = Record<string, unknown>>(query: string) {" },
      { id: "L3", lineNumber: 3, text: "return new D1PreparedStatementWrapper<T>(query);" },
      { id: "L6", lineNumber: 6, text: "return getDatabaseBinding().exec(sql);" },
    ],
    correctAnswer: { lineId: "L3" },
    explanation: {
      short: "L3 是实际返回 wrapper 的行, L2 只是函数签名.",
      detail: "L2 声明类型签名, L3 执行 `new D1PreparedStatementWrapper<T>(query)`, 把原始 SQL 封装进带 `.bind() / .all() / .get() / .run()` 的包装器. L6 是 `exec` 分支, 与 prepare 无关.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "fill_blank",
    title: "Q8 prepare 与模板字符串的本质区别",
    prompt: "`db.prepare('...')` 与模板字符串 `` `SELECT * WHERE id = ${id}` `` 的本质区别是?",
    options: [],
    correctAnswer: {
      values: {
        v: "前者让 D1 引擎在查询层通过 ? 占位符绑定参数, 后者是 JavaScript 字符串拼接, 用户输入可注入 SQL",
      },
    },
    blanks: [
      {
        id: "v",
        placeholder: "安全差异",
        acceptedAnswers: [
          "前者让 D1 引擎在查询层通过 ? 占位符绑定参数, 后者是 JavaScript 字符串拼接, 用户输入可注入 SQL",
          "prepare 用 bind 参数化, 模板字符串是拼接",
          "? 占位符由引擎绑定, ${} 是字符串插值",
        ],
      },
    ],
    explanation: {
      short: "prepare + bind 是引擎层参数化, 模板字符串是应用层拼接.",
      detail: "L30-32: `.bind(...params.map(normalizeParam))` 把参数交给 D1 引擎, 引擎在 SQLite 层做参数替换. 模板字符串 `` `${id}` `` 在 JS 运行时已经把用户输入拼进 SQL 文本, 单引号可被利用做注入. 这是 SQL 注入防御的第一道闸门.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q9 getAuthDb 返回什么",
    prompt: "`getAuthDb()` 返回的是什么? (多选)",
    options: [
      { id: "A", text: "`Kysely<AuthDatabase>` 实例, 封装了 D1Dialect" },
      { id: "B", text: "原始 `D1Database` binding" },
      { id: "C", text: "带缓存: 同一 binding 多次调用返回同一实例" },
      { id: "D", text: "SQL 字符串" },
    ],
    correctAnswer: { choiceIds: ["A", "C"] },
    explanation: {
      short: "`getAuthDb` 返回缓存的 Kysely 实例, 不是原始 binding.",
      detail: "L121-135: `authDbCache` + `authDbBinding` 双重缓存, 同一 `binding` 多次调用返回同一 `Kysely<AuthDatabase>` 实例. 这避免每次查询都重建 Kysely + D1Dialect 的开销. 返回的不是原始 `D1Database`, 而是 Kysely 查询构造器.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "line_pick",
    title: "Q10 关键行: boolean 转 INTEGER",
    prompt: "哪一行把 JavaScript `boolean` 转成 D1 可用的 INTEGER(1/0)?",
    code: "1 function normalizeParam(value: unknown): StatementParam {\n" +
      "2   if (value === null || typeof value === \"string\" || typeof value === \"number\") {\n" +
      "3     return value;\n" +
      "4   }\n" +
      "5   if (typeof value === \"boolean\") {\n" +
      "6     return value ? 1 : 0;\n" +
      "7   }\n" +
      "8   if (value instanceof Uint8Array || value instanceof ArrayBuffer) {\n" +
      "9     return value;\n" +
      "10  }\n" +
      "11  if (value === undefined) {\n" +
      "12    return null;\n" +
      "13  }\n" +
      "14  return String(value);\n" +
      "15 }",
    options: [],
    linePickLines: [
      { id: "L5", lineNumber: 5, text: "if (typeof value === \"boolean\") {" },
      { id: "L6", lineNumber: 6, text: "return value ? 1 : 0;" },
      { id: "L12", lineNumber: 12, text: "return null;" },
    ],
    correctAnswer: { lineId: "L6" },
    explanation: {
      short: "L6 是实际转换行, boolean true/false 变成 1/0.",
      detail: "L5 是分支判断, L6 执行 `value ? 1 : 0`. D1 SQLite 没有原生 boolean 类型, 应用层约定用 INTEGER 0/1 存储. 如果不转换, D1 可能把 boolean 序列化为字符串 'true'/'false', 导致查询条件失效.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "multi_choice",
    title: "Q11 run() 的返回结构",
    prompt: "`D1PreparedStatementWrapper.run()` 返回什么? (多选)",
    options: [
      { id: "A", text: "`{ changes: number; lastInsertRowid: number }`" },
      { id: "B", text: "原始 D1Result 对象" },
      { id: "C", text: "`lastInsertRowid` 从 `meta.last_row_id` 提取并转 Number" },
      { id: "D", text: "`T[]` 数组" },
    ],
    correctAnswer: { choiceIds: ["A", "C"] },
    explanation: {
      short: "`run` 收敛原生 meta, 返回受控的 `{ changes, lastInsertRowid }`.",
      detail: "L44-52: `run` 先调用原生 `.run()`, 再从 `result.meta` 提取 `changes` 和 `last_row_id`, 统一转成 `Number`. 不返回原始 D1Result (避免上层依赖原生结构), 也不返回数据数组 (那是 `all`/`get` 的职责). 这是 wrapper 层的收窄设计.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  // ─── 状态推理 (Q12–Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 参数缺失导致 D1 抛出异常",
    prompt: "调用 `db.prepare('SELECT * FROM messages WHERE user_id = ?').all()` 忘记传参, 完整错误链路?",
    options: [
      { id: "w1", text: "1. `db.prepare()` 创建 `D1PreparedStatementWrapper`" },
      { id: "w2", text: "2. `.all()` 内部调用 `bind([])` (空数组)" },
      { id: "w3", text: "3. `getDatabaseBinding()` 获取 `D1Database` binding" },
      { id: "w4", text: "4. 原生 `binding.prepare(query)` 拿到 `D1PreparedStatement`" },
      { id: "w5", text: "5. 原生 `.bind()` 发现 `?` 数量与参数数量不匹配" },
      { id: "w6", text: "6. D1 抛出 binding mismatch 异常" },
      { id: "w7", text: "7. 返回空数组 `[]`" },
    ],
    correctAnswer: { pathIds: ["w1", "w2", "w3", "w4", "w5", "w6"] },
    explanation: {
      short: "空数组 bind 遇到 SQL 中的 `?`, D1 在引擎层抛异常, 不会返回空数组.",
      detail: "L34-35: `all()` 调用 `this.bind(params)`, params 为空数组. L31: 原生 `.bind(...[])` 等价于 `.bind()` 无参. SQL 文本里有一个 `?`, D1 执行时发现占位符未绑定, 抛出异常. 这不是返回空结果, 而是运行时错误. 工程上应确保调用方传齐参数.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q13 查询无行时 get() 的行为",
    prompt: "`db.prepare('SELECT * FROM user WHERE id = ?').bind(999).get()` 查不到行时返回?",
    options: [
      { id: "A", text: "`undefined` (因为 `.first()` 返回 `null`, 然后 `?? undefined`)" },
      { id: "B", text: "`null`" },
      { id: "C", text: "抛出 'Not found' 错误" },
      { id: "D", text: "`[]`" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "`get` 把 D1 的 `null` 收敛为 `undefined`, 与 `all` 的 `[]` 区分.",
      detail: "L39-42: `const result = await this.bind(params).first<T>(); return result ?? undefined;`. D1 `.first()` 在无行时返回 `null`. wrapper 层把它转成 `undefined`, 这样应用层可以用 `if (row)` 或可选链安全判断, 而不需要区分 `null` vs `undefined`.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q14 D1 事务语义",
    prompt: "Cloudflare D1 在 Workers 上的事务限制?",
    options: [
      { id: "A", text: "D1 不支持多语句 `BEGIN...COMMIT` 事务; 需要应用层用单语句或乐观锁模拟" },
      { id: "B", text: "完整 ACID 多语句事务, 与 PostgreSQL 相同" },
      { id: "C", text: "只支持读事务, 写操作自动回滚" },
      { id: "D", text: "不支持任何事务语义" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "D1 当前版本不支持多语句事务, 需应用层设计补偿或乐观锁.",
      detail: "db.server.ts L146-149 的 `initializeDatabase` 为空函数, 因为 schema 由 Wrangler migration 管理, 而非应用层事务. D1 的限制意味着: (1) 不能在同一请求里 BEGIN → UPDATE → COMMIT; (2) 竞争写需要应用层版本号 / CAS; (3) 批量写要用 `batch` API 而不是多语句事务块.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  q({
    type: "single_choice",
    title: "Q15 SQL 残留未绑定 ?",
    prompt: "`db.prepare('UPDATE user SET name = ? WHERE id = ?').bind('Alice')` 只传了一个参数, 执行时?",
    options: [
      { id: "A", text: "D1 抛出 binding mismatch / 参数数量不匹配错误" },
      { id: "B", text: "第二个 `?` 被当作字符串字面量" },
      { id: "C", text: "自动补 `null`" },
      { id: "D", text: "只更新 name, id 条件被忽略" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "占位符数量与 bind 参数数量必须严格一致, 否则 D1 抛错.",
      detail: "L31: `bind(...params.map(normalizeParam))`. 如果 SQL 有 2 个 `?` 但只传 1 个参数, D1 原生 `.bind('Alice')` 会检测到参数不足, 抛出异常. 这与某些 ORM 的自动补 null 行为不同, D1 更严格. 这要求调用方保证占位符与参数一一对应.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
  // ─── AI 改坏 (Q16–Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 把用户输入内联进 SQL 字符串 (SQL 注入)",
    prompt: "AI 改坏: AI 觉得 `.bind()` 太啰嗦, 把 `db.prepare('SELECT * FROM messages WHERE user_id = ?').bind(userId)` 改成 `db.prepare(\`SELECT * FROM messages WHERE user_id = '${userId}'\`)`. 后果是?",
    options: [
      { id: "A", text: "SQL 注入 — userId 含单引号时可拼接任意 SQL, 导致数据泄露 / 篡改 / 删除" },
      { id: "B", text: "TypeScript 编译失败" },
      { id: "C", text: "查询更快" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "模板字符串拼接 = 把用户输入直接嵌入 SQL 文本, 完全失去参数绑定保护.",
      detail: "原代码 L30-32 走 `?` + `.bind`, D1 引擎在查询层替换占位符, 用户输入中的 `' OR '1'='1` 不会被解释为 SQL 语法. 改成模板字符串后, 输入直接拼进 SQL: `WHERE user_id = '' OR '1'='1'`, 瞬间返回全表. 这是经典的 SQL 注入, OWASP Top 10 之首.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "攻击者输入 `'; DROP TABLE messages; --` 导致消息表被删, 生产数据永久丢失.",
    aiReviewRisk: "为'少写一行 bind' 破坏参数化查询契约, 把引擎层安全降级成字符串拼接.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 字符串常量完全合法.",
      C: "不会更快, 且失去安全.",
      D: "有严重安全影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 引用 §12.2-TS-3 client 导入 server 模块",
    prompt: "AI 改坏: AI 觉得 '前端需要直接查消息', 在 `MessageList.client.tsx` 顶部加 `import { db } from '~/lib/db.server'`. 后果是?",
    options: [
      { id: "A", text: "client 把 db.server 整树拉进 bundle, 包含 D1 binding / cloudflare-env.server / 可能的 secret, 严重安全事件" },
      { id: "B", text: "useState 会变慢" },
      { id: "C", text: "TypeScript 编译会失败" },
      { id: "D", text: "React 19 不支持这个 import" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "client 不能 import `.server.ts`, 会把服务端依赖打进浏览器.",
      detail: "`db.server.ts` 依赖 `getDatabaseBinding` → `cloudflare-env.server.ts` → Worker-only API. 即使只 import `db` 一个对象, Vite bundler 会拉入整棵依赖树. 结果: (1) 浏览器打包体积暴涨; (2) Worker-only 模块在浏览器运行时报错; (3) 如果依赖树含 env var 或 secret, 直接暴露给前端. 正确做法是前端通过 loader/action 向服务端请求数据, 不直接触碰 DB 层.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [PRIMARY, "app/components/messages/MessageList.client.tsx"],
    realWorldImpact: "开发者打开 dev tools 看到 D1 binding 和内部 env 变量, 攻击者可构造直接请求绕过前端校验.",
    aiReviewRisk: "为了'前端直接查数据' 跨 server/client 边界 import, 破坏 secret 与 Worker-only 隔离.",
    wrongAnswerFeedback: {
      B: "useState 与 import 来源无关.",
      C: "TS 不会报错, 这正是危险之处.",
      D: "React 19 不限制 import, 这是 RR/vite 的文件后缀约定.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 吞没 D1 错误",
    prompt: "AI 改坏: AI 在 catch 里把 D1 error 直接压缩成 'db failed' 返回给前端. 后果是?",
    options: [
      { id: "A", text: "生产调试丢失 status / query / binding / message 等边界证据, 无法区分是 SQL 语法错误还是 binding 不匹配" },
      { id: "B", text: "前端样式会乱" },
      { id: "C", text: "TypeScript 编译失败" },
      { id: "D", text: "session 会被清" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "错误必须是结构化日志 + 友好前端文案, 不能丢失边界证据.",
      detail: "D1 抛出的原生错误包含 SQL 文本位置、binding 数量、约束冲突字段等信息. 压缩成 'db failed' 后, 线上排查时无法分辨是 (1) SQL 语法错 (2) 参数不匹配 (3) 唯一约束冲突 (4) D1 临时不可用. 正确做法: 前端显示固定友好文案, 服务端日志保留完整 error 对象.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "线上某条 UPDATE 持续 500, 只能看到 'db failed', 无法判断是字段缺失还是 D1 容量限制, 排查耗时从分钟级涨到小时级.",
    aiReviewRisk: "把错误处理当成'用户体验优化', 实际上破坏了生产可观测性.",
    wrongAnswerFeedback: {
      B: "错误文案与样式无关.",
      C: "TS 编译与运行时 catch 内容无关.",
      D: "错误处理与 session 清理无关.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 AI 在日志里打印原始行数据 (PII)",
    prompt: "AI 改坏: AI 在调试时把 `const result = await this.bind(params).all<T>()` 改成 `console.log(result.results)` 并保留到生产代码. 后果是?",
    options: [
      { id: "A", text: "原始行数据 (email / token / 手机号等 PII) 被写入服务端日志, 隐私泄露 + 合规风险" },
      { id: "B", text: "日志更清晰" },
      { id: "C", text: "TypeScript 编译失败" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "原始行数据含 PII, 不能无差别写入日志.",
      detail: "`result.results` 是 D1 返回的完整行数组, 可能含 user.email / session.token / message.content 等敏感信息. 生产日志通常被 ELK / Splunk / wrangler tail 收集, 多人流转. 打印原始行等于把 PII 扩散到日志系统, 违反 GDPR / 个保法. 正确做法: 只打印脱敏后的 ID 或计数, 数据内容必须脱敏.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
    realWorldImpact: "运维在 tail 日志中看到用户明文邮箱和会话 token, 内部泄露风险; 合规审计时被开罚单.",
    aiReviewRisk: "把'调试方便'当成'无害日志', 忽略了 PII 在日志系统的永久留存.",
    wrongAnswerFeedback: {
      B: "清晰 ≠ 合法, PII 必须脱敏.",
      C: "TS 不会报错.",
      D: "有严重隐私与合规影响.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 重复造 DB binding 查找轮子",
    prompt: "AI 改坏: AI 在某个路由里直接写 `const binding = context.cloudflare.env.DB; const stmt = binding.prepare(query);` 而不是复用 `db.prepare` 或 `getAuthDb`. 后果是?",
    options: [
      { id: "A", text: "路由层直接依赖 `env.DB` 字段名和原生 D1 API, 失去 normalizeParam / 类型包装 / 缓存; 换绑定名或加中间层时改动面扩散到所有路由" },
      { id: "B", text: "TypeScript 编译失败" },
      { id: "C", text: "查询更快" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "绕过 wrapper = 破坏统一入口, 重复代码扩散.",
      detail: "`db.prepare` 提供 `normalizeParam` + `D1PreparedStatementWrapper` + 统一返回结构. 直接写 `env.DB.prepare` 意味着: (1) 参数类型未经 normalizeParam, boolean/undefined 可能让 D1 行为异常; (2) 返回原生 D1Result, 上层需各自处理 meta; (3) `env.DB` 字段名硬编码, 如果未来改 binding 名或加代理, 需全局搜索替换. 这是经典的 DRY 破坏.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY, ENV],
    realWorldImpact: "项目从 D1 迁移到 Postgres 时, 30 个路由都硬编码了 `env.DB`, 重构成本从改 1 个 wrapper 变成改 30 个文件.",
    aiReviewRisk: "把'少一层封装'当成'更直接', 实际破坏统一抽象与缓存策略.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 原生 API 也有类型.",
      C: "不会更快, 反而失去缓存和归一化.",
      D: "有严重维护性影响.",
    },
  }),
  // ─── 自由作答 (Q21–Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 db.server.ts 的三道 invariant",
    prompt: "用自己的话解释 db.server.ts 维护的 3 个不变量: (1) binding 中心化 (normalizeParam + wrapper) (2) 参数绑定 (只用 `?` + `.bind`, 禁止模板字符串拼接) (3) server-only (`.server.ts` 后缀 + 不暴露给 client). 这 3 个不变量如何共同防止 SQL 注入 / secret 泄露 / 数据不一致.",
    options: [],
    correctAnswer: {
      text: "3 个不变量: (1) binding 中心化: `normalizeParam` 收敛 boolean/undefined 等边缘类型, `D1PreparedStatementWrapper` 统一 `.all()/.get()/.run()` 返回结构, 避免每个路由重复处理 meta 和类型转换; (2) 参数绑定: `?` + `.bind` 让 D1 引擎在查询层替换参数, 用户输入永远不可能被解释为 SQL 语法, 这是 SQL 注入的根本防御; (3) server-only: `.server.ts` 阻止文件进入 client bundle, 确保 D1 binding 和内部 env 只存在于 Worker 运行时. 3 者缺一不可: 如果删参数绑定, 即使有 wrapper 也会注入; 如果删 server-only, secret 会泄露到浏览器; 如果删中心化, 类型错误和原生 API 变更会扩散到全站.",
    },
    explanation: {
      short: "3 道 invariant 形成安全 + 类型 + 边界的纵深防御.",
      detail: "好的解释能逐层说明 wrapper / bind / .server.ts 的独立职责, 并指出它们互相不可替代.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 一句 PR review",
    prompt: "PR 把 `db.prepare('SELECT * FROM messages WHERE user_id = ?').bind(userId)` 改成 `db.prepare(\`SELECT * FROM messages WHERE user_id = '${userId}'\`)`, 理由是 '少一次 bind 调用, 更直观'. 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "`?` + `.bind` 是 D1 参数化查询的防注入契约, 模板字符串拼接把用户输入直接嵌入 SQL 文本, 等同于主动开放 SQL 注入面 (timu.MD §12.2-TS-3 同类边界破坏). 请恢复 `.bind(userId)`, 查询层安全优先于'直观'.",
    },
    explanation: {
      short: "审查点: 参数绑定是安全契约, 不能为'少一行'妥协.",
      detail: "好的 review 指出 (1) 安全契约 (2) 注入风险 (3) 引用规范 (4) 给出明确恢复指令.",
    },
    abilityTags: ["backend.validation.field", "ai.review.architecture"],
    sourceFilePath: PRIMARY,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [PRIMARY],
  }),
];
