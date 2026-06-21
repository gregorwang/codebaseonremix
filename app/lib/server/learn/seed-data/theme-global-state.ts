import type { SeedCourseData } from "./types";
import { q } from "./types";

export const themeGlobalStateCourse: SeedCourseData = {
  slug: "theme-global-state",
  title: "黑夜模式与全局状态",
  subtitle: "从局部补丁到 root 级主题系统",
  description:
    "围绕真实黑夜模式改造失败案例，训练局部状态 vs 全局状态、root/app shell 主题管理、useEffect 持久化，以及 AI 局部补丁识别。",
  projectContext:
    "个人网站曾让 AI 改黑夜模式，结果只有右侧容器变黑，侧边栏不变。根因是把全局主题需求做成了局部样式补丁。",
  difficulty: "intermediate",
  abilityTags: [
    "frontend.state.scope",
    "frontend.state.global",
    "frontend.state.local",
    "frontend.effect.useEffect",
    "ai.review.architecture",
  ],
  orderIndex: 0,
  lessons: [
    {
      slug: "local-patch-trap",
      title: "为什么只改右边容器不够",
      description: "识别 AI 把全局需求做成局部样式补丁的典型错误。",
      learningGoal: "能判断黑夜模式影响的是整个应用，而不是单个容器。",
      sourceFilePath: "app/root.tsx",
      sourceSummary: "AI 只给 MainPanel 加了 dark:bg-gray-900",
      orderIndex: 0,
      questions: [
        q({
          type: "single_choice",
          title: "黑夜模式应归类为哪种状态？",
          prompt: "在个人网站中，用户切换黑夜/白天模式时，这个状态应该如何归类？",
          options: [
            { id: "a", text: "MainPanel 组件内的局部状态" },
            { id: "b", text: "全局主题状态，影响整个应用" },
            { id: "c", text: "仅 CSS 变量，不需要 React 状态" },
            { id: "d", text: "后端 session 字段" },
          ],
          correctAnswer: { choiceId: "b" },
          explanation: {
            short: "黑夜模式是全局主题，不是单个容器的局部样式。",
            detail:
              "主题切换会影响侧边栏、顶栏、内容区等所有区域。如果只改 MainPanel 的 className，侧边栏不会跟随变化。",
            realProjectNote: "你的项目中侧边栏和右侧内容都挂在 root layout 下，主题必须从 root 往下传。",
            commonMistake: "把全局主题理解成给某个 div 加 dark class。",
          },
          abilityTags: ["frontend.state.scope", "frontend.state.global"],
          mistakeTypes: ["state_scope_error"],
          orderIndex: 0,
        }),
        q({
          type: "debug",
          title: "找出错误的黑夜模式实现",
          prompt: "以下代码只让右侧容器变黑，问题出在哪里？",
          code: `function MainPanel() {
  const [dark, setDark] = useState(false);
  return (
    <div className={dark ? "bg-gray-900" : "bg-white"}>
      <Sidebar />  {/* 侧边栏不受 dark 影响 */}
      <Content />
    </div>
  );
}`,
          options: [
            { id: "local-state", text: "主题状态放在 MainPanel 内部，作用域太小" },
            { id: "missing-css", text: "缺少 Tailwind 配置" },
            { id: "sidebar-bug", text: "Sidebar 组件本身有 bug" },
            { id: "use-state-wrong", text: "useState 语法错误" },
          ],
          correctAnswer: { issueId: "local-state" },
          explanation: {
            short: "主题状态放在了影响范围太小的组件里。",
            detail: "dark 状态只在 MainPanel 内可见，Sidebar 是兄弟节点或外层节点，无法读取这个局部状态。",
          },
          abilityTags: ["frontend.state.scope", "ai.review.architecture"],
          mistakeTypes: ["state_scope_error", "ai_review_error"],
          orderIndex: 1,
        }),
        q({
          type: "ai_review",
          title: "评审 AI 的黑夜模式方案",
          prompt: "AI 建议只在 MainPanel 上加 dark:bg-gray-900，这个方案最大问题是什么？",
          options: [
            { id: "a", text: "只是局部样式补丁，不是全局主题系统" },
            { id: "b", text: "Tailwind 不支持 dark 模式" },
            { id: "c", text: "应该先改后端 API" },
            { id: "d", text: "需要删除 Sidebar 组件" },
          ],
          correctAnswer: { choiceId: "a" },
          explanation: {
            short: "AI 把全局需求降级成了局部补丁。",
            detail: "正确做法是建立全局 theme 状态，在 root/app shell 层统一应用 class 或 context。",
            aiReviewNote: "第五批将支持 AI 增强讲解此题。",
          },
          abilityTags: ["ai.review.architecture", "frontend.state.scope"],
          orderIndex: 2,
        }),
        q({
          type: "multi_choice",
          title: "黑夜模式会影响哪些区域？",
          prompt: "在个人网站中，正确的全局黑夜模式应该影响哪些部分？（多选）",
          options: [
            { id: "sidebar", text: "侧边栏" },
            { id: "header", text: "顶栏/导航" },
            { id: "content", text: "主内容区" },
            { id: "only-input", text: "仅当前输入框" },
          ],
          correctAnswer: { choiceIds: ["sidebar", "header", "content"] },
          explanation: {
            short: "全局主题应覆盖整个 app shell。",
            detail: "输入框内容通常是局部状态，但主题外观应由全局状态驱动。",
          },
          abilityTags: ["frontend.state.global", "frontend.state.scope"],
          orderIndex: 3,
        }),
        q({
          type: "fill_blank",
          title: "判断影响范围",
          prompt: "填写关键词：黑夜模式属于 _____ 状态，而不是局部组件状态。",
          blanks: [
            {
              id: "scope",
              placeholder: "全局/局部",
              acceptedAnswers: ["全局", "global", "全局状态"],
            },
          ],
          correctAnswer: { values: { scope: "全局" } },
          explanation: {
            short: "黑夜模式是典型的全局状态场景。",
            detail: "凡是影响整个应用外观的需求，都应优先考虑全局状态或 root 层 context。",
          },
          abilityTags: ["frontend.state.scope", "frontend.state.global"],
          orderIndex: 4,
        }),
      ],
    },
    {
      slug: "local-vs-global",
      title: "局部状态 vs 全局状态",
      description: "区分哪些数据应该放在组件内，哪些应该提升到全局。",
      learningGoal: "能为新需求选择正确的状态作用域。",
      sourceFilePath: "app/root.tsx",
      orderIndex: 1,
      questions: [
        q({
          type: "single_choice",
          title: "输入框内容属于什么状态？",
          prompt: "聊天输入框里正在输入的文字应该用什么状态管理？",
          options: [
            { id: "a", text: "全局状态" },
            { id: "b", text: "局部状态" },
            { id: "c", text: "Cookie" },
            { id: "d", text: "D1 数据库" },
          ],
          correctAnswer: { choiceId: "b" },
          explanation: {
            short: "输入框草稿通常只影响当前组件。",
            detail: "除非多个远距离组件需要共享输入内容，否则用 useState 即可。",
          },
          abilityTags: ["frontend.state.local"],
          orderIndex: 0,
        }),
        q({
          type: "single_choice",
          title: "当前登录用户属于什么状态？",
          prompt: "已登录用户的信息应该放在哪里？",
          options: [
            { id: "a", text: "某个按钮的 useState" },
            { id: "b", text: "全局 context 或 loader 数据" },
            { id: "c", text: "仅 CSS 变量" },
            { id: "d", text: "不需要状态" },
          ],
          correctAnswer: { choiceId: "b" },
          explanation: {
            short: "用户信息需要被多个组件共享。",
            detail: "导航栏、权限判断、个性化内容都依赖登录态，必须全局可访问。",
          },
          abilityTags: ["frontend.state.global", "backend.session.cookie"],
          orderIndex: 1,
        }),
        q({
          type: "sort",
          title: "状态提升决策顺序",
          prompt: "判断状态作用域的正确思考顺序：",
          sortItems: [
            { id: "1", text: "这个状态会影响哪些 UI？" },
            { id: "2", text: "影响范围是一个组件还是整个应用？" },
            { id: "3", text: "是否需要跨路由持久？" },
            { id: "4", text: "决定放在局部、context 还是 loader" },
          ],
          correctAnswer: { itemIds: ["1", "2", "3", "4"] },
          explanation: {
            short: "先判断影响范围，再决定放置位置。",
            detail: "这是避免 AI 局部补丁的第一道判断。",
          },
          abilityTags: ["frontend.state.scope"],
          orderIndex: 2,
        }),
        q({
          type: "multi_choice",
          title: "适合全局状态的例子",
          prompt: "以下哪些适合作为全局状态？（多选）",
          options: [
            { id: "theme", text: "主题（黑夜/白天）" },
            { id: "locale", text: "语言选择" },
            { id: "hover", text: "按钮 hover 颜色" },
            { id: "user", text: "当前登录用户" },
          ],
          correctAnswer: { choiceIds: ["theme", "locale", "user"] },
          explanation: {
            short: "主题、语言、用户都是跨组件共享的。",
            detail: "hover 颜色是组件内部样式细节，不需要全局状态。",
          },
          abilityTags: ["frontend.state.global", "frontend.state.local"],
          orderIndex: 3,
        }),
        q({
          type: "branch_trace",
          title: "需求影响范围判断",
          prompt: "收到「整个网站切换黑夜模式」需求时，正确的判断路径是？",
          options: [
            { id: "a", text: "影响单个组件 → 局部状态" },
            { id: "b", text: "影响整个应用 → 全局状态" },
            { id: "c", text: "影响后端 → 直接改 D1" },
            { id: "d", text: "影响 CSS → 不需要状态" },
          ],
          correctAnswer: { pathIds: ["b"] },
          explanation: {
            short: "「整个网站」明确指向全局状态。",
            detail: "关键词「整个」是判断作用域的重要信号。",
          },
          abilityTags: ["frontend.state.scope", "project.modify.fullstack"],
          orderIndex: 4,
        }),
      ],
    },
    {
      slug: "root-theme-shell",
      title: "root / app shell 为什么适合放主题",
      description: "理解为什么主题状态应该放在应用最外层。",
      learningGoal: "知道 theme 应挂在 root layout 或 ThemeProvider。",
      sourceFilePath: "app/root.tsx",
      orderIndex: 2,
      questions: [
        q({
          type: "single_choice",
          title: "主题状态最佳位置",
          prompt: "黑夜模式状态最适合放在哪里？",
          options: [
            { id: "a", text: "root.tsx / App shell" },
            { id: "b", text: "某个叶子组件内部" },
            { id: "c", text: "API action 里" },
            { id: "d", text: "wrangler.toml" },
          ],
          correctAnswer: { choiceId: "a" },
          explanation: {
            short: "root 层能覆盖所有子组件。",
            detail: "在 root 设置 class 或 context，所有子树都能响应主题变化。",
          },
          abilityTags: ["frontend.state.global", "project.modify.fullstack"],
          orderIndex: 0,
        }),
        q({
          type: "position_judgement",
          title: "ThemeProvider 放置位置",
          prompt: "ThemeProvider 应该包裹哪一层？",
          options: [
            { id: "root", text: "包裹整个 <html> 或 root layout 下的所有子组件" },
            { id: "panel", text: "只包裹 MainPanel" },
            { id: "button", text: "只包裹切换按钮" },
            { id: "api", text: "放在 loader 返回值里" },
          ],
          correctAnswer: { positionId: "root" },
          explanation: {
            short: "Provider 必须包裹所有需要消费主题的组件。",
            detail: "只包裹 MainPanel 会导致 Sidebar 等外层组件无法访问 theme context。",
          },
          abilityTags: ["frontend.state.global", "code.position.handler"],
          orderIndex: 1,
        }),
        q({
          type: "fill_blank",
          title: "root class 切换",
          prompt: "常见做法是在 document 或 root 元素上切换 _____ class。",
          blanks: [
            { id: "cls", placeholder: "class 名", acceptedAnswers: ["dark", "theme-dark", "dark-mode"] },
          ],
          correctAnswer: { values: { cls: "dark" } },
          explanation: {
            short: "Tailwind dark 模式通常在 html/root 上切换 dark class。",
            detail: "子组件用 dark: 前缀响应父级 class，实现全局主题。",
          },
          abilityTags: ["frontend.state.global"],
          orderIndex: 2,
        }),
        q({
          type: "debug",
          title: "Context 消费范围问题",
          prompt: "ThemeContext 定义在 MainPanel 内，Sidebar 在 MainPanel 外部，问题是什么？",
          code: `// root.tsx
<Sidebar />
<MainPanel>
  <ThemeProvider>  {/* context 只在这个子树内 */}
    <Content />
  </ThemeProvider>
</MainPanel>`,
          options: [
            { id: "scope", text: "Sidebar 在 Provider 外部，无法消费 theme" },
            { id: "syntax", text: "ThemeProvider 语法错误" },
            { id: "tailwind", text: "Tailwind 未安装" },
            { id: "none", text: "没有问题" },
          ],
          correctAnswer: { issueId: "scope" },
          explanation: {
            short: "Provider 位置决定了谁能读到 context。",
            detail: "需要把 ThemeProvider 提升到 Sidebar 和 MainPanel 的共同祖先。",
          },
          abilityTags: ["frontend.state.global", "code.position.handler"],
          orderIndex: 3,
        }),
        q({
          type: "sort",
          title: "主题切换执行链",
          prompt: "用户点击主题切换按钮后，正确的前端执行顺序：",
          sortItems: [
            { id: "1", text: "用户点击切换按钮" },
            { id: "2", text: "调用 setTheme 更新全局状态" },
            { id: "3", text: "root 元素 class 改变" },
            { id: "4", text: "所有子组件样式响应更新" },
          ],
          correctAnswer: { itemIds: ["1", "2", "3", "4"] },
          explanation: {
            short: "点击 → 状态更新 → root class → 子组件响应。",
            detail: "这是前端状态链的完整因果路径。",
          },
          abilityTags: ["frontend.event.click", "frontend.state.global"],
          orderIndex: 4,
        }),
      ],
    },
    {
      slug: "theme-persistence-effect",
      title: "localStorage 与 useEffect",
      description: "主题偏好持久化与副作用时机。",
      learningGoal: "理解 useEffect 在主题持久化中的角色。",
      sourceFilePath: "app/utils/theme.server.ts",
      orderIndex: 3,
      questions: [
        q({
          type: "single_choice",
          title: "useEffect 的作用",
          prompt: "把 theme 写入 localStorage 应该放在哪里？",
          options: [
            { id: "a", text: "useEffect，监听 theme 变化" },
            { id: "b", text: "render 函数体直接写" },
            { id: "c", text: "后端 action" },
            { id: "d", text: "CSS 文件" },
          ],
          correctAnswer: { choiceId: "a" },
          explanation: {
            short: "持久化是副作用，应在 useEffect 中处理。",
            detail: "render 中直接写 localStorage 会导致每次渲染都执行，可能引发问题。",
          },
          abilityTags: ["frontend.effect.useEffect"],
          mistakeTypes: ["effect_error"],
          orderIndex: 0,
        }),
        q({
          type: "fill_blank",
          title: "初始化主题",
          prompt: "页面加载时从 localStorage 读取主题，应在 useEffect 中执行，依赖数组首次为 _____。",
          blanks: [
            { id: "deps", placeholder: "依赖", acceptedAnswers: ["[]", "空", "empty"] },
          ],
          correctAnswer: { values: { deps: "[]" } },
          explanation: {
            short: "首次挂载读取一次本地偏好。",
            detail: "[] 表示只在组件挂载时执行，避免重复读取。",
          },
          abilityTags: ["frontend.effect.useEffect"],
          orderIndex: 1,
        }),
        q({
          type: "multi_choice",
          title: "useEffect 适用场景",
          prompt: "以下哪些属于 useEffect 适合处理的副作用？（多选）",
          options: [
            { id: "storage", text: "同步 theme 到 localStorage" },
            { id: "render", text: "计算展示用的变量" },
            { id: "listener", text: "监听系统主题变化" },
            { id: "jsx", text: "直接返回 JSX" },
          ],
          correctAnswer: { choiceIds: ["storage", "listener"] },
          explanation: {
            short: "持久化和外部订阅是典型副作用。",
            detail: "派生数据和 JSX 应在 render 阶段完成，不放 useEffect。",
          },
          abilityTags: ["frontend.effect.useEffect"],
          orderIndex: 2,
        }),
        q({
          type: "debug",
          title: "无限循环陷阱",
          prompt: "以下 useEffect 可能导致什么问题？\nuseEffect(() => { setTheme(localStorage.getItem('theme')); }, [theme]);",
          options: [
            { id: "loop", text: "依赖 theme 导致循环更新" },
            { id: "none", text: "没有问题" },
            { id: "css", text: "CSS 冲突" },
            { id: "api", text: "API 超时" },
          ],
          correctAnswer: { issueId: "loop" },
          explanation: {
            short: "effect 内 setState 且依赖该 state 会循环。",
            detail: "读取 localStorage 初始化应只在挂载时执行一次。",
          },
          abilityTags: ["frontend.effect.useEffect"],
          mistakeTypes: ["effect_error"],
          orderIndex: 3,
        }),
        q({
          type: "branch_trace",
          title: "刷新后主题恢复",
          prompt: "用户刷新页面后主题从 localStorage 恢复的路径：",
          options: [
            { id: "mount", text: "组件挂载" },
            { id: "read", text: "useEffect 读取 localStorage" },
            { id: "set", text: "setTheme 更新状态" },
            { id: "apply", text: "root class 应用主题" },
          ],
          correctAnswer: { pathIds: ["mount", "read", "set", "apply"] },
          explanation: {
            short: "挂载 → 读取 → 设状态 → 应用样式。",
            detail: "这是主题持久化的完整前端链路。",
          },
          abilityTags: ["frontend.effect.useEffect", "frontend.state.global"],
          orderIndex: 4,
        }),
      ],
    },
    {
      slug: "theme-ai-review-exam",
      title: "AI 评审与改造判断",
      description: "审查 AI 给出的主题方案是否架构正确。",
      learningGoal: "能识别 AI 主题改造中的架构错误。",
      orderIndex: 4,
      questions: [
        q({
          type: "ai_review",
          title: "评审 AI 代码片段",
          prompt: "AI 生成：const [isDark, setIsDark] = useState(false) 放在 ChatInput 组件内用于全站黑夜模式。最大问题是？",
          correctAnswer: { keywords: ["局部", "全局", "作用域"] },
          explanation: {
            short: "全站主题不应放在 ChatInput 局部。",
            detail: "ChatInput 只是应用的一个小组件，其状态无法驱动全站。",
            aiReviewNote: "关键词匹配：局部/全局/作用域",
          },
          abilityTags: ["ai.review.architecture", "frontend.state.scope"],
          orderIndex: 0,
        }),
        q({
          type: "single_choice",
          title: "正确改造第一步",
          prompt: "要把现有局部黑夜模式改成正确架构，第一步应该？",
          options: [
            { id: "a", text: "把 theme 状态提升到 root/app shell" },
            { id: "b", text: "给 Sidebar 也加同样的 className" },
            { id: "c", text: "删除所有 dark 样式" },
            { id: "d", text: "改用后端存储主题" },
          ],
          correctAnswer: { choiceId: "a" },
          explanation: {
            short: "先解决作用域，再统一样式来源。",
            detail: "给 Sidebar 单独加 class 仍是补丁思维，不是架构修复。",
          },
          abilityTags: ["project.modify.fullstack", "ai.review.architecture"],
          orderIndex: 1,
        }),
        q({
          type: "multi_choice",
          title: "完整主题系统应包含",
          prompt: "一个正确的主题系统通常包括哪些部分？（多选）",
          options: [
            { id: "state", text: "全局 theme 状态" },
            { id: "toggle", text: "切换 UI" },
            { id: "persist", text: "localStorage 持久化" },
            { id: "patch", text: "每个组件各自维护一套主题" },
          ],
          correctAnswer: { choiceIds: ["state", "toggle", "persist"] },
          explanation: {
            short: "全局状态 + 切换入口 + 持久化 = 完整方案。",
            detail: "每组件各自维护是反模式。",
          },
          abilityTags: ["project.modify.fullstack", "frontend.state.global"],
          orderIndex: 2,
        }),
        q({
          type: "position_judgement",
          title: "切换按钮 handler 位置",
          prompt: "handleToggleTheme 函数最适合放在哪里？",
          options: [
            { id: "before-return", text: "组件内 return 之前" },
            { id: "inside-jsx", text: "直接写在 JSX 属性里嵌套多层逻辑" },
            { id: "sql", text: "SQL migration 文件" },
            { id: "css", text: "global.css 底部" },
          ],
          correctAnswer: { positionId: "before-return" },
          explanation: {
            short: "事件处理函数写在 return 前，保持 JSX 清晰。",
            detail: "这是代码组织的基本规范。",
          },
          abilityTags: ["code.position.handler"],
          orderIndex: 3,
        }),
        q({
          type: "sort",
          title: "改造任务拆解顺序",
          prompt: "将局部黑夜模式改为全局主题系统的推荐顺序：",
          sortItems: [
            { id: "1", text: "判断需求影响范围为全局" },
            { id: "2", text: "在 root 建立 theme 状态/context" },
            { id: "3", text: "迁移切换按钮到新状态源" },
            { id: "4", text: "添加 localStorage 持久化" },
            { id: "5", text: "移除旧的局部补丁代码" },
          ],
          correctAnswer: { itemIds: ["1", "2", "3", "4", "5"] },
          explanation: {
            short: "判断 → 建立 → 迁移 → 持久化 → 清理。",
            detail: "真实改造的标准拆解流程。",
          },
          abilityTags: ["project.modify.fullstack", "frontend.state.scope"],
          orderIndex: 4,
        }),
      ],
    },
  ],
};
