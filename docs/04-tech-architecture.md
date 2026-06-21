# 04-tech-architecture.md

# AI 项目接管训练器：技术架构设计

## 1. 架构目标

本项目基于用户现有技术方向设计：

- Cloudflare 生态。
- React Router / Remix 新体系。
- TypeScript。
- D1。
- KV / R2 作为补充。
- 已有 AI Gateway / AI 网关复用。
- VoidZero 工具链方向。

本架构不是为了做一个静态 Demo，而是为了实现完整自用系统。

---

## 2. 总体架构

```txt
React Router / Remix App
        |
        | loader/action
        |
Cloudflare Workers Runtime
        |
        |-- D1：课程、题目、答题、错题、能力树
        |
        |-- KV：限流、缓存、轻量状态
        |
        |-- R2：代码片段快照、导出报告、题目附件
        |
        |-- AI Gateway Adapter：AI 提示、AI 讲解、AI 出题
        |
        |-- Auth/Session：复用现有登录体系
```

---

## 3. 技术栈

### 3.1 前端 / 全栈

- React。
- React Router framework mode / Remix 新体系。
- TypeScript。
- Vite。
- Tailwind 或现有样式体系，按项目现状决定。

### 3.2 Cloudflare

- Workers。
- D1。
- KV。
- R2。
- Wrangler。
- AI Gateway / AI 网关。
- 可选：Workers AI 或外部模型经 AI Gateway 路由。

### 3.3 工具链

- Vite。
- Vitest。
- Oxc / Rolldown 作为后续 VoidZero 方向。
- ESLint。
- Prettier 或 Biome，按项目已有配置决定。

---

## 4. 目录结构建议

```txt
app/
  root.tsx

  routes/
    learn._index.tsx
    learn.courses._index.tsx
    learn.courses.$courseSlug.tsx
    learn.courses.$courseSlug.lessons.$lessonSlug.tsx
    learn.review.tsx
    learn.ability-map.tsx
    learn.exams._index.tsx
    learn.exams.$examSlug.tsx
    learn.snippets._index.tsx
    learn.snippets.new.tsx
    learn.snippets.$snippetId.tsx
    learn.admin.questions.tsx
    learn.admin.ai-generate.tsx
    learn.admin.drafts.tsx

  components/
    learn/
      layout/
        LearnShell.tsx
        LearnHeader.tsx
        LearnSidebar.tsx

      course/
        CourseCard.tsx
        CourseProgress.tsx
        LessonList.tsx

      question/
        QuestionRenderer.tsx
        SingleChoiceQuestion.tsx
        MultiChoiceQuestion.tsx
        SortQuestion.tsx
        FillBlankQuestion.tsx
        DebugQuestion.tsx
        BranchTraceQuestion.tsx
        PositionJudgementQuestion.tsx
        AiReviewQuestion.tsx
        ExplanationPanel.tsx
        AiHintPanel.tsx

      review/
        MistakeList.tsx
        MistakeCard.tsx
        ReviewFilters.tsx

      ability/
        AbilityMap.tsx
        AbilityNode.tsx
        AbilitySummary.tsx

      exam/
        ExamTaskList.tsx
        ExamResultPanel.tsx

      snippet/
        CodeSnippetEditor.tsx
        CodeSnippetCard.tsx

      admin/
        AiQuestionDraftPreview.tsx
        QuestionEditor.tsx
        DraftReviewActions.tsx

  lib/
    learn/
      types.ts
      abilityTags.ts
      questionCheck.ts
      mistakeClassifier.ts
      abilityScore.ts
      questionFormat.ts

    server/
      learn/
        courses.server.ts
        lessons.server.ts
        questions.server.ts
        attempts.server.ts
        mistakes.server.ts
        ability.server.ts
        exams.server.ts
        snippets.server.ts
        aiDrafts.server.ts
        seed.server.ts

      ai/
        aiGateway.server.ts
        aiPrompts.server.ts
        aiSchemas.server.ts
        aiSafety.server.ts
        aiLogs.server.ts

      auth/
        requireUser.server.ts
        requireAdmin.server.ts

      rate-limit/
        rateLimit.server.ts

migrations/
  0001_learning_core.sql
  0002_learning_ai.sql
  0003_learning_snippets.sql
```

---

## 5. 路由架构

### 5.1 学习页面

```txt
/learn
```

展示：

- 总进度。
- 推荐课程。
- 错题摘要。
- 能力树摘要。
- AI 今日建议。

### 5.2 课程

```txt
/learn/courses
/learn/courses/:courseSlug
```

### 5.3 关卡

```txt
/learn/courses/:courseSlug/lessons/:lessonSlug
```

### 5.4 错题本

```txt
/learn/review
```

### 5.5 能力树

```txt
/learn/ability-map
```

### 5.6 阶段考试

```txt
/learn/exams
/learn/exams/:examSlug
```

### 5.7 代码片段库

```txt
/learn/snippets
/learn/snippets/new
/learn/snippets/:snippetId
```

### 5.8 管理员

```txt
/learn/admin/questions
/learn/admin/ai-generate
/learn/admin/drafts
```

---

## 6. 数据架构

### 6.1 D1

D1 负责核心数据：

- courses。
- lessons。
- questions。
- answer_attempts。
- mistakes。
- ability_scores。
- exams。
- exam_results。
- code_snippets。
- ai_question_drafts。
- ai_explanation_logs。
- ai_usage_logs。

### 6.2 KV

KV 可用于：

- AI 限流计数。
- 用户短期练习状态缓存。
- 热门课程缓存。
- AI 生成草稿短期缓存。

### 6.3 R2

R2 可用于：

- 代码片段快照。
- 导出的学习报告。
- 题目图片。
- 长文本 AI 输出归档。

---

## 7. AI Gateway 架构

### 7.1 复用已有 AI Gateway

不要在各页面直接调用模型。

必须统一封装：

```ts
// app/lib/server/ai/aiGateway.server.ts

export async function callAiGateway(input: AiGatewayInput): Promise<AiGatewayOutput>
```

### 7.2 AI 能力封装

提供四类能力：

```ts
generateHint(input)
generateExplanation(input)
generateMistakeSummary(input)
generateQuestionDraft(input)
```

### 7.3 AI 调用上下文

AI 讲解输入必须包含：

- courseTitle。
- lessonTitle。
- question。
- code。
- userAnswer。
- correctAnswer。
- abilityTags。
- projectContext。
- mistakeType。

### 7.4 AI 出题输入必须包含：

- sourceCode。
- sourceFilePath。
- projectContext。
- targetAbilities。
- preferredQuestionTypes。
- difficulty。
- generationGoal。

### 7.5 AI 输出约束

AI 输出不能自由入库。

必须经过：

1. JSON parse。
2. Schema 校验。
3. 安全检查。
4. 管理员审核。
5. 发布。

---

## 8. 后端 action 守门标准

所有写操作必须遵守：

```txt
1. 检查 request method
2. 读取 session
3. 判断是否登录
4. 判断权限
5. 解析 body
6. 字段校验
7. 限流
8. 执行业务
9. 写入 D1
10. 返回 JSON
```

AI 相关操作顺序：

```txt
1. 登录
2. 管理员/用户权限
3. 字段校验
4. 限流
5. 构造 prompt
6. 调 AI Gateway
7. 校验输出
8. 写日志
9. 返回
```

---

## 9. 服务层设计

### 9.1 courses.server.ts

职责：

- getCourses。
- getCourseBySlug。
- createCourse。
- updateCourse。
- publishCourse。

### 9.2 questions.server.ts

职责：

- getQuestionsByLesson。
- getQuestionById。
- createQuestion。
- updateQuestion。
- publishQuestion。
- archiveQuestion。

### 9.3 attempts.server.ts

职责：

- submitAnswer。
- getUserAttempts。
- calculateLessonProgress。

### 9.4 mistakes.server.ts

职责：

- upsertMistake。
- resolveMistake。
- getMistakesByUser。
- getReviewQueue。

### 9.5 ability.server.ts

职责：

- updateAbilityScore。
- getAbilityMap。
- getWeakAbilities。
- recommendNextLessons。

### 9.6 aiDrafts.server.ts

职责：

- createAiDraft。
- validateAiDraft。
- approveAiDraft。
- rejectAiDraft。
- publishAiDraftAsQuestions。

---

## 10. 答案校验架构

答案校验不依赖 AI。

```ts
checkAnswer(question, userAnswer)
```

返回：

```ts
{
  isCorrect: boolean
  normalizedUserAnswer: unknown
  correctAnswer: unknown
  mistakeType?: string
  explanation: Explanation
  abilityTags: string[]
}
```

AI 讲解是在校验之后的增强，不是判断正确性的基础。

---

## 11. 权限架构

### 11.1 普通用户

- 学习。
- 答题。
- 查看自己的进度。
- 使用 AI 提示。
- 保存代码片段。

### 11.2 管理员

- 创建课程。
- 编辑题目。
- AI 出题。
- 审核草稿。
- 发布题目。
- 查看 AI 日志。

### 11.3 未登录用户

可选开放：

- 浏览课程。
- 试做少量题。
- 不保存云端进度。
- AI 使用受限。

---

## 12. 限流架构

限流对象：

- 提交答案。
- 请求 AI 提示。
- 请求 AI 讲解。
- AI 出题。
- 阶段考试提交。

限流维度：

- userId。
- IP。
- feature。
- time window。

建议 KV 存计数。

---

## 13. 日志架构

### 13.1 AI 日志

记录：

- userId。
- feature。
- model/provider。
- prompt 类型。
- token/费用估计。
- latency。
- success/failure。
- error message。
- created_at。

### 13.2 答题日志

记录：

- questionId。
- userAnswer。
- isCorrect。
- mistakeType。
- abilityTags。
- created_at。

---

## 14. 测试策略

### 14.1 单元测试

- questionCheck。
- abilityScore。
- mistakeClassifier。
- aiSchemas。
- rateLimit key 生成。

### 14.2 组件测试

- 每种题型组件。
- ExplanationPanel。
- AiHintPanel。
- MistakeList。
- AbilityMap。

### 14.3 集成测试

- 提交答案。
- 错题更新。
- 能力树更新。
- AI 讲解。
- AI 出题草稿保存。

---

## 15. 实现顺序建议

1. 类型和 D1 migration。
2. 课程/题目服务层。
3. 题型组件。
4. 学习页面。
5. 答题提交和进度。
6. 错题本。
7. 能力树。
8. AI Gateway Adapter。
9. AI 提示/讲解。
10. 代码片段库。
11. AI 出题草稿。
12. 管理审核。
13. 阶段考试。
