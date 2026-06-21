# v2 留存代码说明：locateSnippet / /learn/source

> 写于 v3 上线后。v3 把"做题页 AI 讲解卡"从"前端按行号穿插注释"改成"AI 直接产 markdown 成品 + AiMarkdown 整块渲染"。本文档解释 v2 留下的两块代码现在的定位、为什么不删、何时可删。

## v3 链路（当前主链路）

```
用户进入题目
  ↓
前端 POST /learn/courses/.../lessons/...  intent=ai_orientation 或 ai_explanation (带 path)
  ↓
后端 action 走 getSourceFileContent(db, path) 从 D1 取整文件全文
  ↓
全文 + 题目/答案 一起塞 prompt → generateExplanation / generateCodeOrientation
  ↓
AI 返一整段 markdown(含 ```代码块``` + 讲解 + 行号引用)
  ↓
后端透传给前端: { ok:true, markdown: "..." }
  ↓
AnnotatedSourceCard 用 AiMarkdown 整块渲染
```

前端**不再**单独调 `/learn/source`，也**不再**做"按行号在全文里插注释"的二次拼装。

## 留存代码 1：`app/lib/learn/locateSnippet.ts`

**v2 时干什么**：把题目 `question.code` 片段，在全文里"逐行 trim 后子串匹配"找到对应的连续行号区间，给 `AnnotatedCode.tsx` 用来在源码视图里把那几行染上"题目片段高亮"色。

**v3 还在用吗**：不在主链路。`AnnotatedSourceCard` 已经不渲染整文件源码、不显示题目片段高亮，所以 `locateSnippetLines` 不被引用了。

**为什么保留**：
1. 这是个纯函数（无外部依赖、有 7 个单测覆盖），删除是无可逆性的，留着没成本。
2. 若未来想做"在题目卡里把 `question.code` 片段对照全文显示"或"AI 讲解里 L42-L47 → 跳到全文 L42-L47"的跳转能力，这个函数就是现成的"片段→行号"映射工具。
3. 它的算法（首行锚点 + 过半阈值，见 `tests/locateSnippet.test.ts`）解决了 v2 的"首行命中就高亮一大段"bug，是有价值的知识沉淀。

**何时可删**：连续 2 个 release 都没有任何模块引用它，且产品上没有"片段定位到全文"的复活计划。届时和它的测试 `tests/locateSnippet.test.ts` 一起删。

**查谁在用**：
```bash
grep -rn "locateSnippetLines" app/ tests/
```

## 留存代码 2：`app/routes/learn.source.tsx`（resource route `/learn/source`）

**v2 时干什么**：GET 资源路由，前端 `useFetcher` 拉某个 remix 源码文件的全文 + 语言 + 行数，用于源码卡左侧渲染。返回形态：

```ts
{ ok: true; path; code; language; lineCount } | { ok: false; error }
```

总返 HTTP 200（用 `ok` 鉴别成败，避免 useFetcher 把 4xx 当错误抛）。

**v3 还在用吗**：不在主链路。AnnotatedSourceCard 不再 fetch 它。

**为什么保留**：
1. 它是一个**通用的"读 D1 项目源码"端点**，未来任何前端模块（管理后台预览、错题本复盘、源码浏览器视图）想拿原文都能直接用，不必每个调用方都重新封装。
2. 安全侧已经做齐——`getSourceFileContent` 里走 `assertSafeRemixPath`（防 `..` 路径穿越、限白名单扩展），D1 里的 `content` 是扫描阶段已过 `containsHardSecret` 过滤的，端点本身不再需要额外脱敏。
3. 它本身只占一个文件、一个路由声明，删了再造比留着贵。

**何时可删**：
- 连续 2 个 release 都没有任何 fetch 调它（前端搜索 `/learn/source`、grep `learn.source`）；
- 且产品上没有"在前端展示完整源码全文"的功能复活计划。

**查谁在用**：
```bash
grep -rn "/learn/source\|learn.source" app/
```

## 一并说明：`parseAnnotatedExplanation` / `CodeAnnotation` / `AnnotatedExplanation` / `AnnotationPlacement` / `AnnotatedCode.tsx` / `shikiHighlight.client.ts`

v2 的"行锚定 JSON 讲解 + 客户端 shiki 高亮"链路的产物。v3 起**不再被主路径引用**，但目前**未删**：

- `parseAnnotatedExplanation`（在 `aiSchemas.server.ts`）—— v2 用来解析 AI 返回的 `{summary, annotations: [{startLine, endLine, note, placement}]}` JSON。v3 起 AI 直接返 markdown，不再解析。`generateExplanation` / `generateCodeOrientation` 已移除对它的调用。
- `CodeAnnotation` / `AnnotatedExplanation` / `AnnotationPlacement` 类型（在 `types.ts`）—— v2 行锚定数据形态。
- `AnnotatedCode.tsx` —— v2 的"按行渲染源码 + 按 placement 插注释行/内联/高亮"组件。
- `shikiHighlight.client.ts` 的 `highlightToLines` —— v2 给 `AnnotatedCode` 做客户端按行 shiki 高亮的辅助。`highlightCode`（非按行版本）可能还有别处用，保留。

这几块当前都是**孤岛代码**，但和 `locateSnippetLines` 同样有"未来想做行级标注/字符级标注/PR 评审视图"时复用的价值。删除窗口同上：2 个 release 内无人引用即可清理。

## 触发清理的提醒

如果未来谁动了"AI 讲解"卡：
1. 不要在主路径里**重新启用**这几块——除非有明确产品决策回到行锚定模型。
2. 如果决定**真删**，注意还得删配套测试（`tests/locateSnippet.test.ts`）以及 `LEARN_CACHE_KEYS.codeOrientation` 这类已经只在 v3 链路用 markdown 字符串的 KV key 不要去碰（它的"语义"还是"按文件路径缓存 AI 输出"，跟实现细节解耦）。

---

更新于 v3 上线（cache version v15）。
