# Code Coach 产品体验与优化审计报告

> 审计时间：2026-06-26
> 审计范围：`app/` `workers/` `scripts/` `migrations/` `tests/`（不含 `remix/` 学习素材项目）
> 审计方式：从入口路由 → 用户主路径 → AI 链路 → 管理员链路 → 八种题型组件逐文件阅读，重点在用户产品体验。

---

## 一、执行摘要（按优先级排序）

1. **P0 — 答题组件存在系统性可访问性缺陷**
   `DebugQuestion`、`PositionJudgementQuestion`、`AiReviewQuestion` 的 radio input 缺失 `name` 属性，键盘方向键导航失效；`BranchTraceQuestion` 与 `LinePickQuestion` 用 `<button>` 作为单选选项却没有 `aria-pressed` / `role="radio"`；`InlineCodeBlankRenderer` 劫持 `Tab` 形成键盘陷阱。直接违反 WCAG 2.1。

2. **P0 — 答题提交无数据库事务保护**
   `submitAnswer`（`app/lib/server/learn/attempts.server.ts:22-103`）会顺序执行 INSERT attempt → upsert mistake → update ability → update lesson_progress → update course_progress，没有 `db.batch()` 或显式事务。中途任意一步失败都会留下"分数已加但错题未记录""attempt 已存但课程进度未刷新"的脏数据。

3. **P0 — AI 讲解完全阻塞且无流式响应**
   `runAiFeature`（`app/lib/server/ai/aiLearn.server.ts:138-231`）等网关返回完整文本后才回包。`explanation` / `lesson_teaching` 的 `maxTokens` 高达 4096，用户点"AI 讲解"后看到 spinner 持续 5–10 秒，无任何逐字反馈，极易被误以为页面卡死。

4. **P0 — 根级 ErrorBoundary 过于简陋**
   `app/root.tsx:34-52` 是一个纯白 `<main>` 加标题段落，没有"返回学习中心""刷新重试"入口，也没有保留 `LearnShell` 导航。任何子路由抛错都会把用户甩出整个学习壳。

5. **P1 — 全站没有路由过渡 loading 与骨架屏**
   只有 `learn.account.tsx:77` 用到了 `useNavigation`。换页时 dashboard 的 stat cards 和课程网格会在 loader resolve 前完全空白。

6. **P1 — 用户答题草稿没有保护**
   `LessonPractice.tsx` / `ExamPractice.tsx` 都没有 `beforeunload`；考试的 `answersByTask` 仅活在客户端内存里，刷新或误关页面就丢光。

7. **P1 — 管理员课程发布也无事务**
   `publishCurriculumDraft`（`app/lib/server/project-curriculum/curriculumDrafts.server.ts:132-220`）三层循环逐行 INSERT。中途抛错会留下半成品课程，而且生成的占位题选项永远是 `a/b/c`，教学质量低。

8. **P1 — 移动端 drawer 缺少焦点管理**
   `LearnSidebar`（`app/components/learn/layout/LearnSidebar.tsx:135-224`）在移动端打开时没有 `role="dialog"` / `aria-modal` / focus trap，Tab 会滑出 drawer，Esc 也关不掉。

9. **P2 — 能力树核心标签默认折叠**
   `app/routes/learn.ability-map.tsx:67-74` 把"解题技能标签"塞进 `<details>` 默认折叠，绝大多数用户不会展开，能力图最大的价值被自己藏起来了。

10. **P2 — AI 日志同步阻塞用户响应**
    `runAiFeature` 在返回前 `await Promise.all([logAiExplanation, logAiUsage])`（`aiLearn.server.ts:175-199`），两次 D1 写入累计几百 ms 都让用户白等。改 `ctx.waitUntil` 即可。

---

## 二、用户体验问题（最详细的部分）

### 2.1 首次进入 / 空状态

- **问题**：Dashboard（`app/routes/learn._index.tsx:34-127`）对新用户的引导就是"推荐课程列表 + 浏览全部课程按钮"，没有"什么是 Code Coach""我该从哪里开始"的引导。
- **用户视角**：第一次进入的用户面对能力树、错题本、片段数等术语完全摸不着头脑。
- **建议方案**：检测 `overall.totalQuestionsAttempted === 0` 时，渲染一个沉浸式欢迎卡片（"第一步：选一个项目课"），高亮"从第一门示例课开始"CTA，等用户答过 ≥1 题后再切换到正常 stat cards 视图。
- **优先级**：P1 / 工作量 S

- **问题**：Courses 列表空状态（`app/routes/learn.courses._index.tsx:100-104`）的提示文案是 `npm run db:seed:remote -- --force`。
- **用户视角**：终端用户看到一行 npm 命令，不知道是给自己看的还是给管理员看的。
- **建议方案**：按环境区分文案：生产环境显示"课程即将上线"，本地开发环境才显示 seed 命令；或统一改为友好的"暂无已发布课程"。
- **优先级**：P1 / 工作量 S

### 2.2 学习闭环上的断点

- **问题**：`LessonPractice.tsx:207-212` 的 `goNext` 通过 `setSearchParams` 修改 URL，会强制重跑 loader，即便 KV 命中也会有一次网络往返和重渲染。
- **用户视角**：点"下一题"时网络不佳就会闪烁。
- **建议方案**：题目切换走本地 state（`questionIndex`），URL `?q=` 只在初次进入或分享时同步。
- **优先级**：P2 / 工作量 S

- **问题**：提交后 scroll 目标错位。`LessonPractice.tsx:142-147` `scrollIntoView` 到的 `id="answer-feedback"` 是挂在外层 `studio-card` 上（`LessonPractice.tsx:263`），不是反馈面板本身。
- **用户视角**：用户提交后页面停在题目卡片顶部，反馈在屏幕下方还需要再手动滚动。
- **建议方案**：把锚点 id 从外层 `<div>` 挪到 `ExplanationPanel` 自身根节点，或在 `ExplanationPanel` 内加一个独立锚点。
- **优先级**：P1 / 工作量 XS

- **问题**：`ExamPractice.tsx:165-252` 没有题号导航器，只能"上一题/下一题"逐题切换。
- **用户视角**：20 题考试想回去检查第 5 题，得连点 15 次"上一题"。
- **建议方案**：顶部加一行可折叠的题号网格（1–20），已答绿点、未答灰点、当前题高亮，点击直接跳。
- **优先级**：P1 / 工作量 M

### 2.3 答题体验

- **问题**：`DebugQuestion.tsx:74-81`、`PositionJudgementQuestion.tsx:54-65`、`AiReviewQuestion.tsx:60-68` 的 radio input 都没有 `name` 属性。
- **用户视角**：键盘用户无法用方向键在选项间切换，必须 Tab 逐次跳；和 `SingleChoiceQuestion` 体验不一致。
- **建议方案**：统一加 `name={`q-${question.id}`}`。
- **优先级**：P0 / 工作量 XS

- **问题**：`BranchTraceQuestion.tsx:68-71` / `LinePickQuestion.tsx:45-49` 用 `<button>` 当单选/多选选项，但没有 `aria-pressed`、`aria-checked`、`role="radio"`。
- **用户视角**：屏幕阅读器用户听不出哪一项被选中、也不知道这是单选还是多选。
- **建议方案**：选中态加 `aria-pressed="true"`，外层包 `role="radiogroup"` + `aria-label`。
- **优先级**：P0 / 工作量 S

- **问题**：`InlineCodeBlankRenderer.tsx:36-46` 在 `handleKeyDown` 里拦了 `Tab`：只要不是最后一个空就 `preventDefault` 并强行 focus 下一空。
- **用户视角**：这是一个标准键盘陷阱。用户想正常 Tab 跳到提交按钮是不可能的，只能填完所有空或鼠标点出去。
- **建议方案**：保留 `Enter` 跳转、移除 `Tab` 拦截；同时补 `Shift+Tab` 回退。
- **优先级**：P0 / 工作量 XS

- **问题**：自由输入类组件 textarea 没有可编程标签。`CodeFixQuestion.tsx:64` 没有 `<label htmlFor>` 或 `aria-label`；`DiffReviewQuestion` / `ReviewCommentQuestion` / `FreeExplainQuestion` 同样缺失。
- **用户视角**：屏幕阅读器读到的是"编辑文本 空白"，不知道在输入什么。
- **建议方案**：每个 textarea 加 `aria-label`（如"你的代码修复"/"PR Review 评语"），或把视觉标题 `<p>` 改为 `<label htmlFor={id}>`。
- **优先级**：P0 / 工作量 S

- **问题**：`SortChainBoard.tsx` 只用了 HTML5 Drag and Drop API，没有 touch 事件。
- **用户视角**：手机/平板上无法拖拽排序，只能点很小的上下箭头按钮，效率极低。
- **建议方案**：引入 `@dnd-kit/core` 的 touch sensor，或至少给每个排序项加长按手势。
- **优先级**：P1 / 工作量 M

### 2.4 加载与等待

- **问题**：AI 调用完全阻塞。`aiLearn.server.ts:138-231` 等网关返回整段文本；路由层（如 `learn.courses.$courseSlug.lessons.$lessonSlug.tsx:534` 的 `generateExplanation`）也没用 `defer` 或流式返回。
- **用户视角**：点"AI 讲解"后 spinner 转 3–8 秒，期间没有任何文字逐字出现，很多人会误以为卡死然后刷新。
- **建议方案**：
  1. 短期：在 UI 上显示分阶段文案（"已连接 AI Gateway…" → "正在分析代码…" → "正在生成讲解…"），同时把 `explanation` 的 `maxTokens` 从 4096 降到 2048。
  2. 中期：把 `callAiGateway` 改为流式 fetch，前端用 `ReadableStream` 逐字渲染（action 改为返回自定义 Response / event stream）。
- **优先级**：P0 / 工作量 L

- **问题**：`aiLearn.server.ts:175-199` 同步 await 两次 D1 日志写入（`ai_explanation_logs` + `ai_usage_logs`）。
- **用户视角**：每次 AI 调用多等几百 ms 的 D1 延迟。
- **建议方案**：用 `context.cloudflare.ctx.waitUntil(...)` 包裹日志写入，fire-and-forget。
- **优先级**：P1 / 工作量 S

- **问题**：`warmLearnPublicCache`（`app/lib/server/learn/cache-public.server.ts:342-383`）外层 `for...of` 串行预热课程结构。
- **用户视角**：冷启动或缓存失效后，多门课程预热慢，影响首屏。
- **建议方案**：外层也改 `Promise.all(courses.map(...))`。
- **优先级**：P2 / 工作量 XS

### 2.5 错误状态

- **问题**：`app/root.tsx:34-52` 的 ErrorBoundary 只有标题 + 错误消息一段纯白页，没有任何恢复入口、也丢了 `LearnShell` 侧栏。
- **用户视角**：lesson 路由因数据异常崩溃时，用户看到一片白屏，连返回首页都不知道点哪，只能改地址栏。
- **建议方案**：把 ErrorBoundary 包到带 `LearnShell` 的错误布局里，给出"返回学习中心""刷新重试"两个按钮，并对 404 / 500 用不同文案。
- **优先级**：P0 / 工作量 S

- **问题**：AI 错误分类太粗。`toAiLearnError`（`aiLearn.server.ts:83-103`）把除 `not_configured` / `rate_limited` 以外的全部归为 `ai_failed`，前端只看到一个模糊"AI 请求失败"。
- **用户视角**：分不清是网络（可重试）、模型问题（无解）还是自己的输入有问题，反复点反复败。
- **建议方案**：细分 `upstream + 5xx`、`upstream + 超时`、`空内容/解析失败` 三类，并在 `AiHintPanel`/`ExplanationPanel` 旁渲染带重试按钮的对应文案。
- **优先级**：P1 / 工作量 S

- **问题**：`ExamPractice.tsx:245-249` 的提交错误只在按钮下方显示一行红字。
- **用户视角**：在最后一题点交卷出错时，错误可能在视野之外，用户以为点了没反应。
- **建议方案**：失败时 `scrollIntoView`，或在页面顶部加 `role="alert"` 横幅。
- **优先级**：P1 / 工作量 XS

### 2.6 移动端

- **问题**：`LearnSidebar.tsx:150-155` drawer 固定宽 `w-64`（256px）。
- **用户视角**：320px 宽设备上 drawer 占 80% 屏幕，关闭按钮挤在边缘。
- **建议方案**：移动端用 `w-[80vw] max-w-[16rem]` 的变体。
- **优先级**：P2 / 工作量 XS

- **问题**：`LessonPractice.tsx:344-377` 的 sticky `studio-floating-bar` 固定在 `bottom-4`，矮屏会盖到内容。
- **用户视角**：iPhone SE 下滚到最底部时一部分内容被浮条遮住。
- **建议方案**：主内容区加 `pb-24` 或根据浮条高度动态计算。
- **优先级**：P1 / 工作量 XS

- **问题**：`ExamPractice` 无题号导航器（同 2.2），移动端尤为痛苦。
- **建议方案**：同 2.2。
- **优先级**：P1 / 工作量 M

### 2.7 可访问性

- **问题**：全站没有 skip link。键盘用户每次换页要按 8–10 次 Tab 才能进 `<main>`。
- **建议方案**：在 `LearnShell.tsx:57-87` 的 `<main>` 之前加一个隐藏-focus-时显示的 skip link，并给 `<main>` 加 `id="main-content"`。
- **优先级**：P1 / 工作量 XS

- **问题**：`LearnSidebar.tsx:244-251` 的链接没有 `aria-current="page"`。
- **用户视角**：屏幕阅读器用户不知道自己当前在哪个路由。
- **建议方案**：`Link` 加 `aria-current={isActive(item.to) ? "page" : undefined}`。
- **优先级**：P0 / 工作量 XS

- **问题**：`AiMarkdown.tsx:125-131` 把 AI 输出的 `### 标题` 都渲染成 `<p>` + 加粗。
- **用户视角**：屏幕阅读器用户无法用 H 键快速浏览章节结构。
- **建议方案**：根据 `block.level` 渲染对应 `<h1>`–`<h3>`；为避免冲突可让 AI 区块从 `<h2>` 起步。
- **优先级**：P1 / 工作量 XS

- **问题**：`CodeBlock.tsx` 展开/收起按钮缺 `aria-expanded`。
- **建议方案**：button 加 `aria-expanded={expanded}`。
- **优先级**：P1 / 工作量 XS

- **问题**：全局没有 `prefers-reduced-motion` 保护。`.studio-card-interactive` 的 hover lift、`.studio-shake` 错误抖动、按钮 `hover:-translate-y-0.5` 等都会强制播放。
- **用户视角**：前庭障碍 / 运动敏感用户可能不适。
- **建议方案**：`app/app.css` 加 `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`，并把 `.studio-shake` 等关键动画显式判断。
- **优先级**：P2 / 工作量 S

### 2.8 复习与错题

- **问题**：`learn.review.tsx:70-118` 的 `ai_mistake_summary` action 全程同步阻塞。
- **用户视角**：错题本突然进入长时间 loading。
- **建议方案**：短期同 AI 讲解做分阶段文案；中期对 mistake summary 结果按 `mistakeId` KV 缓存（同一道错题不必每次重算）。
- **优先级**：P1 / 工作量 M

- **问题**：`learn.review.tsx:29-33` loader 硬限 50 条，无分页。
- **用户视角**：100+ 错题的活跃用户只能看到最新 50，旧错题被静默丢弃。
- **建议方案**：加 `?page=` 分页或 IntersectionObserver + fetcher 无限滚动。
- **优先级**：P2 / 工作量 M

- **问题**：`learn.ability-map.tsx:67-74` 把"解题技能标签"塞进 `<details>` 默认折叠。
- **用户视角**：大多数用户不会点开，看不到自己具体哪些能力在长。
- **建议方案**：默认展开"解题技能标签"，把 `AbilityMap` 提到首屏主视图，`RemixModuleMap` 降为辅助视图；或按用户进度动态折叠（新手默认展开，老手默认折叠）。
- **优先级**：P1 / 工作量 S

### 2.9 管理员体验

- **问题**：curriculum 流水线（scan → plan → extract-assets → publish）目前是 4 个独立 Node 脚本，admin UI 只覆盖 `ai-generate` 和 `drafts`，前两步必须开终端。
- **用户视角**：一边在终端跑 `npm run` 一边在浏览器审核，链路割裂、容易出错。
- **建议方案**：`/learn/admin` 下新增"课程流水线"页面，做向导式 UI（每步显示进度和日志），并把 `scan/plan/extract` 包成 server action。
- **优先级**：P1 / 工作量 L

- **问题**：`learn.admin.ai-generate.tsx` 把 `desiredQuestionCount` 限在 `[1, 8]`，但 `aiPrompts.server.ts` 系统 prompt 要求生成"22+ 题"。
- **用户视角**：UI 选 8 题，AI 被要求 22 题，结果不稳定，validator 经常报错。
- **建议方案**：统一数量预期：要么把 prompt 改成"按用户指定数量生成"，要么把 UI 上限提到 22 并给出成本估算。
- **优先级**：P1 / 工作量 XS

- **问题**：`learn.admin.drafts.tsx` loader 有 N+1：`Promise.all(courses.map((c) => getLessonsByCourse(db, c.id)))`。
- **建议方案**：改成一次 `SELECT ... FROM lessons WHERE course_id IN (...)`，或复用 `cache-public.server.ts` 已有的 `buildPublicCoursesOverview` 缓存。
- **优先级**：P1 / 工作量 S

- **问题**：`learn.admin.questions.tsx` 没有分页、没有搜索、没有按题型/能力过滤。
- **建议方案**：加服务端分页（`?page=&q=`）和按题型/能力标签过滤。
- **优先级**：P2 / 工作量 M

---

## 三、性能 / 工程优化机会

- **路由级 code splitting 缺失**。`vite.config.ts` 没有 `manualChunks` 配置；首屏 hydration 要载入 `mermaid ^11.15.0` 和 `shiki ^4.2.0` 两个大依赖。
  建议：
  1. `build.rollupOptions.output.manualChunks` 把 mermaid / shiki 拆到独立 vendor chunk。
  2. `/learn/admin/*` 路由用 React Router 的 lazy route 动态加载，普通学习者不该下载 admin 组件。
  3. 验证 mermaid 只在含 diagram 的页面被实际下载（`CodeBlock` 已用了 `import("./shikiHighlight.client")` 这是好的模式，可作为参考）。
  优先级 P1 / 工作量 M。

- **`callAiGateway` 没有重试**（`aiGateway.server.ts:119-196`）。`upstream` 偶发错误（网络抖动、模型瞬时过载）直接抛给用户。
  建议：对 `upstream` 做指数退避重试（最多 2 次，500ms / 1500ms），仅 `rate_limited` / `not_configured` 立即失败；重试需要在日志中打标记，方便对账 AI Gateway 计费。
  优先级 P1 / 工作量 S。

- **题级 AI 讲解没有缓存**。课级 teaching/diagram 已有 7 天 KV 缓存，但 `ai_hint`、`ai_explanation`、`ai_question_diagram` 每次都打网关。
  建议：
  - `ai_explanation` 按 `(questionId, userAnswerHash)` 短期 KV 缓存（1–7 天）。
  - `ai_hint` 按 `(questionId, hintLevel)` 缓存，L1–L4 是确定性的。
  - 缓存键不要带用户身份敏感信息；只缓存教学文本，不缓存"鼓励性话术"。
  优先级 P1 / 工作量 M。

- **`getLessonProgressSummary` 回退路径无缓存**（`progress-write.server.ts:298-341`）。`lesson_progress` 行不存在时回退到 `computeLessonProgressFromAttempts`，两次聚合查询；高并发下没有保护。
  建议：回退结果短缓存到 KV，TTL 60s，键 `learn:v15:progress:${userId}:${lessonId}`；提交答案后主动删该 key。
  优先级 P2 / 工作量 S。

- **D1 写入未批量化**（同 P0#2 与管理员 P1#7）。建议统一用 `db.batch()` 把多个相关写入打包，既减少往返延迟、又获得原子性。

---

## 四、可维护性

- `LessonPractice.tsx`（~390 行）和 `ExamPractice.tsx`（~252 行）尚未恶化成上帝组件，但同时承担 state、副作用、条件渲染和业务逻辑。建议把 `feedback` 计算、`sourceFiles` 去重、答案草稿管理抽成 hook（`useQuestionFeedback`、`useDraftAnswers`）。

- 双层类型同步成本（`app/lib/learn/types.ts`）。新字段要同步改 `Question` 与 `QuestionRow` + `mappers.server.ts`，漏一处就静默丢字段。建议起码加一个 CI 脚本，按 camelCase ↔ snake_case 规则校验两边字段对齐；若愿意引入轻量 ORM，可用 `drizzle-orm` D1 适配器生成 Row 类型。

- `aiPrompts.server.ts` 已 989 行、10 个 prompt builder。按功能拆 `prompts/hint.ts`、`teaching.ts`、`explanation.ts`、`generation.ts`，由 `aiPrompts.server.ts` 做 re-export。

- `learn.courses.$courseSlug.lessons.$lessonSlug.tsx` 的 `loadQuestionContext`（第 134–152 行）混合了校验和查询，建议挪到 `app/lib/server/learn/questionContext.server.ts`，让 route 文件回归 intent 路由。

---

## 五、内容与教学法建议

- **核心 prompt 已经很扎实**：`aiPrompts.server.ts:17-80` 的 `CODE_COACH_TEACHING_SYSTEM_PROMPT` 把"不编造文件、不绕过安全、不直接给答案、用因果链讲"等约束写得很清楚，是产品的核心壁垒。

- **答对场景的教学机会被浪费**。`buildExplanationPrompt` 在答对时讲解可能极简，错过了"确认推理路径 + 补一个常见过度自信陷阱"的二次教学窗口。建议在 prompt 中明确这一段。

- **Token 预算硬截断缺失**。`buildLessonTeachingPrompt` 直接 embedding 了 `primaryFileCode` 与 `questionCodeSamples`，如果锚定文件 >500 行，可能超出 Gemini 3.1 Flash Lite 上下文。建议在 prompt builder 内按字符数截断（如 `primaryFileCode.slice(0, 8000)`）并附上 `[代码过长，仅展示前 X 行]` 提示，避免静默截断。

- **能力图可视化价值被自己折叠**（同 2.8）。`AbilityMap` 应该是首屏主视图，因为用户更想知道"我懂不懂 state-reasoning"，而不是"我读到 remix 的哪个文件了"。

---

## 六、优先级路线图（落地顺序建议）

### 第 1 周：P0 — 安全与可用性

1. 给 `DebugQuestion.tsx:74`、`PositionJudgementQuestion.tsx:54`、`AiReviewQuestion.tsx:60` 的 radio 补 `name`。
2. 给 `BranchTraceQuestion.tsx:68` / `LinePickQuestion.tsx:45` 加 `aria-pressed` + `role="radiogroup"`。
3. 修复 `InlineCodeBlankRenderer.tsx:36-46` 的 Tab 劫持。
4. 给 `CodeFixQuestion` / `DiffReviewQuestion` / `ReviewCommentQuestion` / `FreeExplainQuestion` 的 textarea 加 `aria-label`。
5. 用 `db.batch()` 把 `submitAnswer` 多步写入打包成事务。
6. 重写 `root.tsx` 的 `ErrorBoundary`，保留 `LearnShell`，提供"返回首页"和"刷新重试"。

### 第 2–3 周：P1 — 体验与性能

7. AI 调用增加阶段化 loading 文案；把 `explanation` 的 `maxTokens` 调到 2048。
8. `runAiFeature` 的日志写入改 `ctx.waitUntil`。
9. `LessonPractice` / `ExamPractice` 加 `beforeunload` 保护未提交草稿。
10. `ExamPractice` 加题号导航器。
11. 路由级 code splitting：mermaid / shiki vendor chunk + admin lazy route。
12. `LearnSidebar` 加 skip link + `aria-current="page"`。
13. `AiMarkdown` 用真实 heading 标签。
14. 展开 `ability-map.tsx` 默认折叠状态。

### 第 4 周：P1 — 管理员与数据完整性

15. `publishCurriculumDraft` / `publishAiDraftAsQuestions` 加事务保护。
16. 修 admin drafts loader 的 N+1。
17. 对齐 `ai-generate` 表单的题目数量与 prompt 数量。
18. 错题本 `ai_mistake_summary` 加 KV 缓存。

### 第 5–6 周：P2 — 打磨与扩展

19. 加全局 `prefers-reduced-motion`。
20. `CodeBlock` 展开按钮加 `aria-expanded`。
21. `LearnSidebar` drawer 加 focus trap + Esc。
22. `warmLearnPublicCache` 并行优化。
23. admin questions 加分页/搜索。
24. curriculum scan/plan/extract 接入 admin UI（向导式）。

---

## 附录：关键文件清单（供快速定位）

| 关注点 | 文件 / 行号 |
| --- | --- |
| 根级错误边界 | `app/root.tsx:34-52` |
| 答题提交核心逻辑 | `app/lib/server/learn/attempts.server.ts:22-103` |
| AI 调用 orchestrator | `app/lib/server/ai/aiLearn.server.ts:138-231` |
| AI 网关（无重试） | `app/lib/server/ai/aiGateway.server.ts:119-196` |
| Radio 缺 name | `app/components/learn/question/DebugQuestion.tsx:74-81` 等 |
| Tab 键盘陷阱 | `app/components/learn/question/InlineCodeBlankRenderer.tsx:36-46` |
| 侧边栏 drawer | `app/components/learn/layout/LearnSidebar.tsx:135-224` |
| 能力标签默认折叠 | `app/routes/learn.ability-map.tsx:67-74` |
| Curriculum 发布无事务 | `app/lib/server/project-curriculum/curriculumDrafts.server.ts:132-220` |
| 提交后滚动锚点 | `app/components/learn/question/LessonPractice.tsx:142-147` |
| 考试组件无导航器 | `app/components/learn/exam/ExamPractice.tsx:165-252` |
| 公共缓存预热 | `app/lib/server/learn/cache-public.server.ts:342-383` |
| Lesson 进度回退路径 | `app/lib/server/learn/progress-write.server.ts:298-341` |
| 错题本 loader | `app/routes/learn.review.tsx:29-33`、`70-118` |
| Vite 配置 | `vite.config.ts` |
