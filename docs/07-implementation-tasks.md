# 07-implementation-tasks.md

# AI 项目接管训练器：Cursor Composer 实现任务书

## 1. 使用原则

这份任务书是给 Cursor Composer 执行的。

注意：

- 文档设计的是完整自用系统，不是静态 Demo。
- 不要把需求砍成商业 MVP。
- 但实现仍然必须分批，避免一次性上下文爆炸。
- 每一批都应该能编译、能运行、能验收。
- 已有 AI Gateway / AI 网关能力要复用，不要在页面里散写模型调用。

---

## 2. 总体技术要求

- 使用 React Router / Remix 新体系。
- 使用 TypeScript。
- 使用 Cloudflare Workers。
- 使用 D1。
- 可使用 KV 做限流。
- 可使用 R2 做代码片段附件/导出，第一轮可先留接口。
- AI 调用统一走已有 AI Gateway。
- 不要新建无控制的 AI 直连接口。
- 不要做商业化相关内容。
- 不要做社区、多租户、付费。

---

## 3. 第一批：文档、类型、数据库、服务骨架

### 3.1 目标

先建立完整系统骨架，不写复杂 UI。

### 3.2 创建目录

```txt
app/components/learn/
app/components/learn/layout/
app/components/learn/course/
app/components/learn/question/
app/components/learn/review/
app/components/learn/ability/
app/components/learn/exam/
app/components/learn/snippet/
app/components/learn/admin/

app/lib/learn/
app/lib/server/learn/
app/lib/server/ai/
app/lib/server/rate-limit/
migrations/
```

### 3.3 创建类型文件

文件：

```txt
app/lib/learn/types.ts
```

必须定义：

- Course。
- Lesson。
- Question。
- QuestionType。
- QuestionOption。
- FillBlank。
- SortItem。
- Explanation。
- UserAnswer。
- AnswerResult。
- Mistake。
- AbilityScore。
- Exam。
- ExamResult。
- CodeSnippet。
- AiQuestionDraft。
- AiExplanationInput。
- AiQuestionGenerationInput。

### 3.4 创建 abilityTags

文件：

```txt
app/lib/learn/abilityTags.ts
```

定义能力标签：

- frontend.state.scope。
- frontend.state.global。
- frontend.state.local。
- frontend.event.click。
- frontend.event.submit。
- frontend.effect.useEffect。
- backend.session.cookie。
- backend.auth.required。
- backend.validation.field。
- backend.rateLimit。
- bridge.reactRouter.loader。
- bridge.reactRouter.action。
- code.position.handler。
- ai.review.architecture。
- project.modify.fullstack。

### 3.5 创建 D1 migration

文件：

```txt
migrations/0001_learning_core.sql
migrations/0002_learning_ai.sql
migrations/0003_learning_snippets.sql
```

根据 `05-data-model.md` 创建表。

### 3.6 创建 server 服务骨架

文件：

```txt
app/lib/server/learn/courses.server.ts
app/lib/server/learn/lessons.server.ts
app/lib/server/learn/questions.server.ts
app/lib/server/learn/attempts.server.ts
app/lib/server/learn/mistakes.server.ts
app/lib/server/learn/ability.server.ts
app/lib/server/learn/exams.server.ts
app/lib/server/learn/snippets.server.ts
app/lib/server/learn/aiDrafts.server.ts
```

先写函数签名和基础实现，不需要一次写完全部业务。

### 3.7 验收

- TypeScript 无报错。
- migration 能被 wrangler d1 执行。
- 服务文件能导入。
- 没有 UI 大改动。

---

## 4. 第二批：题目校验与种子课程

### 4.1 创建答案校验

文件：

```txt
app/lib/learn/questionCheck.ts
```

实现：

```ts
checkAnswer(question: Question, userAnswer: UserAnswer): AnswerResult
```

支持：

- single_choice。
- multi_choice。
- sort。
- fill_blank。
- debug。
- branch_trace。
- position_judgement。
- ai_review。

### 4.2 创建错题分类

文件：

```txt
app/lib/learn/mistakeClassifier.ts
```

实现：

```ts
classifyMistake(question, userAnswer, result)
```

### 4.3 创建能力分数计算

文件：

```txt
app/lib/learn/abilityScore.ts
```

实现：

```ts
calculateAbilityScore(correctCount, wrongCount)
updateAbilityFromAttempt(...)
```

### 4.4 创建 seed 数据

文件：

```txt
app/lib/server/learn/seed.server.ts
```

初始课程：

1. theme-global-state。
2. ai-chat-request-chain。
3. auth-protected-token-flow。

每个课程：

- 至少 4 个 lesson。
- 每个 lesson 至少 5 道题。
- 覆盖多题型。
- 解释完整。
- 能力标签完整。

### 4.5 验收

- seed 后 D1 有课程。
- 查询课程能返回 lessons 和 questions。
- checkAnswer 对每种题型可用。

---

## 5. 第三批：学习页面与题型组件

### 5.1 创建学习壳

文件：

```txt
app/components/learn/layout/LearnShell.tsx
app/components/learn/layout/LearnHeader.tsx
app/components/learn/layout/LearnSidebar.tsx
```

要求：

- 与现有网站风格兼容。
- 支持暗色/亮色。
- 不破坏 root.tsx。

### 5.2 创建路由

```txt
app/routes/learn._index.tsx
app/routes/learn.courses._index.tsx
app/routes/learn.courses.$courseSlug.tsx
app/routes/learn.courses.$courseSlug.lessons.$lessonSlug.tsx
```

### 5.3 创建题型组件

```txt
app/components/learn/question/QuestionRenderer.tsx
app/components/learn/question/SingleChoiceQuestion.tsx
app/components/learn/question/MultiChoiceQuestion.tsx
app/components/learn/question/SortQuestion.tsx
app/components/learn/question/FillBlankQuestion.tsx
app/components/learn/question/DebugQuestion.tsx
app/components/learn/question/BranchTraceQuestion.tsx
app/components/learn/question/PositionJudgementQuestion.tsx
app/components/learn/question/AiReviewQuestion.tsx
app/components/learn/question/ExplanationPanel.tsx
```

### 5.4 功能

- 展示题目。
- 用户答题。
- 提交 action。
- 后端校验。
- 写入 answer_attempts。
- 更新 mistakes。
- 更新 ability_scores。
- 显示 explanation。
- 显示下一题。

### 5.5 验收

- 用户能完整完成一个 lesson。
- 答题记录写 D1。
- 错题写 D1。
- 能力分数更新。
- 题型全部可用。

---

## 6. 第四批：错题本与能力树

### 6.1 错题本

路由：

```txt
app/routes/learn.review.tsx
```

组件：

```txt
app/components/learn/review/MistakeList.tsx
app/components/learn/review/MistakeCard.tsx
app/components/learn/review/ReviewFilters.tsx
```

功能：

- 按能力标签筛选。
- 按错误次数排序。
- 显示 AI 总结。
- 标记已解决。
- 重新练习。

### 6.2 能力树

路由：

```txt
app/routes/learn.ability-map.tsx
```

组件：

```txt
app/components/learn/ability/AbilityMap.tsx
app/components/learn/ability/AbilityNode.tsx
app/components/learn/ability/AbilitySummary.tsx
```

功能：

- 显示一级能力。
- 显示标签得分。
- 显示薄弱能力。
- 推荐下一课。

### 6.3 验收

- 错题本能看到真实错题。
- 能力树根据答题记录变化。
- 用户能知道自己弱在哪。

---

## 7. 第五批：AI Gateway 接入

### 7.1 创建 AI Gateway Adapter

文件：

```txt
app/lib/server/ai/aiGateway.server.ts
```

实现：

```ts
callAiGateway()
```

要求：

- 复用现有 AI Gateway 配置。
- 不在组件中直接调用模型。
- 捕获错误。
- 返回统一结构。

### 7.2 创建 prompt 模板

文件：

```txt
app/lib/server/ai/aiPrompts.server.ts
```

实现：

- buildHintPrompt。
- buildExplanationPrompt。
- buildMistakeSummaryPrompt。
- buildQuestionGenerationPrompt。

### 7.3 创建 AI 日志服务

文件：

```txt
app/lib/server/ai/aiLogs.server.ts
```

写入：

- ai_explanation_logs。
- ai_usage_logs。

### 7.4 创建限流

文件：

```txt
app/lib/server/rate-limit/rateLimit.server.ts
```

用于：

- hint。
- explanation。
- question_generation。

### 7.5 前端组件

```txt
app/components/learn/question/AiHintPanel.tsx
```

功能：

- 请求提示。
- 请求讲解。
- 显示 loading。
- 显示错误兜底。

### 7.6 验收

- 答错题后可以点 AI 讲解。
- AI 返回中文解释。
- 调用写日志。
- 超限返回友好错误。
- AI 失败不影响基础答题。

---

## 8. 第六批：代码片段库

### 8.1 路由

```txt
app/routes/learn.snippets._index.tsx
app/routes/learn.snippets.new.tsx
app/routes/learn.snippets.$snippetId.tsx
```

### 8.2 功能

- 新建代码片段。
- 填写来源文件。
- 填写项目背景。
- 填写困惑。
- 选择能力标签。
- 保存到 D1。
- 查看片段。
- 从片段生成题目草稿。

### 8.3 验收

- 用户能保存真实项目代码片段。
- 代码片段能被 AI 出题使用。
- 片段与草稿有关联。

---

## 9. 第七批：AI 出题草稿与审核

### 9.1 路由

```txt
app/routes/learn.admin.ai-generate.tsx
app/routes/learn.admin.drafts.tsx
app/routes/learn.admin.questions.tsx
```

### 9.2 权限

仅管理员可访问。

必须使用：

```ts
requireAdmin()
```

### 9.3 AI 出题流程

```txt
输入代码片段
→ 选择题型
→ 选择能力标签
→ 调 AI Gateway
→ JSON Schema 校验
→ 保存 ai_question_drafts
→ 管理员审核
→ 发布为 questions
```

### 9.4 Schema 校验

文件：

```txt
app/lib/server/ai/aiSchemas.server.ts
```

必须校验：

- type。
- title。
- prompt。
- correctAnswer。
- explanation。
- abilityTags。
- difficulty。

### 9.5 验收

- AI 能生成题目草稿。
- 格式不合法不能保存。
- 草稿默认不发布。
- 管理员能 approve/reject。
- approve 后题目进入正式题库。

---

## 10. 第八批：阶段考试

### 10.1 路由

```txt
app/routes/learn.exams._index.tsx
app/routes/learn.exams.$examSlug.tsx
```

### 10.2 考试

至少 3 个：

1. 全局主题系统考试。
2. 受保护 API 考试。
3. 前后端完整功能考试。

### 10.3 功能

- 展示任务背景。
- 多题组成考试。
- 提交答案。
- 计算分数。
- 写 exam_results。
- 显示薄弱能力。
- 支持 AI 复盘，可选。

### 10.4 验收

- 用户能完成考试。
- 分数写 D1。
- 通过/未通过准确。
- 能看到复盘。

---

## 11. 第九批：视觉与体验打磨

### 11.1 目标

让它像一个长期自用的学习系统，而不是临时页面。

### 11.2 要求

- 学习首页有明确进度。
- 课程卡片美观。
- 题目区域清晰。
- 代码块可读。
- 答题反馈明显。
- AI 面板不喧宾夺主。
- 错题本分类清楚。
- 能力树有成长感。
- 移动端可阅读。
- 暗色/亮色都正常。

---

## 12. 推荐给 Cursor 的第一条总指令

```txt
请阅读 docs/project-code-coach 下的 01 到 07 文档。

注意：这个项目不是商业 MVP，不要做静态 demo，也不要砍掉 AI、D1、错题本、能力树这些核心功能。

但实现要分批。

现在只执行第一批和第二批：
1. 创建学习模块目录
2. 创建 TypeScript 类型
3. 创建 abilityTags
4. 创建 D1 migrations
5. 创建 server 服务骨架
6. 创建 questionCheck、mistakeClassifier、abilityScore
7. 创建 seed.server.ts，包含 3 个真实项目课程的初始题库

暂时不要做页面 UI。
暂时不要接 AI Gateway。
暂时不要做代码片段库。
完成后让我检查。
```

---

## 13. 第二条指令

```txt
继续实现学习页面和题型组件。

只执行第三批：
1. 创建 /learn、/learn/courses、课程详情、lesson 练习页
2. 创建 LearnShell
3. 创建 8 种题型组件
4. 支持提交答案
5. 写入 D1 answer_attempts、mistakes、ability_scores
6. 显示 explanation

不要接 AI。
不要做 admin。
不要做 snippets。
```

---

## 14. 第三条指令

```txt
继续实现错题本和能力树。

只执行第四批：
1. /learn/review
2. /learn/ability-map
3. MistakeList
4. AbilityMap
5. 薄弱能力推荐

要求全部读取 D1。
```

---

## 15. 第四条指令

```txt
继续接入 AI Gateway。

只执行第五批：
1. aiGateway.server.ts
2. aiPrompts.server.ts
3. aiLogs.server.ts
4. rateLimit.server.ts
5. AiHintPanel
6. 答错后的 AI 讲解
7. 渐进提示

必须复用现有 AI Gateway。
不要在组件里直接调用模型。
```

---

## 16. 第五条指令

```txt
继续实现代码片段库和 AI 出题草稿。

执行第六批和第七批：
1. /learn/snippets
2. /learn/snippets/new
3. /learn/admin/ai-generate
4. /learn/admin/drafts
5. AI 生成题目 JSON
6. Schema 校验
7. 管理员审核
8. 发布到正式 questions

注意：AI 生成题目不能直接发布。
```

---

## 17. 第六条指令

```txt
继续实现阶段考试。

执行第八批：
1. /learn/exams
2. /learn/exams/:examSlug
3. 三个阶段考试
4. 分数计算
5. exam_results 写入
6. 薄弱能力复盘
```

---

## 18. 总体验收清单

完整第一版完成时必须满足：

- D1 有课程、关卡、题目。
- 用户能学习 3 个真实项目课程。
- 支持 8 种题型。
- 用户答题写入 D1。
- 错题本可用。
- 能力树可用。
- AI 讲解可用。
- AI 提示可用。
- AI 出题草稿可用。
- 管理审核可用。
- 代码片段库可用。
- 阶段考试可用。
- AI 调用有日志和限流。
- 系统围绕真实项目，而不是普通语法刷题。

---

## 19. 第十二批：Remix 真实项目课程 Seed

### 目标

在开发阶段由 Cursor 阅读只读 `remix/` 源码，手写 `seed-data/site-*.ts` 写入 D1；AI Gateway **仅**用于学习过程讲解/提示，不负责运行时生成课程。

### 课程体系

- **10 门主课**（`origin: project`，`slug` 前缀 `site-`）：root shell、路由、组件、主题、前端状态、loader/action、auth、守卫、Nemesis 全链路、D1/错误反馈
- **3 门示例课**（`origin: sample`，折叠在「示例课程」区）：原 theme-global-state / ai-chat-request-chain / auth-protected-token-flow
- **11 场考试**：8 场项目考试 + 3 场示例考试

### Seed 命令

```bash
npm run db:migrate:local
npm run db:seed:local -- --force   # 全量重建（清空进度/错题/能力分）
```

### 能力树

- `getPublishedAbilityTagsFromCurriculum` 聚合已发布 course / question / exam 的 `ability_tags`
- `AbilityMap` 仅展示课程覆盖或用户已练习的标签

### 已移除（表保留）

- `curriculum:*` CLI 与 project-sources / curriculum-drafts admin 路由
- `migrations/0004_*` 与 `project-curriculum/` server 代码休眠，不参与主流程
