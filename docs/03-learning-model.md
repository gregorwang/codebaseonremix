# 03-learning-model.md

# AI 项目接管训练器：学习模型、能力树、题型、错题与阶段考试设计

## 1. 学习模型核心思想

本产品的学习模型不是“从零学编程”。

它训练的是：

> 真实项目代码因果链理解能力。

传统课程常见路径：

```txt
变量 → 函数 → 条件 → 循环 → 组件 → 项目
```

本产品路径：

```txt
真实需求
→ 影响范围判断
→ 前端状态链
→ 后端请求链
→ 前后端连接
→ 错误分支
→ AI 讲解
→ 错题复盘
→ 阶段考试
→ 真实改造
```

用户不是一个完全没有代码概念的人。

用户已经知道项目外壳，但需要训练单文件内部和前后端链路的理解能力。

---

## 2. 学习飞轮

完整学习飞轮如下：

```txt
真实项目问题
→ 课程讲解
→ 代码片段
→ 题目训练
→ 提交答案
→ 系统反馈
→ AI 进一步讲解
→ 错题归类
→ 能力树更新
→ 推荐复习
→ 阶段考试
→ 真实小改造
→ 新代码片段进入系统
```

这个飞轮的目标不是娱乐化，而是让用户不断接管自己的项目。

---

## 3. 核心能力树

一级能力：

1. 前端状态链。
2. 后端请求链。
3. 前后端连接。
4. 代码组织与位置判断。
5. AI 协作判断。
6. 真实改造能力。

---

## 4. 前端状态链能力

### 4.1 状态作用域判断

能力标签：

```txt
frontend.state.scope
frontend.state.local
frontend.state.global
```

训练问题：

- 这个状态影响一个组件，还是整个应用？
- 黑夜模式为什么是全局状态？
- 输入框内容为什么通常是局部状态？
- 当前登录用户为什么不是普通局部状态？
- 多语言选择为什么类似主题状态？

典型案例：

> AI 只把右边容器改成黑色，但侧边栏不变。

正确理解：

> AI 把全局主题需求误判成局部样式需求。

---

### 4.2 事件链理解

能力标签：

```txt
frontend.event.click
frontend.event.change
frontend.event.submit
frontend.event.handler
```

训练问题：

- 用户点击按钮后哪个函数执行？
- onChange 什么时候触发？
- onSubmit 和 onClick 的区别是什么？
- 为什么事件处理函数通常写在 return 前？

训练目标：

> 让用户能在脑子里模拟“用户操作 → 函数执行 → 状态变化”。

---

### 4.3 状态流转

能力标签：

```txt
frontend.state.transition
frontend.state.rerender
frontend.state.loading
frontend.state.error
frontend.state.success
```

训练问题：

- setState 后发生什么？
- loading/success/error 如何切换？
- open/closed 如何控制弹窗？
- selected/active 如何影响样式？
- 状态改变为什么会触发重新渲染？

---

### 4.4 副作用

能力标签：

```txt
frontend.effect.useEffect
frontend.effect.deps
frontend.effect.localStorage
frontend.effect.fetch
frontend.effect.dom
```

训练问题：

- useEffect 什么时候执行？
- 依赖数组是什么意思？
- 为什么保存 localStorage 属于副作用？
- 为什么 fetch 属于副作用？
- 为什么副作用不能随便写在组件顶层？

---

### 4.5 渲染结果判断

能力标签：

```txt
frontend.render.conditional
frontend.render.list
frontend.render.theme
frontend.render.empty
```

训练问题：

- 当前状态下页面显示什么？
- 为什么某个区域没有跟着主题变？
- 为什么数组为空时应该显示空状态？
- 条件渲染如何工作？

---

## 5. 后端请求链能力

### 5.1 请求入口理解

能力标签：

```txt
backend.request.entry
backend.request.method
backend.request.body
```

训练问题：

- 请求从哪里进入后端？
- GET/POST 在业务上有什么区别？
- 为什么写操作不能随便用 GET？
- request body 什么时候解析？

---

### 5.2 Cookie / Session

能力标签：

```txt
backend.session.cookie
backend.session.read
backend.session.user
```

训练问题：

- 后端如何知道用户是谁？
- 为什么不能相信前端传来的 userId？
- Cookie 和 Session 的关系是什么？
- Session 读取失败怎么办？

---

### 5.3 登录态判断

能力标签：

```txt
backend.auth.required
backend.auth.unauthorized
backend.auth.user
```

训练问题：

- 哪些接口必须登录？
- 未登录应该返回 401 还是 403？
- 登录后是否一定能访问所有功能？

---

### 5.4 字段校验

能力标签：

```txt
backend.validation.body
backend.validation.string
backend.validation.length
backend.validation.schema
```

训练问题：

- message 是否存在？
- message 是否是字符串？
- message 是否为空？
- message 是否超长？
- 表单字段不合法应该返回什么？

---

### 5.5 权限 / 封禁 / 资格

能力标签：

```txt
backend.permission.role
backend.permission.admin
backend.ban.user
backend.business.eligibility
```

训练问题：

- 登录用户和管理员有什么区别？
- 被封禁用户为什么不能调用 AI？
- 已领取 token 为什么不能重复领取？
- 权限检查应该在业务执行前还是后？

---

### 5.6 限流

能力标签：

```txt
backend.rateLimit.user
backend.rateLimit.ip
backend.rateLimit.feature
backend.rateLimit.ai
```

训练问题：

- 为什么不能先调用 AI 再检查限流？
- 429 什么时候返回？
- 限流按 IP 还是用户？
- AI 调用为什么尤其需要限流？

---

### 5.7 数据库读写

能力标签：

```txt
backend.db.read
backend.db.write
backend.db.unique
backend.db.transaction
```

训练问题：

- 什么时候读数据库？
- 写数据库前要检查什么？
- 如何避免重复领取？
- 写失败如何处理？

---

### 5.8 AI API 调用

能力标签：

```txt
backend.ai.gateway
backend.ai.call
backend.ai.error
backend.ai.log
```

训练问题：

- 调 AI 前必须经过哪些守门？
- AI Gateway 在系统中承担什么角色？
- AI 调用失败如何返回？
- 为什么 AI 调用要记录日志？

---

## 6. 前后端连接能力

### 6.1 loader/action

能力标签：

```txt
bridge.reactRouter.loader
bridge.reactRouter.action
bridge.reactRouter.redirect
```

训练问题：

- loader 适合加载什么？
- action 适合处理什么？
- redirect 什么时候发生？
- loader/action 和组件状态怎么配合？

---

### 6.2 fetch 请求链

能力标签：

```txt
bridge.fetch.request
bridge.fetch.response
bridge.fetch.error
```

训练问题：

- 前端点击后如何发请求？
- 请求体如何构造？
- 后端返回 JSON 后前端怎么更新？
- 401/403/429 前端怎么展示？

---

### 6.3 错误码映射

能力标签：

```txt
bridge.error.400
bridge.error.401
bridge.error.403
bridge.error.429
bridge.error.500
```

训练问题：

- 400 是输入错。
- 401 是没登录。
- 403 是没权限。
- 429 是太频繁。
- 500 是服务端异常。

目标：

> 让用户不再把所有后端错误都当成“代码炸了”。

---

## 7. 代码组织与位置判断能力

能力标签：

```txt
code.position.import
code.position.state
code.position.derived
code.position.handler
code.position.effect
code.position.return
code.position.helper
```

训练问题：

- 为什么 import 在最前？
- 为什么状态一般在组件顶部？
- 为什么派生数据在 return 前？
- 为什么事件处理函数不要塞满 JSX？
- 为什么 effect 不应该随便放？
- 为什么 helper 函数有时放文件底部？

目标：

> 用户不只是知道这一行什么意思，还要知道为什么放在这里。

---

## 8. AI 协作判断能力

能力标签：

```txt
ai.review.scope
ai.review.architecture
ai.review.security
ai.review.backendGuard
ai.review.stateScope
```

训练问题：

- AI 是不是把全局需求改成局部补丁了？
- AI 有没有漏掉后端权限？
- AI 有没有先调用昂贵 API 再限流？
- AI 有没有只让一个组件变黑？
- AI 生成代码是否破坏了业务边界？

目标：

> 用户能审查 AI，而不是盲信 AI。

---

## 9. 题型设计

### 9.1 单选题

训练概念判断。

示例：

> 黑夜模式应该归类为哪种状态？

选项：

- 局部状态。
- 全局状态。
- 临时变量。
- 后端字段。

---

### 9.2 多选题

训练多个条件判断。

示例：

> AI Chat 调用模型前应该检查哪些内容？

正确项：

- 是否登录。
- message 是否合法。
- 是否触发限流。
- 是否被封禁。

---

### 9.3 排序题

训练因果链。

示例：

> 用户发送消息后的正确顺序。

```txt
输入框状态
→ 点击发送
→ 构造请求
→ 后端读 session
→ 校验 message
→ 检查限流
→ 调 AI
→ 返回结果
→ 前端追加消息
```

---

### 9.4 填空题

训练关键代码。

示例：

```tsx
const [theme, setTheme] = useState<Theme>(____)
```

---

### 9.5 纠错题

训练发现错误。

示例：

错误做法：

> 只给右侧容器添加 dark class。

正确解释：

> 这是局部样式补丁，不是全局主题系统。

---

### 9.6 分支推演题

训练后端逻辑。

示例：

> 未登录用户请求领取 token。

正确路径：

```txt
读取 session
→ user 不存在
→ 返回 401
→ 不检查资格
→ 不写数据库
```

---

### 9.7 位置判断题

训练代码组织。

示例：

> handleSubmit 为什么写在 return 之前？

---

### 9.8 AI 评审题

训练审查 AI 代码。

示例：

> AI 给出的黑夜模式代码只改了 MainPanel。这个方案最大问题是什么？

---

## 10. 错题本设计

错题不是简单收藏，而是能力诊断。

### 10.1 错题字段

- questionId。
- userId。
- wrongAnswer。
- correctAnswer。
- wrongCount。
- abilityTags。
- mistakeType。
- aiSummary。
- lastWrongAt。
- resolvedAt。
- nextReviewAt。

### 10.2 错误类型

```txt
state_scope_error
event_chain_error
state_transition_error
effect_error
backend_guard_order_error
session_error
validation_error
permission_error
rate_limit_error
error_code_error
bridge_error
ai_review_error
code_position_error
```

### 10.3 错题复习策略

复习优先级：

```txt
wrongCount 权重
+ 最近错误权重
+ 阶段考试相关权重
+ 关键能力权重
```

---

## 11. AI 讲解模型

AI 讲解分四层。

### 11.1 提示层

不直接给答案。

例：

> 先想想这个状态会不会影响侧边栏。

### 11.2 错因层

解释用户为什么错。

例：

> 你把全局主题理解成了局部容器样式。

### 11.3 因果链层

完整讲执行顺序。

例：

> 点击按钮 → setTheme → root class 改变 → 所有子组件根据 class 改样式。

### 11.4 项目迁移层

联系用户真实项目。

例：

> 在你的个人网站里，侧边栏和右侧内容区都挂在 root layout 下，所以主题状态应该从 root/app shell 往下传。

---

## 12. 阶段考试模型

阶段考试用于检测能否进入真实改造。

### 12.1 考试结构

每个考试包括：

- 背景。
- 需求。
- 影响范围判断。
- 前端链路题。
- 后端链路题。
- 代码填空。
- AI 评审题。
- 最终方案选择。
- 复盘报告。

### 12.2 评分

评分维度：

- 架构判断。
- 因果链理解。
- 守门顺序。
- 错误处理。
- 代码位置。
- AI 评审能力。

### 12.3 通过标准

建议：

```txt
总分 >= 80 通过
关键能力题不能全错
后端守门顺序题必须正确率 >= 70%
```

---

## 13. 推荐课程结构

### 13.1 课程一：黑夜模式与全局状态

能力：

- state scope。
- root/app shell。
- theme provider。
- localStorage effect。
- AI 评审。

### 13.2 课程二：AI Chat 请求链

能力：

- 输入状态。
- 提交事件。
- 请求构造。
- session。
- validation。
- rate limit。
- AI Gateway。
- response render。

### 13.3 课程三：登录保护与领取 token

能力：

- cookie/session。
- eligibility。
- duplicate check。
- D1 write。
- 401/403/429/400。
- frontend feedback。

---

## 14. 学习模型成功标准

用户训练后应该能做到：

- 看一段组件代码，画出事件与状态链。
- 看一个 action，画出后端守门顺序。
- 判断需求是局部还是全局。
- 判断 AI 改法是否只是局部补丁。
- 能把真实代码片段转成自己的理解笔记。
- 能完成小型真实改造任务。
