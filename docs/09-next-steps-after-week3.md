# Code Coach 后续优化清单（基于 08-ux-optimization-audit 的剩余项）

> 文档时间：2026-06-26
> 状态：第 1–3 周已完工并部署，本文记录从第 4 周开始的剩余事项。
>
> **硬约束**（贯穿后续所有工作）：
> 1. **绝不做管理员相关的能力模块建设**。`/learn/admin/*` 下的现有 UI/路由维持现状，不新增功能、不重写业务逻辑、不做向导式集成。
>    - 性能/工程类优化（如 N+1 修复、事务保护）若**只在**修补现有 admin 路由的稳定性，可以视情况承接；但凡涉及"加一块新功能/新页面/新能力"，一律拒做。
> 2. **`maxTokens` 一律不降**：`explanation` / `lesson_teaching` / `code_orientation` 的 4096，`hint` 的 800，`lesson_diagram` / `question_diagram` 的 1500 都保持不变。任何降 token 的提议默认作废，除非用户显式改口。

---

## 已完工（前 3 周）

第 1 周 P0（安全 + 可用性）和第 2–3 周 P1（体验 + 性能）共 14 项已在 `docs/08-ux-optimization-audit.md` 的路线图里编号 1–14。代码改动可在 git log 里追到。

| 周 | 项目 | 状态 |
|---|---|---|
| 1 | DebugQuestion / PositionJudgement / AiReview radio 补 `name` | ✅ |
| 1 | BranchTrace / LinePick 加 ARIA | ✅ |
| 1 | InlineCodeBlankRenderer Tab 键盘陷阱 | ✅ |
| 1 | 4 个自由输入 textarea 加 `aria-label` | ✅ |
| 1 | `submitAnswer` 改用 `db.batch()` 事务 | ✅ |
| 1 | 根级 `ErrorBoundary` 重写 | ✅ |
| 2-3 | AI 阶段化 loading 文案（不降 maxTokens） | ✅ |
| 2-3 | AI 日志写入改 `ctx.waitUntil` | ✅ |
| 2-3 | `LessonPractice` / `ExamPractice` 加 `beforeunload` 保护 | ✅ |
| 2-3 | `ExamPractice` 题号导航器 | ✅ |
| 2-3 | mermaid / shiki vendor chunk 拆分 | ✅ |
| 2-3 | `LearnSidebar` skip link + `aria-current="page"` | ✅ |
| 2-3 | `AiMarkdown` 真实 heading 标签 | ✅ |
| 2-3 | `ability-map` 默认展开能力标签 | ✅ |

---

## 第 4 周（一次性事项）

**说明**：原审计第 4 周聚焦"管理员与数据完整性"。受硬约束 1 影响，只剩一条非 admin 项可做。

### 4.1 错题本 `ai_mistake_summary` 加 KV 缓存 ✅ 推荐做

**为什么**：用户点"生成 AI 总结"是个高频动作（每条错题至少一次），而同一道错题的 mistake_type / userAnswer / correctAnswer 不变时 AI 输出本质上一致。当前每次都打网关，既慢又烧 token。

**怎么做**：
- 缓存键：`learn:vN:mistake-summary:{mistakeId}:{userAnswerHash}` —— `userAnswerHash` 是把 `last_answer_json` SHA-1 取前 8 位即可。
- TTL：3 天即可，错题本回访本来不密集。
- 写入位置：`updateMistakeAiSummary` 已经把 summary 写到了 `mistakes.ai_summary_text` 列，KV 缓存只是给"还没存到 mistakes 表"的兜底（mistake summary 已经存表，所以这条优先级其实没那么高，看下面备注）。
- **关键**：`mistakes.ai_summary_text` 已经在数据库里持久化了，前端 loader 已经读到。所以 KV 缓存严格说是"在 D1 之外又加一层"，价值是减少首次生成压力 + 给"刷新重生成"做命中。
- 实际可能更应该做的是：UI 上把"已有 summary 时不再显示生成按钮"——这个早就做了（`!mistake.aiSummary && <button>`）。所以本条建议**降级为 P2**，只在用户反馈"生成慢"时再做。

**工作量**：S。**优先级**：P2。
**约束符合性**：错题本属于学习者侧，不是 admin，安全。

### 跳过项（admin 范畴，本周期不做）
- `publishCurriculumDraft` / `publishAiDraftAsQuestions` 加事务保护 ❌
- admin drafts loader N+1 修复 ❌
- `ai-generate` 表单题目数量对齐 ❌

---

## 第 5–6 周（打磨）

### 5.1 全局 `prefers-reduced-motion` 保护 ✅ 推荐做

**为什么**：`.studio-card-interactive` hover lift、`.studio-shake` 错误抖动、按钮 `hover:-translate-y-0.5` 等都会强制播放，前庭障碍 / 运动敏感用户可能不适。

**怎么做**：在 `app/app.css` 末尾追加：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

关键动画（如 `.studio-shake`）可显式 `@media (prefers-reduced-motion: no-preference)` 包裹保留对正常用户的效果。

**工作量**：S。**优先级**：P2。

### 5.2 `CodeBlock` 展开/收起按钮加 `aria-expanded` ✅ 推荐做

**为什么**：屏读用户听不出按钮当前是"展开状态"还是"收起状态"，每次都得点了才知道。

**怎么做**：找 `CodeBlock.tsx` 的 collapsible 按钮，加 `aria-expanded={!collapsed}` + `aria-controls="<code-block-id>"`。

**工作量**：XS。**优先级**：P1（容易忘记的 a11y 债，归 P1 而非 P2）。

### 5.3 `LearnSidebar` 移动端 drawer focus trap + Esc ✅ 推荐做

**为什么**：当前 drawer 在移动端打开时 `Tab` 会滑出 drawer，`Esc` 关不掉。审计原文 §2.6 也提到。

**怎么做**：
- drawer 容器加 `role="dialog" aria-modal="true" aria-label="导航菜单"`。
- 用 `useEffect` 在打开时 focus 第一个可聚焦元素；监听 `keydown`：`Tab` 在最后一个元素时回到第一个，`Shift+Tab` 在第一个时回到最后，`Esc` 调用 `onMobileClose`。
- 提取成 `useFocusTrap(ref, active)` hook 复用到将来其它 dialog。

**工作量**：M。**优先级**：P2。

### 5.4 `warmLearnPublicCache` 并行预热 ✅ 推荐做

**为什么**：外层 `for...of` 串行预热多门课程，冷启动慢。

**怎么做**：`cache-public.server.ts:342-383` 的外层循环改成 `Promise.all(courses.map(...))`。注意单条课程内部已经是 `Promise.all`，外层不会撞 D1 连接上限（D1 单 worker 有并发额度）。

**工作量**：XS。**优先级**：P2。

### 5.5 移动端 sidebar 宽度自适应 ✅ 推荐做

**为什么**：`LearnSidebar.tsx:150` 固定 `w-64`（256px），320px 屏占 80%，关闭按钮挤边。

**怎么做**：把 `w-64` 改成 `w-[80vw] max-w-64`。

**工作量**：XS。**优先级**：P2。

### 5.6 `LessonPractice` 浮动栏遮挡 ✅ 推荐做

**为什么**：sticky `studio-floating-bar` 固定 `bottom-4`，矮屏被遮。

**怎么做**：主内容区加 `pb-24`，或动态测量浮条高度后 `style={{ paddingBottom: ... }}`。

**工作量**：XS。**优先级**：P2。

### 跳过项
- admin questions 加分页 / 搜索 ❌
- curriculum scan/plan/extract 接入 admin UI（向导式）❌（属于能力建设）

---

## 审计原文未编号、但有价值的事项

这些是原审计列举但没进 1–24 路线图的细项，按价值 + 投入比挑出来供后续选用。

### 学习闭环

**A. Dashboard 新用户引导**（审计 §2.1，P1 / S）

`overall.totalQuestionsAttempted === 0` 时把 stat cards 换成欢迎卡片 + "第一步：选一门项目课" CTA，等用户答过 ≥1 题后切回正常视图。
**注意**：要在 `app/routes/learn._index.tsx` 里加，不算 admin。

**B. Courses 列表空状态文案**（审计 §2.1，P1 / S）

`app/routes/learn.courses._index.tsx` 当前空状态显示 `npm run db:seed:remote -- --force` 终端命令，对终端用户没意义。按 `process.env.NODE_ENV` 或 `import.meta.env.DEV` 区分文案。

**C. `LessonPractice` 提交后 scroll 锚点错位**（审计 §2.2，P1 / XS）

`scrollIntoView("answer-feedback")` 当前命中外层 `studio-card`（在题目卡片顶部），不是反馈面板。把 `id="answer-feedback"` 从外层 `<div>` 挪到 `ExplanationPanel` 自身根节点上（`ExplanationPanel.tsx:113` 已经写了一个，去重即可）。

**D. `LessonPractice` `goNext` 改本地 state**（审计 §2.2，P2 / S）

当前 `setSearchParams({ q: nextIndex })` 强制重跑 loader，网络抖动时会闪。改成本地 `questionIndex` state；URL `?q=` 仅在初次进入/分享时同步。

### 答题体验

**E. SortChainBoard 触屏拖拽**（审计 §2.3，P1 / M）

当前只有 HTML5 Drag and Drop，手机不支持。引 `@dnd-kit/core` 的 PointerSensor / TouchSensor，或至少在 mobile 加长按 + 按钮上下移动。

**F. AI 错误细分**（审计 §2.5，P1 / S）

`toAiLearnError` 当前把所有非 `not_configured`/`rate_limited` 都归 `ai_failed`。细分为：
- `upstream_5xx`：可重试（前端显示"重试"按钮）
- `upstream_timeout`：可重试 + 文案"网关响应慢"
- `ai_parse_failed`：AI 返回了空/不合法 JSON，提示"AI 输出格式异常"
- `ai_failed`：兜底

### 性能

**G. `callAiGateway` 重试**（审计 §三，P1 / S）

`aiGateway.server.ts` 的 `upstream` 错误直接抛出。加指数退避：第 1 次失败 500ms 后重试，第 2 次 1500ms 后重试；仅 `rate_limited` / `not_configured` 立即失败。重试在 `ai_usage_logs.error` 里加 `retried=true` 字段方便对账。
**注意**：和 `maxTokens 不降` 不冲突。

**H. 题级 AI 讲解短期 KV 缓存**（审计 §三，P1 / M）

`ai_hint` 按 `(questionId, hintLevel)` 缓存（L1–L4 是确定性的）；`ai_explanation` 按 `(questionId, userAnswerHash)` 缓存 1–7 天。缓存键不带用户身份。
**为什么有限做**：`maxTokens` 不降的前提下，缓存是省成本的唯一无副作用手段。

**I. `getLessonProgressSummary` 回退路径 KV 缓存**（审计 §三，P2 / S）

`lesson_progress` 行不存在时回退到 `computeLessonProgressFromAttempts`，两次聚合查询，TTL 60s。提交答案后 `deleteCacheKey` 主动失效。

### 可维护性

**J. `LessonPractice` / `ExamPractice` 抽 hook**（审计 §四，P2 / M）

把 feedback 计算、`sourceFiles` 去重、答案草稿管理拆成 `useQuestionFeedback` / `useDraftAnswers`。文件还不到上帝组件级别，但 ≥350 行已经有抽离价值。

**K. `aiPrompts.server.ts` 拆分**（审计 §四，P2 / M）

989 行 10 个 prompt builder，按职责拆 `prompts/hint.ts` `teaching.ts` `explanation.ts` `generation.ts`，主文件做 re-export。

### 教学法

**L. 答对场景的二次教学窗口**（审计 §五，P1 / S）

`buildExplanationPrompt` 答对时讲解可能极简。在 prompt 加一段："如果用户答对，先确认推理路径，再补一个本题常见的过度自信陷阱（一两句）"。
**注意**：这是 prompt 改动，不是代码改动，单文件即可。

**M. Token 预算硬截断**（审计 §五，P1 / S）

`buildLessonTeachingPrompt` 直接 embedding `primaryFileCode` 与 `questionCodeSamples`。锚定文件 >500 行可能超 Gemini 3.1 Flash Lite 上下文。在 prompt builder 内 `primaryFileCode.slice(0, 8000)` 并附上"代码过长，仅展示前 N 行"提示。
**注意**：这是输入侧截断，**不是 `maxTokens` 输出侧**，与硬约束 2 不冲突。

---

## 推荐的下一波节奏

按"每周一个小批次、不大动"的节奏推荐：

**第 7 周（a11y + 移动端打磨）**：5.1（reduced-motion）+ 5.2（CodeBlock aria-expanded）+ 5.5（sidebar 宽度）+ 5.6（浮动栏遮挡）+ C（scroll 锚点）→ 5 项 XS/S，一次性顺手清。

**第 8 周（性能 + 错误体验）**：G（AI 重试）+ F（AI 错误细分）+ H（题级 AI 缓存的 hint 部分）→ 3 项 S/M，专注 AI 链路稳定性。

**第 9 周（新用户 / 闭环）**：A（dashboard onboarding）+ B（courses 空状态）+ D（goNext 本地 state）+ L（答对二次教学）→ 偏内容侧。

**第 10 周（可维护性）**：J（拆 hook）+ K（aiPrompts 拆分）+ I（progress 回退缓存）→ 不影响外观但减债。

**机动**：E（拖拽触屏）单独评估，需要引入 `@dnd-kit`，决定前可先看手机端用户占比。

---

## 验证清单（每次合并前必跑）

```bash
npx tsc --noEmit                  # ts check（忽略 backfill-file-content.ts 那条 main HEAD 旧错）
npx vitest run                    # 单测（忽略 site-04-theme-system seed 那条预存在失败）
npm run build                     # 生产构建
```

UI 改动额外手动验证：
- 移动端 320 / 360 / 414 三档宽度
- 键盘单独完整答题闭环（不用鼠标）
- 屏幕阅读器（macOS VoiceOver / Win NVDA）至少跑一遍 dashboard → 课程 → 关卡 → 答题 → 错题本

---

## 附录：硬约束的边界说明

为避免在审计文档 / 后续讨论里反复纠结"这条算不算 admin"，列一个判定表：

| 行为 | 是否允许 |
|---|---|
| 修复学习者侧（dashboard / 课程 / 答题 / 错题本 / 考试 / 能力树）的任何 bug 或 UX | ✅ |
| 后端共享代码（`app/lib/server/learn/*`、`ai/*`）做事务化、缓存、重试、错误细分 | ✅ |
| 改一行 admin 路由的 N+1（仅修补稳定性，不动 UI） | 视情况 / 不主动做 |
| 在现有 admin UI 上**新增**功能、字段、视图、向导步骤 | ❌ |
| 给 admin 增加任何新的 capability（如向导式 curriculum、批量操作、分页搜索新页面） | ❌ |
| 降低 AI 任何 feature 的 `maxTokens` | ❌ |
| 改 AI prompt 的内容、约束、教学口径 | ✅（已经鼓励：L、M 两条都在此类） |
| 在 AI 网关层加重试、缓存、错误分类 | ✅ |
| 给 admin 路由加 lazy-load chunk（性能优化，不是新能力） | ✅（但本周期已跳过，因为效果有限） |

约束本质：**不要扩大 admin 这条岔路，把它冻结在当前形态，所有产品力建设投到学习者主路径上。**
