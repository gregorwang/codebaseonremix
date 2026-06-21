/**
 * Real questions for site-20-d1-errors-capstone / migrations.
 *
 * Anchor: remix/migrations/0001_init.sql through 0009_nemesis_feedback_audit_fields.sql.
 *
 * 学习目标: 理解 D1 migration 的命名、不可变性、append-only 纪律、
 *   defer_foreign_keys  pragma、CREATE vs ALTER  lineage、
 *   已应用状态与 dev/prod 分叉风险、AI 改坏 migration 的典型反例.
 *
 * 题目数: 22.
 */

import { q } from "../../types";
import type { RealQ } from "../index";

const M01 = "migrations/0001_init.sql";
const M02 = "migrations/0002_create_redeem_tokens.sql";
const M03 = "migrations/0003_hidden_supply_claims.sql";
const M04 = "migrations/0004_hidden_supply_echo_tokens.sql";
const M05 = "migrations/0005_better_auth_admin_user_fields.sql";
const M06 = "migrations/0006_create_nemesis_guard_events.sql";
const M07 = "migrations/0007_nemesis_guard_v02_audit_fields.sql";
const M08 = "migrations/0008_nemesis_model_audit_fields.sql";
const M09 = "migrations/0009_nemesis_feedback_audit_fields.sql";
const TOUCHED = [M01, M02, M03, M04, M05, M06, M07, M08, M09];

export const migrationsQuestions: RealQ[] = [
  // ─── 基础识别 (Q1–Q6) ────────────────────────────────────────────────────
  q({
    type: "single_choice",
    title: "Q1 migration 文件命名规则",
    prompt: "`0001_init.sql` 的命名规则含义?",
    options: [
      { id: "A", text: "`0001` 是字典序执行顺序, `init` 描述内容 — wrangler 按文件名排序依次 apply" },
      { id: "B", text: "`0001` 是 git commit 序号" },
      { id: "C", text: "`init` 是表名前缀" },
      { id: "D", text: "无规则, 随便命名" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "数字前缀保证字典序即执行序, 描述后缀让人一眼知道内容.",
      detail: "wrangler d1 migrations apply 按文件名字母顺序执行. `0001_` < `0002_` < `0003_`, 这样团队协作时不会撞顺序. 若把 0009 之后的新 migration 命名为 00010_ 而不是 00010_, 字典序 00010 会排在 0002 前面, 导致灾难性顺序错误.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M01,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q2 0001_init.sql 初始化范围",
    prompt: "0001_init.sql 创建了哪些表?",
    options: [
      { id: "A", text: "user / session / account / verification (better-auth 核心) + messages / rate_limits (应用初始表)" },
      { id: "B", text: "只有 messages" },
      { id: "C", text: "只有 rate_limits" },
      { id: "D", text: "没有表, 只有索引" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "0001 是'big bang'初始化: better-auth 四表 + 应用两表 + 六个索引.",
      detail: "L3-11 user, L13-23 session, L25-41 account, L43-50 verification (better-auth 默认四表). L52-61 messages, L63-69 rate_limits (应用业务表). 以及 L71-76 六个索引. 这是项目从零到一的 schema 基线, 后续 migration 全部在此基础上 append.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M01,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [M01],
  }),
  q({
    type: "single_choice",
    title: "Q3 CREATE TABLE vs ALTER TABLE 比例",
    prompt: "从 0001 到 0009, 新建表与修改已有表的模式分布?",
    options: [
      { id: "A", text: "0001/0002/0006 新建表; 0003/0004/0005/0008/0009 以 ALTER TABLE 扩列; 0007 是'建新表→迁数据→删旧表→重命名'的复杂重构" },
      { id: "B", text: "全部新建表" },
      { id: "C", text: "全部 ALTER TABLE" },
      { id: "D", text: "没有规律" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "早期建表, 后期扩列; 0007 是唯一一次表级重构.",
      detail: "0001 建 6 表, 0002 建 redeem_tokens, 0006 建 nemesis_guard_events. 0003 改 redeem_tokens + 新建 hidden_supply_interactions; 0004 改 hidden_supply_interactions; 0005 改 user; 0008 改 nemesis_guard_events; 0009 改 nemesis_guard_events. 0007 最特殊: 建 v02 新表 → INSERT SELECT 迁移 → DROP 旧表 → RENAME → 重建索引. 这是 SQLite/D1 不支持 ALTER TABLE DROP COLUMN 时的标准 workaround.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M06,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q4 已应用 migration 的不可变性",
    prompt: "已经 `wrangler d1 migrations apply --remote` 跑过的 0003_hidden_supply_claims.sql 被直接编辑, 最大后果?",
    options: [
      { id: "A", text: "dev/prod 状态分叉 — remote 的 d1_migrations 已记录该文件已执行, 不会重跑; 新同事本地 fresh 建库却拿到编辑后的 schema" },
      { id: "B", text: "wrangler 自动检测到变更并重跑" },
      { id: "C", text: "CI 会报 TypeScript 错误" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "已应用的 migration 是 immutable 的, 编辑它只会制造 dev/prod 分叉.",
      detail: "wrangler 通过 d1_migrations 表记录已 apply 的文件名. 编辑旧文件不会触发重新执行, remote 状态不变; 但本地新环境或 CI fresh 数据库会按新文件执行, 导致'同样的代码在不同环境表现不同'. 正确做法: 发现旧 migration 有错 → 追加新 migration (ALTER TABLE / UPDATE) 修正, 而不是改历史.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M03,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: [M03],
  }),
  q({
    type: "single_choice",
    title: "Q5 wrangler 如何跟踪已应用 migration",
    prompt: "wrangler 怎么知道某个 migration 是否已经跑过?",
    options: [
      { id: "A", text: "D1 内部自动维护 `d1_migrations` 表, 记录文件名 + 应用时间; apply 时跳过已存在的记录" },
      { id: "B", text: "比较文件 md5" },
      { id: "C", text: "看 git tag" },
      { id: "D", text: "手动在 wrangler.toml 打勾" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "`d1_migrations` 是 wrangler 的元数据表, 文件名是唯一键.",
      detail: "每次 `wrangler d1 migrations apply` 时, wrangler 查询 remote D1 的 d1_migrations 表, 只执行不在表中的文件. 这意味着: (1) 重命名文件 = 新文件, 会重复执行; (2) 编辑文件内容不改变文件名 = 不会重跑; (3) 删除文件 = 已执行记录仍在, remote 不会回滚. 这是 immutable + append-only 的工程基础.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M01,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "single_choice",
    title: "Q6 defer_foreign_keys 的作用",
    prompt: "D1 migration 文件顶部的 `PRAGMA defer_foreign_keys = TRUE` 作用?",
    options: [
      { id: "A", text: "在本次事务中推迟外键检查到 COMMIT 时, 允许迁移语句以任意顺序执行 (如先 INSERT 子表再补父表, 或重命名表时临时断链)" },
      { id: "B", text: "永久关闭所有外键约束" },
      { id: "C", text: "加速 SELECT 查询" },
      { id: "D", text: "自动给每个表加 FOREIGN KEY" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "defer_foreign_keys 让迁移事务内的中间状态可以暂时违反 FK, 只要最终提交时一致.",
      detail: "0001_init.sql 中 session.userId → user.id 有 FK. 若 migration 里先 INSERT session 再 INSERT user, 没有 defer 会立即报错. PRAGMA defer_foreign_keys = TRUE 把检查推迟到事务结束, 让开发者按逻辑分组写 SQL, 不必精确排序. 这是 D1/SQLite migration 的标准安全头.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M01,
    layer: "basic",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  // ─── 代码阅读 (Q7–Q11) ──────────────────────────────────────────────────
  q({
    type: "line_pick",
    title: "Q7 关键行: defer_foreign_keys pragma",
    prompt: "下面哪一行是 D1 migration 的标准安全头?",
    code: `1 PRAGMA defer_foreign_keys = TRUE;
2 -- Initial schema for Cloudflare D1
3 CREATE TABLE IF NOT EXISTS user (
4   id TEXT PRIMARY KEY,
5   email TEXT UNIQUE NOT NULL,
6   createdAt INTEGER NOT NULL
7 );`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "PRAGMA defer_foreign_keys = TRUE;" },
      { id: "L2", lineNumber: 2, text: "-- Initial schema for Cloudflare D1" },
      { id: "L3", lineNumber: 3, text: "CREATE TABLE IF NOT EXISTS user (" },
    ],
    correctAnswer: { lineId: "L1" },
    explanation: {
      short: "L1 是 defer_foreign_keys pragma, 推迟 FK 检查到事务提交.",
      detail: "L1 是每份 migration 的第一道闸门. L2 是注释; L3 是建表语句. 没有 L1, 任何违反中间状态的 INSERT/RENAME 都会立即抛 FOREIGN KEY constraint failed, 导致 migration 中断.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M01,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [M01],
  }),
  q({
    type: "fill_blank",
    title: "Q8 哪个 migration 创建 nemesis_guard_events",
    prompt: "第 __ 个 migration 创建了 `nemesis_guard_events` 表.",
    options: [],
    correctAnswer: { values: { v: "0006" } },
    blanks: [
      {
        id: "v",
        placeholder: "migration 编号 (如 0006)",
        acceptedAnswers: ["0006", "6"],
      },
    ],
    explanation: {
      short: "0006_create_nemesis_guard_events.sql 创建审计表.",
      detail: "0006 是 Nemesis Guard 审计的起点. 它定义了 user_id / message / message_digest / stage / label / confidence / created_at, 以及四个索引. 后续 0007 重构该表、0008 加模型字段、0009 加反馈字段, 形成完整的审计 lineage.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M06,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [M06, M07, M08, M09],
  }),
  q({
    type: "multi_choice",
    title: "Q9 0006 DDL 列约束",
    prompt: "`nemesis_guard_events` (0006) 的真实列约束? (多选)",
    options: [
      { id: "A", text: "`id INTEGER PRIMARY KEY AUTOINCREMENT`" },
      { id: "B", text: "`stage TEXT NOT NULL CHECK(stage IN ('input_length','hard_rule','workers_ai_classifier'))`" },
      { id: "C", text: "`confidence REAL`" },
      { id: "D", text: "`token_code TEXT UNIQUE`" },
    ],
    correctAnswer: { choiceIds: ["A", "B", "C"] },
    explanation: {
      short: "A/B/C 是 0006 的真实列; D 是 0002 redeem_tokens 的列, 张冠李戴.",
      detail: "0006 L2: id INTEGER PRIMARY KEY AUTOINCREMENT. L7-11: stage TEXT NOT NULL CHECK(...). L13: confidence REAL. token_code 在 0002 的 redeem_tokens 中. 多选陷阱在于'列名看起来都很合理', 但必须锚定到具体表的 DDL.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M06,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [M06, M02],
  }),
  q({
    type: "line_pick",
    title: "Q10 关键行: 添加 feedback_status 的 ALTER TABLE",
    prompt: "下面哪一行在 0009 中给 nemesis_guard_events 添加了 `feedback_status`?",
    code: `1 ALTER TABLE nemesis_guard_events ADD COLUMN event_source TEXT NOT NULL DEFAULT 'guard';
2 ALTER TABLE nemesis_guard_events ADD COLUMN assistant_message TEXT;
3 ALTER TABLE nemesis_guard_events ADD COLUMN recent_messages TEXT;
4 ALTER TABLE nemesis_guard_events ADD COLUMN conversation_id TEXT;
5 ALTER TABLE nemesis_guard_events ADD COLUMN user_message_id TEXT;
6 ALTER TABLE nemesis_guard_events ADD COLUMN assistant_message_id TEXT;
7 ALTER TABLE nemesis_guard_events ADD COLUMN feedback_category TEXT;
8 ALTER TABLE nemesis_guard_events ADD COLUMN feedback_note TEXT;
9 ALTER TABLE nemesis_guard_events ADD COLUMN feedback_status TEXT NOT NULL DEFAULT 'open';`,
    options: [],
    linePickLines: [
      { id: "L1", lineNumber: 1, text: "ALTER TABLE nemesis_guard_events ADD COLUMN event_source TEXT NOT NULL DEFAULT 'guard';" },
      { id: "L5", lineNumber: 5, text: "ALTER TABLE nemesis_guard_events ADD COLUMN user_message_id TEXT;" },
      { id: "L9", lineNumber: 9, text: "ALTER TABLE nemesis_guard_events ADD COLUMN feedback_status TEXT NOT NULL DEFAULT 'open';" },
    ],
    correctAnswer: { lineId: "L9" },
    explanation: {
      short: "L9 添加 feedback_status, DEFAULT 'open' 保证已有行不 NULL.",
      detail: "0009 是 9 个 ALTER TABLE 的'批量扩列'迁移. L9 的 feedback_status 有 NOT NULL DEFAULT 'open', 这是关键: 已有数据行必须拿到默认值, 否则 NOT NULL 会在 ALTER 时失败. event_source (L1) 也有同样设计. 没有 DEFAULT 的列 (如 L2-L8) 允许 NULL, 因此不会阻塞已有数据.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M09,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [M09],
  }),
  q({
    type: "single_choice",
    title: "Q11 0007 的表重构手法",
    prompt: "0007_nemesis_guard_v02_audit_fields.sql 的核心操作?",
    options: [
      { id: "A", text: "创建 nemesis_guard_events_v02 新表 → INSERT SELECT + CASE 转换旧数据 → DROP 旧表 → RENAME 新表 → 重建全部索引" },
      { id: "B", text: "直接用 ALTER TABLE 删列" },
      { id: "C", text: "创建视图覆盖旧表" },
      { id: "D", text: "无操作" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "0007 是 SQLite 不支持 ALTER TABLE DROP COLUMN 时的标准重构舞步.",
      detail: "L2-36 建 v02 新表 (含 mode/category/rule_id 等新列). L39-80 INSERT SELECT 把旧表数据按 CASE 映射到新结构. L83 DROP TABLE 旧表. L85 ALTER TABLE ... RENAME TO. L87-106 重建索引. 这是 D1/SQLite 里'改表结构'的唯一可靠方式, 比直接改旧表更安全 (旧数据有完整备份直到 DROP).",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M07,
    layer: "code-reading",
    serverClientBoundary: "server",
    touchedFiles: [M07, M06],
  }),
  // ─── 状态推理 (Q12–Q15) ────────────────────────────────────────────────
  q({
    type: "branch_trace",
    title: "Q12 编辑已应用 migration 的后果链",
    prompt: "开发者发现 0005 给 user 表加的 `role` 字段缺了个默认值, 直接在本地编辑 0005 文件补充 DEFAULT 'user', 不创建新 migration. 后果链?",
    options: [
      { id: "edit", text: "编辑 0005 文件" },
      { id: "local", text: "本地 fresh 数据库按新文件建表, role 有 DEFAULT" },
      { id: "remote", text: "remote D1 的 d1_migrations 已记录 0005, 不会重跑, role 无 DEFAULT" },
      { id: "drift", text: "dev schema 与 prod schema 分叉" },
      { id: "deploy", text: "后续依赖 DEFAULT 的代码在 prod 插入失败或行为异常" },
      { id: "fix", text: "正确修复应追加 000X ALTER TABLE ... SET DEFAULT" },
    ],
    correctAnswer: { pathIds: ["edit", "local", "remote", "drift", "deploy", "fix"] },
    explanation: {
      short: "6 步: 编辑 → local 新 / remote 旧 → 分叉 → 生产异常 → 应追加 migration 修复.",
      detail: "这是 migration immutable 纪律的核心反例. 一旦 remote 已应用, 文件就是'history', 只能 read, 不能 write. 任何'编辑历史'的尝试都会让不同环境走向不同状态, 调试时像'薛定谔的 schema'. 正确做法是: 发现问题 → 新建 migration (ALTER TABLE ... SET DEFAULT 或 UPDATE) → apply → 所有环境统一.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M05,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [M05],
  }),
  q({
    type: "single_choice",
    title: "Q13 local vs remote migration drift",
    prompt: "团队 A 成员本地已跑 0001-0009, 随后手动改了 0003 给 redeem_tokens 加了一列; 团队 B 从仓库拉取原始文件后执行 `wrangler d1 migrations apply --remote`. remote 状态?",
    options: [
      { id: "A", text: "A 的本地有该列但 remote 没有; B 按原始 0003 执行后 remote 与 A 本地永久分叉" },
      { id: "B", text: "remote 自动检测到 A 的修改并同步" },
      { id: "C", text: "B 的 apply 会失败" },
      { id: "D", text: "完全一致" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "手动改旧 migration = 本地孤岛 schema, remote 永远追不上.",
      detail: "wrangler 只看文件名是否在 d1_migrations 表中, 不看文件内容 hash. A 改内容不改文件名 → local 和 remote 执行的是'同名不同内容'的脚本. B 执行原始文件 → remote 拿到 A 修改前的 schema. 从此 A 的代码假设 redeem_tokens 有新列, 但 remote 没有, INSERT/SELECT 语法在 prod 报错.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M03,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [M03],
  }),
  q({
    type: "single_choice",
    title: "Q14 defer_foreign_keys 对插入顺序的影响",
    prompt: "0001_init.sql 中 session 表有 `FOREIGN KEY (userId) REFERENCES user(id)`. 若 migration 顶部有 `PRAGMA defer_foreign_keys = TRUE`, 下面哪种插入顺序不会报错?",
    options: [
      { id: "A", text: "先 INSERT session, 再 INSERT user — FK 检查被推迟到事务提交, 只要最终 user 存在即可" },
      { id: "B", text: "先 INSERT session, 不 INSERT user — 事务提交时仍报错" },
      { id: "C", text: "defer 会完全禁用 FK, 不报错" },
      { id: "D", text: "必须严格先父表后子表, 与 defer 无关" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "defer 允许中间状态乱序, 但提交时必须满足 FK; 不是禁用 FK.",
      detail: "PRAGMA defer_foreign_keys = TRUE 把 FOREIGN KEY 检查从'语句级'推迟到'事务级'. 选项 A: 先子后父, 事务结束前补上父表, 提交时合法 → 通过. 选项 B: 一直不补父表, 提交时仍违反 → 失败. 选项 C 是常见误解: defer ≠ disable. 选项 D 忽略 defer 的存在意义.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M01,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [M01],
  }),
  q({
    type: "single_choice",
    title: "Q15 跳过 0006 直接执行 0007",
    prompt: "假设 remote D1 从未跑过 0006, 直接执行 0007. 后果?",
    options: [
      { id: "A", text: "0007 的 `FROM nemesis_guard_events` 找不到源表, migration 报错并回滚" },
      { id: "B", text: "自动创建空表后继续" },
      { id: "C", text: "wrangler 自动补跑 0006" },
      { id: "D", text: "无影响, 0007 独立运行" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "migration 有依赖顺序, 跳号 = 缺失前置表/列, 必然报错.",
      detail: "0007 L39-80: `INSERT INTO nemesis_guard_events_v02 (...) SELECT ... FROM nemesis_guard_events`. 如果 0006 没跑, nemesis_guard_events 不存在, SELECT 直接报 `no such table: nemesis_guard_events`, 整个 migration 事务回滚. 这是 append-only 顺序的硬约束: 0001 < 0002 < ... < 0009, 不能跳.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M07,
    layer: "state-reasoning",
    serverClientBoundary: "server",
    touchedFiles: [M07, M06],
  }),
  // ─── AI 改坏 (Q16–Q20) ──────────────────────────────────────────────────
  q({
    type: "ai_review",
    title: "Q16 AI 编辑已应用的 migration 改字段类型",
    prompt: "AI 改坏: AI 发现 0003 的 `message_preview TEXT` 应该用 `BLOB` 存二进制预览, 直接编辑 0003 文件把 TEXT 改成 BLOB. 最大风险?",
    options: [
      { id: "A", text: "remote 已跑过 0003, wrangler 不会重跑; dev/prod 分叉, 新同事本地 fresh 建库得到 BLOB, 与 remote TEXT 不一致" },
      { id: "B", text: "wrangler 自动检测并重跑" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "已应用的 migration 不可编辑, 否则环境间 schema 漂移.",
      detail: "与 §22.4-3 手改歌词 JSON 同构: 生成/已应用产物不可编辑. AI 把 migration 当成普通源文件修改, 破坏 immutable 契约. remote 继续按旧 TEXT 运行, 本地新环境按 BLOB 运行, 代码层序列化/反序列化在不同环境表现不同, 出现'本地正常线上崩'的幽灵 bug.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M03,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [M03],
    realWorldImpact: "新同事入职本地 dev 一切正常, 部署到 prod 后字段类型不一致导致序列化 bug, 排查数小时才发现是 AI 改了旧 migration.",
    aiReviewRisk: "把已应用的 migration 当成可编辑的源代码, 破坏 immutable 契约.",
    wrongAnswerFeedback: {
      B: "wrangler 不比较文件内容, 只看 d1_migrations 表.",
      C: "SQL 文件改动不会触发 TS 报错.",
      D: "有严重的 dev/prod 分叉风险.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q17 AI 删掉 defer_foreign_keys pragma",
    prompt: "AI 改坏: AI 觉得 `PRAGMA defer_foreign_keys = TRUE` '掩盖了真正的数据问题', 从所有 migration 顶部删掉. 最大风险?",
    options: [
      { id: "A", text: "迁移中若先 INSERT 子表再 INSERT 父表 (或重命名表时临时断链), 会立即报 FOREIGN KEY constraint failed, 导致迁移中断" },
      { id: "B", text: "查询更快" },
      { id: "C", text: "更安全, 因为 fail fast" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "defer 是迁移事务的安全网, 删掉后中间状态必须时刻满足 FK, 极大增加迁移复杂度.",
      detail: "0007 的 v02 重构: 新表有 FK(user_id), INSERT SELECT 时旧数据可能因历史原因有孤儿引用, 或表重命名期间 FK 临时指向不存在的表. defer 允许这些中间状态在事务内存在, 只要最终提交时一致. 删掉 pragma 后, 任何中间违反都立即抛错, 复杂迁移几乎不可能写成单一事务.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M01,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
    realWorldImpact: "CI 部署时 migration 在子表 INSERT 阶段直接失败, 整批 migration 回滚, 服务上线被阻断.",
    aiReviewRisk: "把'fail fast'当成无条件正确, 忽略迁移事务中允许临时不一致的工程必要性.",
    wrongAnswerFeedback: {
      B: "defer 与查询性能无关.",
      C: "在迁移事务中'fail fast'等于'无法完成合法重构'.",
      D: "有严重的迁移失败风险.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q18 AI 在热迁移里用 DROP TABLE CASCADE",
    prompt: "AI 改坏: AI 在 0007 里把 `DROP TABLE nemesis_guard_events` 改成 `DROP TABLE nemesis_guard_events CASCADE`, 理由是'清理更彻底'. 最大风险?",
    options: [
      { id: "A", text: "CASCADE 会级联删除所有依赖该表的对象和数据; 若该表仍有生产数据未被备份, 直接永久丢失, 且 D1/SQLite 对此语法支持有限, 行为不可预期" },
      { id: "B", text: "更干净" },
      { id: "C", text: "只删表结构, 不删数据" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "DROP TABLE 在热迁移中是高危操作, CASCADE 会放大破坏面.",
      detail: "0007 的 DROP 是在 INSERT SELECT 已成功迁移数据之后才执行的, 本身安全. 但加上 CASCADE 后, 若有其他表/触发器/视图依赖 nemesis_guard_events, 会被一并删除. 生产环境通常有备份策略, 但 hot migration 中的级联删除可能在备份前发生. 此外 SQLite 的 DROP 语法不标准支持 CASCADE, AI 写出这句本身就可能导致迁移语法错误.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M07,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [M07],
    realWorldImpact: "prod 迁移时级联删掉关联的索引或视图, 服务查询直接 500, 恢复需从备份重建.",
    aiReviewRisk: "为'彻底'在 hot migration 中加 CASCADE, 把可控的单表删除变成不可控的级联爆炸.",
    wrongAnswerFeedback: {
      B: "干净 ≠ 安全, 级联删除不可逆.",
      C: "DROP TABLE 会删数据和结构.",
      D: "有严重的数据丢失风险.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q19 AI 把不相关变更塞进同一个 migration",
    prompt: "AI 改坏: AI 把 user 表加 role 字段、messages 表加 status 字段、redeem_tokens 表加 echo_code 字段全部塞进 0005. 最大风险?",
    options: [
      { id: "A", text: "无法部分回滚; 若其中一条 ALTER 失败, 整批 migration 回滚, 且不同业务域变更耦合, review 困难" },
      { id: "B", text: "执行更快" },
      { id: "C", text: "减少文件数, 更整洁" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "migration 应按业务域/原子变更拆分, 不能捆绑不相关 schema 修改.",
      detail: "0005 原本只改 user 表 (better-auth admin 字段). 若把 messages + redeem_tokens 的变更也塞进来, 三条 ALTER TABLE 共享一个事务: (1) 任一失败全部回滚, 无法单独重试; (2) code review 时看不到独立变更的上下文; (3) rollback 必须撤销所有三条, 影响面扩大. 正确做法: user 变更留在 0005, messages 变更走 000X, redeem_tokens 走 000Y.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M05,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [M05, M01, M02],
    realWorldImpact: "messages 的 status 变更导致线上报错, 需要回滚, 但回滚必须同时撤销 user 的 role 和 redeem_tokens 的 echo_code, 影响面扩大.",
    aiReviewRisk: "为'少写文件'把不相关变更耦合, 破坏 migration 的原子业务边界.",
    wrongAnswerFeedback: {
      B: "文件数与执行速度无关, 耦合反而增加风险.",
      C: "整洁 ≠ 正确, 拆分才是维护性.",
      D: "有严重的回滚和 review 风险.",
    },
  }),
  q({
    type: "ai_review",
    title: "Q20 AI 在 migration 里硬编码 dev seed",
    prompt: "AI 改坏: AI 在 0002 末尾加了 `INSERT INTO redeem_tokens (token_code, is_claimed, visitor_id) VALUES ('DEV-ONLY', 1, 'admin-local-uid')`. 最大风险?",
    options: [
      { id: "A", text: "dev seed 泄漏到 prod; remote apply 时写入真实数据库, 测试数据污染生产环境, 且硬编码 UID 在不同环境可能不存在导致 FK 错误" },
      { id: "B", text: "方便本地测试" },
      { id: "C", text: "减少 seed 脚本" },
      { id: "D", text: "无影响" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "migration ≠ seed 脚本; 环境特定数据不能写进 migration.",
      detail: "0002 的 INSERT OR IGNORE 插入的是业务有效 token (PEACH-OOLONG-*), 是生产也需要的. AI 追加的 'DEV-ONLY' 是环境特定数据, 不应进 migration. 后果: (1) prod 出现无效 token; (2) admin-local-uid 在 prod user 表不存在, 若 redeem_tokens 后来加 FK (0003 加了 user_id 但无 FK), 也可能在后续迁移中触发约束失败; (3) seed 逻辑应放在独立的 seed 脚本或环境变量控制下.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M02,
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: [M02, M03],
    realWorldImpact: "prod 数据库出现 'DEV-ONLY' token, 被真实用户误用; 或硬编码 UID 在 prod 不存在, 后续加 FK 时 migration 失败.",
    aiReviewRisk: "把 migration 当成 seed 脚本混用, 破坏环境隔离.",
    wrongAnswerFeedback: {
      B: "方便测试 ≠ 可以污染生产.",
      C: "减少脚本 = 增加耦合, seed 应独立.",
      D: "有严重的数据污染风险.",
    },
  }),
  // ─── 自由作答 (Q21–Q22) ─────────────────────────────────────────────────
  q({
    type: "free_explain",
    title: "Q21 解释 migrations 的 append-only 纪律",
    prompt: "用自己的话解释 (1) 为什么 migration 必须是 append-only (不可编辑旧文件) (2) 这 9 个文件的 lineage 如何讲述项目从'初始 better-auth + 留言板'到'Nemesis Guard 审计 + 反馈闭环'的演进故事.",
    options: [],
    correctAnswer: {
      text: "migration append-only 的两条纪律: (1) 已应用文件不可编辑 — wrangler 通过 d1_migrations 表按文件名跟踪, 编辑旧文件不会触发重跑, 只会让本地新环境与远程旧环境分叉, 形成'薛定谔的 schema'. (2) 修复应走新 migration (ALTER TABLE / UPDATE), 让 remote 也能按顺序拿到修正. 9 文件 lineage 的演进故事: 0001 是项目大爆炸 (better-auth 四表 + messages + rate_limits); 0002 引入 Peach Oolong 游戏 redeem_tokens; 0003/0004 扩展 hidden supply 互动 + echo token; 0005 给 better-auth 加 admin/role/ban 字段; 0006 引入 Nemesis Guard 审计; 0007 重构审计表到 v02 (mode/category/rule 维度); 0008 加模型路由/provider 字段; 0009 加反馈闭环字段 (feedback_status/category/note). 从 0001 到 0009, 表从 6 个增长到 8 个, 审计表从 0 到 1 再到丰富维度, 体现了'先跑通核心 → 加业务功能 → 加运营审计 → 加用户反馈'的成熟产品演进. 每一行 ALTER TABLE 都是一次产品决策的固化.",
    },
    explanation: {
      short: "append-only 保证环境一致; 9 文件 lineage 是产品演进的 schema 化石.",
      detail: "好的回答能联起 (1) immutable 的工程原因 (wrangler 跟踪机制) (2) 9 个文件的业务演进线 (留言板 → 游戏 → auth 管理 → AI 审计 → 反馈). 这是从'代码考古'角度理解 migration 的价值.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M01,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: TOUCHED,
  }),
  q({
    type: "review_comment",
    title: "Q22 PR review: 编辑 0001_init.sql 加列",
    prompt: "PR 把 `migrations/0001_init.sql` 直接编辑, 在 user 表末尾加了一列 `nickname TEXT`, 理由是'初始表应该一步到位'. 写一条 review comment (1-2 句).",
    options: [],
    correctAnswer: {
      comment: "已应用的 migration 不可编辑 — remote D1 的 d1_migrations 已记录 0001, 不会重跑, 新同事本地 fresh 建库得到 nickname 列而 remote 没有, 造成 dev/prod 分叉. 请追加新 migration `ALTER TABLE user ADD COLUMN nickname TEXT;` 而不是改历史文件.",
    },
    explanation: {
      short: "审查点: 已应用的 migration 是 history, 只能 append, 不能 rewrite.",
      detail: "好的 review comment 指出 (1) 不可编辑的纪律 (2) wrangler 跟踪机制导致 remote 不生效 (3) dev/prod 分叉风险 (4) 给出明确的正确做法 (追加新 migration). 这与 §22.4-1/§22.4-3 同构: 已应用/已生成产物不可手改.",
    },
    abilityTags: ["ai.review.architecture"],
    sourceFilePath: M01,
    layer: "free-response",
    serverClientBoundary: "server",
    touchedFiles: [M01],
  }),
];
