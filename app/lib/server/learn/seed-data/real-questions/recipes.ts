/**
 * timu.MD verbatim AI 改坏题样例库.
 *
 * 每个 recipe 是一道可以直接拼到某节课的 RealQ,题面/选项/正解/解析/真实
 * 风险全部从 timu.MD 复制,不二次创作. lesson 模块通过传入 RecipeContext
 * 调整层标签 / 主文件 / 错因反馈等本地化字段,并通过 ctx.tagSuffix 在
 * prompt 末尾加上 [course/lesson] 短哈希,避免同一 recipe 在多节课之间
 * 出现 prompt 撞车 (tests/curriculumDuplication.test.ts 守门).
 *
 * Recipe 不是"完整 lesson":它只覆盖该 lesson 应有 22~30 道题中的
 * 5~8 道 ai-review / diff_review / code_fix / review_comment 题.
 * 剩余 14~22 道 basic / code-reading / state-reasoning 题由 lesson 自己写.
 *
 * 锚点:
 *   - §11.3 必须出现的 AI 改坏题  (Nemesis, 8 条)
 *   - §12.2 TypeScript 改坏审查题示例 (TS, 4 条)
 *   - §18.3 Remix 改坏题示例         (Remix, 5 条)
 *   - §19.2 React 改坏题示例         (React, 5 条)
 *   - §20.3 CSS 改坏题示例           (CSS, 6 条)
 *   - §21.4 动画改坏题示例           (Animation, 5 条)
 *   - §22.4 资源管线改坏题示例       (Pipeline, 4 条)
 *
 * 一共 37 个 recipe 函数,按主题 7 组导出.
 */

import { q } from "../types";
import type { RealQ } from "./index";
import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { Layer } from "~/lib/learn/types";

// ────────────────────────────────────────────────────────────────────────────
// 上下文 + 工具
// ────────────────────────────────────────────────────────────────────────────

export type RecipeContext = {
  /** lesson slug, 用于 prompt 末尾的碰撞防止后缀. */
  lessonSlug: string;
  /** 课程 slug, 同上. */
  courseSlug: string;
  /**
   * 该 recipe 出现在 lesson questions 数组中的目标下标.
   * 调用方负责保证它不与 lesson 自己写的题撞 orderIndex.
   */
  orderIndex: number;
  /**
   * 真实锚定文件. 多数 recipe 默认值就是 timu.MD 里写的那个文件,lesson
   * 可在这里覆盖 (例如同文件家族另一节课要改 primaryFile).
   */
  primaryFile?: string;
  /**
   * 失败选项的本地化错因反馈. 调用方可以追加 lesson 特定的解释.
   * 不传则使用 recipe 默认的错因.
   */
  extraWrongAnswerFeedback?: Record<string, string>;
};

/**
 * 在 prompt 末尾加一个 [course/lesson] 短标签,保证 recipe 在不同 lesson
 * 实例化时 prompt 全局唯一. 这是 §24 抽题多样化的兜底: 即使两节课使用
 * 同一 recipe, prompt 也会因为 lesson 后缀不同而唯一.
 */
function tag(ctx: RecipeContext, prompt: string): string {
  return `${prompt}\n[${ctx.courseSlug}/${ctx.lessonSlug}]`;
}

function titleWith(ctx: RecipeContext, base: string): string {
  return `${base} · ${ctx.lessonSlug}`;
}

// ────────────────────────────────────────────────────────────────────────────
// §11.3 Nemesis 8 条 verbatim
// ────────────────────────────────────────────────────────────────────────────

/**
 * §11.3-1: AI 把 checkNemesisRateLimit 放到 guardNemesisMessage 后面.
 * 风险: 被限流请求仍然消耗 Gemini 分类器额度.
 */
export function nemesisRateLimitAfterGuard(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Nemesis §11.3-1 限流被放到守门之后"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 checkNemesisRateLimit 放到 guardNemesisMessage 之后. " +
        "请求先经过守门分类器,再被限流. 最大风险是什么?",
    ),
    options: [
      { id: "A", text: "被限流请求仍然消耗 Gemini 分类器额度" },
      { id: "B", text: "页面会跳到 404" },
      { id: "C", text: "loader 数据会丢失" },
      { id: "D", text: "cookie 不会被读" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "限流必须早于守门;否则被限流请求仍消耗分类器算力.",
      detail:
        "Gemini 分类器是守门链最贵的一环,如果不限流,刷量请求会直接打爆分类器配额, " +
        "并且守门还会写审计日志 / Memory Canon 等副作用.",
    },
    abilityTags: ["backend.rateLimit", "ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/routes/api.nemesis.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/routes/api.nemesis.ts", "app/services/nemesis-guard.server.ts"],
    realWorldImpact:
      "攻击者用脚本高频刷同一 prompt,即使全部被限流,也已让 Gemini 分类器跑了几千次, " +
      "月度账单 / 配额瞬间被吃光.",
    aiReviewRisk:
      "把限流放到昂贵模型之后,失去限流的'第一道闸门'意义;守门承担了不该承担的算力成本.",
    wrongAnswerFeedback: {
      B: "守门顺序和路由是否存在 404 无关.",
      C: "loader 数据与限流位置无关.",
      D: "cookie 读取发生在 loader 阶段,和限流顺序没有因果关系.",
    },
  });
}

/**
 * §11.3-2: AI 在 Guard 拒绝时继续调用 callNemesisModel 生成"更自然的拒绝文案".
 * 风险: 拒绝结果不再是固定文案,可能泄露分类原因、提示词、Memory Canon 或 provider 输出.
 */
export function nemesisModelOnGuardReject(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Nemesis §11.3-2 守门拒绝后仍调主模型"),
    prompt: tag(
      ctx,
      "AI 改坏: 守门拒绝时,继续调用 callNemesisModel 生成'更自然的拒绝文案'. " +
        "最大风险是什么?",
    ),
    options: [
      { id: "A", text: "文案可能泄露分类原因 / 提示词 / Memory Canon / provider 输出" },
      { id: "B", text: "分类器会先失败" },
      { id: "C", text: "loader 会超时" },
      { id: "D", text: "CSS 动画会卡顿" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "拒绝必须用固定文案,主模型不可见守门内部信息.",
      detail:
        "主模型一旦看到 guard.classifierReason / 内部提示 / Memory Canon, 就有可能把 " +
        "敏感上下文写进 '自然' 文案返回前端,直接破坏安全边界. 拒绝必须走预写文案.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/routes/api.nemesis.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/routes/api.nemesis.ts", "app/services/nemesis-guard.server.ts"],
    realWorldImpact:
      "用户在前端看到分类器内部理由,反向调 prompt 绕过安全规则; 严重时 Memory Canon 摘要外泄.",
    aiReviewRisk:
      "把拒绝处理当成'文学生成任务'而非安全事件,等于把守门当文案包装,丧失审计价值.",
    wrongAnswerFeedback: {
      B: "主模型晚于分类器,问题不在分类器阶段.",
      C: "loader 与守门拒绝文案是两段链路.",
      D: "动画与 AI 文案无关.",
    },
  });
}

/**
 * §11.3-3: AI 把 guard.classifierReason 返回给前端.
 * 风险: 泄露安全分类器内部理由,帮助用户反向调 prompt / 绕过规则.
 */
export function nemesisClassifierReasonLeak(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Nemesis §11.3-3 分类器理由外泄"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 guard.classifierReason 字段一起塞进 JSON 返回前端, " +
        "好让前端弹窗显示'为什么被拒绝'. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "泄露安全分类器内部理由,帮助用户反向调 prompt / 绕过规则",
      },
      { id: "B", text: "前端列表渲染会变慢" },
      { id: "C", text: "会触发 React 警告" },
      { id: "D", text: "loader 顺序变错" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "分类器理由是审计资产,不能直接给前端.",
      detail:
        "拒绝文案必须是预写 public 字符串,classifierReason 留在服务端日志, " +
        "可作为管理员排查依据, 绝不能进入公共响应.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/routes/api.nemesis.ts",
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: ["app/routes/api.nemesis.ts", "app/services/nemesis-guard.server.ts"],
    realWorldImpact:
      "用户看到 'classifierReason: 你包含注入关键词 X' 之类的字段,立刻知道如何改写 prompt 绕过.",
    aiReviewRisk:
      "把内部审计字段当用户反馈字段处理,破坏安全分层,这是典型的 'AI 让安全更易用' 反模式.",
    wrongAnswerFeedback: {
      B: "分类器理由是一段短文本,渲染性能与它无关.",
      C: "没有触发 React 警告的特殊字段名.",
      D: "loader 顺序与字段是否返回无关.",
    },
  });
}

/**
 * §11.3-4: AI 删除 ctx.waitUntil,改成直接 await recordNemesisGuardEvent.
 * 风险: 审计变成主响应阻塞点; 但如果审计是关键正确性要求,也不能 fire-and-forget.
 * 题目要让用户判断业务取舍,而不是死背.
 */
export function nemesisAuditWaitUntil(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Nemesis §11.3-4 审计 waitUntil 边界"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 删除 ctx.waitUntil,改成直接 await recordNemesisGuardEvent. " +
        "需要判断的是?",
    ),
    options: [
      { id: "A", text: "审计是否关键正确性 — 是则 await,否则 waitUntil 即可" },
      { id: "B", text: "无论什么情况都应该 await" },
      { id: "C", text: "无论什么情况都应该 fire-and-forget" },
      { id: "D", text: "审计永远不能写 D1" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "审计是否关键,决定 await / waitUntil.",
      detail:
        "如果审计失败就代表请求失败 (比如金融风控),则 await; 如果审计只是事后分析, " +
        "用 ctx.waitUntil 让它跑后台, 不阻塞主响应. 题目要的是业务判断, 不是死记.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/routes/api.nemesis.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/routes/api.nemesis.ts", "app/services/nemesis-guard.server.ts"],
    realWorldImpact:
      "如果审计是合规要求却 fire-and-forget, 出现审计丢失的请求在生产环境无法追溯; " +
      "反之审计只是分析数据却 await, 守门响应 p99 翻倍.",
    aiReviewRisk:
      "AI 一刀切删除 ctx.waitUntil, 没有判断业务对审计失败是否容忍.",
    wrongAnswerFeedback: {
      B: "await 一切会让主响应被审计 IO 拖死.",
      C: "fire-and-forget 一刀切会丢失关键审计.",
      D: "审计可以写 D1, 关键在于写时机.",
    },
  });
}

/**
 * §11.3-5: AI 捕获 provider error 后只返回 'email failed' 或 'model failed'.
 * 风险: 生产调试丢失 status、provider、model、message 等边界证据.
 */
export function nemesisProviderErrorSwallow(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Nemesis §11.3-5 错误吞没丢失证据"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 在 catch 里把 provider error 直接压缩成 'email failed' 或 " +
        "'model failed' 一句话返回给前端. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "生产调试丢失 status / provider / model / message 边界证据",
      },
      { id: "B", text: "前端样式会乱" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "session 会被清" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "错误必须是结构化日志 + 友好前端文案,不能丢失边界证据.",
      detail:
        "返回给用户的可以是友好固定文案, 但服务端日志必须保留 status / provider / model / " +
        "stack trace. 全部压缩成一句话, 线上排查时无法分辨是 Gemini 429 还是 DeepSeek 401.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/services/nemesis.server.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/services/nemesis.server.ts", "app/lib/nemesis-ai-gateway.server.ts"],
    realWorldImpact:
      "线上某条 prompt 持续 500, 只能看到 'model failed', 无法判断是 quota 耗尽 / 网络抖动 " +
      "还是 prompt 注入触发安全护栏, 排查耗时从分钟级涨到小时级.",
    aiReviewRisk:
      "把错误处理当成'用户体验优化', 实际上破坏了生产可观测性.",
    wrongAnswerFeedback: {
      B: "错误文案与样式无关.",
      C: "TS 编译与运行时 catch 内容无关.",
      D: "错误处理与 session 清理无关.",
    },
  });
}

/**
 * §11.3-6: AI 把 parseNemesisReply 改成直接信任模型输出的 URL.
 * 风险: 模型可以把任意外链塞进前端附件,破坏白名单资源边界.
 */
export function nemesisUrlTrustBreak(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Nemesis §11.3-6 信任模型输出 URL"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 parseNemesisReply 改成直接信任模型输出里的 URL, " +
        "不再走白名单 catalog 校验. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "模型可塞任意外链, 破坏白名单资源边界",
      },
      { id: "B", text: "JSON 解析会变慢" },
      { id: "C", text: "Tailwind 不会生效" },
      { id: "D", text: "loader 缓存会失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "URL 必须走 catalog 白名单,不能信任模型字符串.",
      detail:
        "附件 URL 必须来自受控 catalog (image-manifest / 内置表情包), 模型可以输出 " +
        "任何字符串, 直接信任等于把 XSS / 资源外链 / 钓鱼站入口主动开放给模型.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/services/nemesis.server.ts",
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: ["app/services/nemesis.server.ts", "app/generated/image-manifest.ts"],
    realWorldImpact:
      "模型被 prompt 注入后, 返回 'https://attacker.example/x.png', 渲染时变成外站图片, " +
      "可触发钓鱼 / 跟踪像素 / 资源耗尽.",
    aiReviewRisk:
      "把 AI 输出当受信任输入处理, 直接破坏白名单架构. 这是 prompt 注入的关键利用面之一.",
    wrongAnswerFeedback: {
      B: "URL 字符串解析是 O(1) 操作, 性能与白名单无关.",
      C: "样式系统不感知 URL 来源.",
      D: "loader 缓存与附件 URL 解析无关.",
    },
  });
}

/**
 * §11.3-7: AI 让 localStorage 里的历史消息直接提交给后端,不做 role/text 归一化.
 * 风险: 客户端存储不可信,可能污染 recentMessages、放大 prompt 注入或超长上下文.
 */
export function nemesisLocalStorageUntrusted(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Nemesis §11.3-7 localStorage 直接提交"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 让 localStorage 里的历史消息直接拼到请求体提交给后端, " +
        "不做 role/text 归一化. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "客户端存储不可信 — 污染 recentMessages、放大 prompt 注入或超长上下文",
      },
      { id: "B", text: "localStorage 容量会爆" },
      { id: "C", text: "TS strict 编译失败" },
      { id: "D", text: "路由不会切换" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "localStorage 不可信,必须归一化.",
      detail:
        "用户可以手动改 localStorage, 旧客户端版本残留了不存在的 role, 长度无上限. " +
        "提交给后端必须经过 normalizeRecentMessages (类型守卫 + 长度截断 + 字段白名单).",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/hooks/useNemesisChat.client.ts",
    layer: "ai-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: ["app/hooks/useNemesisChat.client.ts", "app/routes/api.nemesis.ts"],
    realWorldImpact:
      "恶意用户修改 localStorage 注入 50KB system 消息, 主模型被 token 洪水冲掉正常上下文; " +
      "更糟的情况是注入 'assistant' 角色伪造回复历史.",
    aiReviewRisk:
      "把客户端存储当可信日志处理, 绕过了所有 server-side 验证.",
    wrongAnswerFeedback: {
      B: "localStorage 容量 (5MB) 与后端无关.",
      C: "TS 编译与运行时是否归一化无关.",
      D: "路由切换与消息提交无关.",
    },
  });
}

/**
 * §11.3-8: AI 给 Grok 路由也默认 fallback 到 DeepSeek.
 * 风险: roast/persona 语气和安全边界可能跨 provider 漂移, 且改变了当前 route contract.
 */
export function nemesisGrokFallbackBreak(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Nemesis §11.3-8 Grok 默认 fallback 漂移"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 给 Grok 路由也默认 fallback 到 DeepSeek, " +
        "理由是 'DeepSeek 更便宜所以默认走它'. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "roast/persona 语气和安全边界跨 provider 漂移, 且改了 route contract",
      },
      { id: "B", text: "DeepSeek 一定比 Grok 慢" },
      { id: "C", text: "D1 表会丢字段" },
      { id: "D", text: "前端 hydrate 会失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "provider 改变路线, persona 与安全边界都漂移.",
      detail:
        "Grok 走 roast / persona 时有专门的安全 prompt + 输出风格约束, " +
        "DeepSeek 上没有; 默认 fallback 改变了 route contract, " +
        "用户在前端看到 'roast' 风格但实际是另个模型的输出, 体验和审计都乱套.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/services/nemesis.server.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/services/nemesis.server.ts", "app/lib/nemesis-ai-gateway.server.ts"],
    realWorldImpact:
      "用户选 'roast Grok 风格' 拿到的是 DeepSeek 输出, 风格和承诺不一致; " +
      "安全 prompt 也不生效, 可能输出 route 合同外的内容.",
    aiReviewRisk:
      "把 '便宜' 当作默认值的依据, 忽略了 route / persona 的设计契约.",
    wrongAnswerFeedback: {
      B: "provider 速度与 fallback 策略无关.",
      C: "D1 表与 provider 选择无关.",
      D: "hydrate 失败通常是 loader 数据问题, 与 provider 切换无关.",
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// §12.2 TypeScript 4 条 verbatim
// ────────────────────────────────────────────────────────────────────────────

/**
 * §12.2-TS-1: 模型 JSON 不能直接断言.
 * AI: const parsed = JSON.parse(raw) as NemesisQueryRouteDecision;
 */
export function tsModelJsonDirectCast(ctx: RecipeContext): RealQ {
  return q({
    type: "code_fix",
    title: titleWith(ctx, "TS §12.2-TS-1 模型 JSON 直接 as"),
    prompt: tag(
      ctx,
      "AI 改坏: 路由解析改成下面这样, 编译过, 但运行期不安全. " +
        "请把代码改写成先把 JSON 当 unknown, 再走 normalizer 收窄到受控 union. " +
        "只写修改后的几行即可 (不要写完整函数).",
    ),
    code: `const parsed = JSON.parse(raw) as NemesisQueryRouteDecision;
return parsed;`,
    codeFixBaseline: `const parsed = JSON.parse(raw) as NemesisQueryRouteDecision;
return parsed;`,
    options: [],
    correctAnswer: {
      patchedCode:
        "const parsed: unknown = JSON.parse(raw);\n" +
        "const queryType = normalizeQueryType((parsed as { queryType?: unknown }).queryType);\n" +
        "const preferredRoute = normalizePreferredRoute((parsed as { preferredRoute?: unknown }).preferredRoute);\n" +
        "const confidence = normalizeConfidence((parsed as { confidence?: unknown }).confidence);\n" +
        "return { queryType, preferredRoute, confidence, quoteTags: normalizeQuoteTags(...) };",
    },
    explanation: {
      short: "as 只能在编译期骗过检查器,运行期 JSON 形状未被验证.",
      detail:
        "模型输出是不可信 JSON, 直接 `as NemesisQueryRouteDecision` 不会验证 queryType / " +
        "preferredRoute / confidence / quoteTags 是否在受控 union 内. " +
        "正确做法是先当 Record<string, unknown>, 再用 normalizeXxx 把未知输入收敛到受控 union.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/services/nemesis.server.ts",
    layer: "typescript-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/services/nemesis.server.ts"],
    typeSafetyRisk:
      "as 让所有错误在编译期被压成 OK, 运行时一个非法 queryType 会一路传到 SSE / 客户端.",
    expectedFixScope: "single-function",
    wrongAnswerFeedback: {
      // code_fix is matched by `patchedCode` normalize, not choiceId, so feedback keys are unused for correctness.
      __unused: "占位字段, code_fix 不按 choice 评分.",
    },
  });
}

/**
 * §12.2-TS-2: 附件类型不能改成可选字段大对象.
 */
export function tsChatAttachmentFlatten(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "TS §12.2-TS-2 附件大对象丢 union"),
    prompt: tag(
      ctx,
      "AI 改坏: 把\n" +
        "  export type ChatAttachment = StickerAttachment | AudioAttachment | VideoAttachment;\n" +
        "改成\n" +
        "  export type ChatAttachment = { type?: string; url?: string; previewUrl?: string; " +
        "artworkUrl?: string; mime?: string; };\n" +
        "有什么问题?",
    ),
    options: [
      {
        id: "A",
        text:
          "丢 discriminated union, 会出现 type=audio 但没 previewUrl 等无效状态, 编译器无法发现",
      },
      { id: "B", text: "JSON.parse 会变慢" },
      { id: "C", text: "loader 会失败" },
      { id: "D", text: "Tailwind class 不会生效" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "discriminated union 收窄丢失,无效状态编译期发现不了.",
      detail:
        "sticker/audio/video 通过 type 字段做收窄, 渲染 / 复制 / 上下文格式化都按 type 安全分支处理. " +
        "改成可选字段大对象后, 会出现 'type 是 audio 但没有 previewUrl' 等无效状态, " +
        "运行时渲染坏附件.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/types/chat.ts",
    layer: "typescript-review",
    serverClientBoundary: "shared",
    touchedFiles: ["app/types/chat.ts", "app/hooks/useNemesisChat.client.ts"],
    typeSafetyRisk:
      "可选字段大对象是 any-like 退化, 编译器无法给出穷尽性检查, 渲染路径出现 impossible state.",
    wrongAnswerFeedback: {
      B: "类型形状与 JSON.parse 性能无关.",
      C: "loader 与附件类型形状无关.",
      D: "Tailwind 与 TS 类型无关.",
    },
  });
}

/**
 * §12.2-TS-3: server/client 边界.
 * AI 在 useNemesisChat.client.ts import { getGeminiLiteModel } from "~/services/nemesis.server";
 */
export function tsServerImportInClient(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "TS §12.2-TS-3 client 导入 server 模块"),
    prompt: tag(
      ctx,
      "AI 改坏: 为了让聊天页面显示当前模型, AI 在 useNemesisChat.client.ts 顶部加:\n" +
        "  import { getGeminiLiteModel } from '~/services/nemesis.server';\n" +
        "为什么这是严重问题?",
    ),
    options: [
      {
        id: "A",
        text: "client 文件会拉入 server 端模块, 把 system prompt / AI Gateway / provider key 拉进浏览器 bundle",
      },
      { id: "B", text: "useState 会变慢" },
      { id: "C", text: "TypeScript 编译会失败" },
      { id: "D", text: "React 19 不支持这个 import" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "client 不能 import .server.ts,会把服务端依赖打进浏览器.",
      detail:
        "nemesis.server.ts 触达 system prompt / Memory Canon / AI Gateway / provider key. " +
        "即使只想要一个常量, 整棵 import tree 都会被 bundler 拉进 client. " +
        "正确做法是服务端在 SSE done/status 事件里返回可公开的 modelName / modelProvider / " +
        "modelRoute, 客户端只消费这些公开字段.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/hooks/useNemesisChat.client.ts",
    layer: "typescript-review",
    serverClientBoundary: "mixed-risk",
    touchedFiles: [
      "app/hooks/useNemesisChat.client.ts",
      "app/services/nemesis.server.ts",
    ],
    typeSafetyRisk:
      ".server.ts 后缀是 vite 强制隔离边界, 跨边界 import 直接破坏 secret / Worker-only 约束.",
    wrongAnswerFeedback: {
      B: "useState 与 import 来源无关.",
      C: "TypeScript 编译会成功 — 这正是危险之处, 没有编译错误但有运行时 bundle 泄漏.",
      D: "React 19 不限制 import, 这是 RR/vite 的文件后缀约定.",
    },
  });
}

/**
 * §12.2-TS-4: SSE 事件类型不能随便扩大.
 */
export function tsSseEventWiden(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "TS §12.2-TS-4 SSE step 扩大为 string"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把\n" +
        "  export type NemesisSseStatusEvent = { step: NemesisSseStep; state: NemesisSseStepState; label: string; };\n" +
        "改成\n" +
        "  export type NemesisSseStatusEvent = { step: string; state: string; label: string; };\n" +
        "请说明风险, 并给出更合适的方向.",
    ),
    options: [
      {
        id: "A",
        text:
          "step/state 退化成 string, 拼写错误 / 未知 step 在编译期不暴露, UI 静默不更新; 正确做法是保留 union, 新增 step 先扩 NemesisSseStep",
      },
      { id: "B", text: "string 比 union 性能更好" },
      { id: "C", text: "SSE 会自动断流" },
      { id: "D", text: "前端没有区别" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "step / state 是受控 union,扩大为 string 后编译期不报.",
      detail:
        "客户端 applyStatusToProgress 依赖这些受控值把 fallback / parse 映射到 UI progress. " +
        "扩大成 string 后, 拼写错误 / 未知 step / 错误 state 都不能在编译期暴露, " +
        "UI 可能静默不更新. 正确做法是保留 union, 要新增 step 应先扩 NemesisSseStep.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/lib/nemesis-sse.server.ts",
    layer: "typescript-review",
    serverClientBoundary: "shared",
    touchedFiles: ["app/lib/nemesis-sse.server.ts", "app/hooks/useNemesisChat.client.ts"],
    typeSafetyRisk: "扩大 union 等价于把 TS 严格模式退化成 any, 失去穷尽性检查.",
    wrongAnswerFeedback: {
      B: "string 与 union 在 V8 性能上没有差异.",
      C: "SSE 断流与字段类型无关.",
      D: "前端有区别 — 错误 step 不会触发对应 UI 状态.",
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// §18.3 Remix 5 条 verbatim
// ────────────────────────────────────────────────────────────────────────────

/**
 * §18.3-1: AI 把 messages loader 对登录用户也设成 public cache.
 * 风险: 用户 pending message / limitStatus 可能被共享缓存污染或泄露.
 */
export function remixPublicCacheOnMessages(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Remix §18.3-1 messages loader 错设 public cache"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 在 messages loader 里对所有用户都设 'Cache-Control: public, max-age=60'. " +
        "登录用户的 pending message / limitStatus 也会被 CDN 缓存. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "用户 pending message / limitStatus 可能被共享缓存污染或泄露给其他用户",
      },
      { id: "B", text: "React 19 不支持" },
      { id: "C", text: "D1 表会丢字段" },
      { id: "D", text: "session 会被清" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "user-specific loader 绝不能 public cache.",
      detail:
        "messages 是按 user 区分的数据, 一旦 public cache, CDN 会按 URL 缓存, " +
        "第二个用户命中同 URL 时会读到第一个用户的消息. 应该是 private 或 no-store.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.loader"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/routes/api.messages.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/routes/api.messages.ts", "app/lib/cache-headers.server.ts"],
    realWorldImpact:
      "用户 A 的私密消息被 CDN 缓存, 用户 B 打开相同 URL 直接看到 A 的内容, 严重隐私事故.",
    aiReviewRisk:
      "把公共资源 cache header 套到 user-specific loader, 没有区分数据的 user 维度.",
    wrongAnswerFeedback: {
      B: "React 19 不感知 loader cache header.",
      C: "D1 表与 cache header 无关.",
      D: "session 不会被 cache header 清掉.",
    },
  });
}

/**
 * §18.3-2: AI 在 game.$platform.tsx 里直接使用 params.platform as PlatformId.
 * 风险: URL 输入未验证, buildGamePlatformData 可能收到非法平台.
 */
export function remixParamsPlatformCast(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Remix §18.3-2 params 直接 as PlatformId"),
    prompt: tag(
      ctx,
      "AI 改坏: 在 game.$platform.tsx 里直接\n" +
        "  const platform = params.platform as PlatformId;\n" +
        "最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "URL 输入未验证, buildGamePlatformData 可能收到非法平台",
      },
      { id: "B", text: "useState 会失败" },
      { id: "C", text: "CSS 会失效" },
      { id: "D", text: "loader 会 404 但不是平台非法" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "params 是 unknown,必须用 isPlatformId 收窄.",
      detail:
        "params 来自 URL, 任何字符串都能塞进来, 直接 `as PlatformId` 让非法平台溜进下游. " +
        "正确做法是用 isPlatformId 守卫, 非法时 throw 404 或走 notFound().",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/routes/game.$platform.tsx",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/routes/game.$platform.tsx", "app/types/game.ts"],
    typeSafetyRisk:
      "URL 是 unknown 来源, as 跳过收窄, 非法 PlatformId 走到 gamePlatformHref 时类型完全撒谎.",
    realWorldImpact:
      "/game/hacker-attack 通过校验进入 buildGamePlatformData, 后续 page 渲染 / 链接拼接全部基于假数据.",
    aiReviewRisk:
      "URL 输入和模型 JSON 一样不可信, 不应 as 强转.",
    wrongAnswerFeedback: {
      B: "useState 与 params 解析无关.",
      C: "CSS 与 params 解析无关.",
      D: "页面 404 是正确行为, 但 as 让非法平台溜过校验, 走到下游才出错, 错误位置更糟.",
    },
  });
}

/**
 * §18.3-3: AI 把 BubbleMessageBoard 的 useFetcher 改成普通 fetch, 但没有处理
 * actionData、pending UI、错误状态.
 */
export function remixFetcherToFetch(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Remix §18.3-3 useFetcher 改 fetch"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 BubbleMessageBoard 的 useFetcher 改成普通 fetch, " +
        "但没处理 actionData / pending UI / 错误状态. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "破坏 Remix mutation 语义和现有 UI 状态 (actionData / pending / 错误)",
      },
      { id: "B", text: "fetch 比 useFetcher 慢一点" },
      { id: "C", text: "TS 编译会失败" },
      { id: "D", text: "D1 会丢字段" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "useFetcher 提供 actionData / pending / 错误状态,普通 fetch 没有.",
      detail:
        "Remix mutation 流程依赖 fetcher.state / fetcher.data / fetcher.formData, 改 fetch 后 " +
        "需要自己实现 pending UI、错误恢复、revalidate, 等于重写一半 Remix.",
    },
    abilityTags: ["ai.review.architecture", "bridge.reactRouter.action"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/messages/BubbleMessageBoard.client.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [
      "app/components/messages/BubbleMessageBoard.client.tsx",
      "app/routes/api.messages.ts",
    ],
    realWorldImpact:
      "提交留言时按钮没有 loading 态, 用户连点导致重复提交; 错误时没有 toast, 用户不知道失败.",
    aiReviewRisk:
      "把 RR mutation 当普通 REST 调用处理, 破坏 RR 的渐进增强与 SSR 数据流.",
    wrongAnswerFeedback: {
      B: "fetch / fetcher 性能差异不是问题点.",
      C: "TS 编译能过, 这正是危险之处.",
      D: "D1 与 fetch / fetcher 选择无关.",
    },
  });
}

/**
 * §18.3-4: AI 删除 headers: forwardLoaderCacheControl.
 * 风险: loader 设置的缓存策略不能正确透传.
 */
export function remixDropForwardLoaderCacheControl(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Remix §18.3-4 删除 forwardLoaderCacheControl"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 在 entry.server.tsx 删除\n" +
        "  headers: forwardLoaderCacheControl\n" +
        "最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "loader 设置的缓存策略不能正确透传, public 资源失去 cache, private 资源可能被错误缓存",
      },
      { id: "B", text: "SSR 速度会变快" },
      { id: "C", text: "React 19 不会 hydrate" },
      { id: "D", text: "TS 报错" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "loader 缓存 header 必须透传到 response,否则缓存层失效.",
      detail:
        "loader 里设的 Cache-Control 是 '信号', entry.server 必须把它合并到 SSR 响应 headers. " +
        "删掉 forwardLoaderCacheControl 后, 公共资源失去 CDN 缓存, 用户敏感资源反而被错误缓存.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/entry.server.tsx",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/entry.server.tsx", "app/lib/cache-headers.server.ts"],
    realWorldImpact:
      "用户首页 logo 重复回源, 流量涨 10x; 同时某条 user-specific loader 错误命中 CDN 缓存.",
    aiReviewRisk:
      "把 SSR 入口的 header 透传当成'可有可无的优化'删掉, 实际是缓存层契约.",
    wrongAnswerFeedback: {
      B: "删除透传不会让 SSR 变快, 反而会让 CDN 回源量上升.",
      C: "hydrate 与 header 透传无关.",
      D: "TS 不会报错, 这是行为级破坏.",
    },
  });
}

/**
 * §18.3-5: AI 把所有 route CSS 全部塞进 root links.
 * 风险: 页面级 CSS 失去按路由加载的边界, 初始包和样式影响面扩大.
 */
export function remixRouteCssInRoot(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Remix §18.3-5 route CSS 全塞 root links"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把所有 route CSS (game.css / music.css / gallery.css / index-route.css) " +
        "全部塞进 root 的 links export. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "页面级 CSS 失去按路由加载的边界, 初始包和样式影响面扩大",
      },
      { id: "B", text: "CSS 不会编译" },
      { id: "C", text: "loader 会失败" },
      { id: "D", text: "主题切换会卡" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "route CSS 应通过 route links 按需加载,全塞 root 等于全部打包.",
      detail:
        "RR 7 的 links export 允许每个 route 声明自己的 CSS, vite 会按路由拆分. " +
        "全塞 root 等于强制首屏加载所有 CSS, 跨页面样式互相覆盖, " +
        "CSS 变量 / @layer 顺序也容易错乱.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/root.tsx",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/root.tsx", "app/styles/index-route.css", "app/styles/game.css"],
    realWorldImpact:
      "首屏下载 800KB CSS, 移动端 LCP 退到 4s+; 切到 game 路由时, gallery 的 .grid 类污染 game 布局.",
    aiReviewRisk:
      "为'省事'破坏 RR 的按路由资源分包, 跨页面样式互相影响.",
    wrongAnswerFeedback: {
      B: "CSS 仍能编译, 这正是问题 — 它编译成功了但全部塞给首屏.",
      C: "loader 与 CSS 引入方式无关.",
      D: "主题切换不直接受影响, 但 CSS 变量被覆盖会导致主题错乱.",
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// §19.2 React 5 条 verbatim
// ────────────────────────────────────────────────────────────────────────────

/**
 * §19.2-1: AI 给 useEffect 少写依赖,导致 sendMessage 用到旧 messages.
 */
export function reactUseEffectMissingDep(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "React §19.2-1 useEffect 依赖漏写"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 给 useEffect 少写依赖:\n" +
        "  useEffect(() => { sendMessage(currentInput, messages); }, [currentInput]);\n" +
        "最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "sendMessage 用到旧的 messages, 用户连续发送或重新生成时历史上下文错",
      },
      { id: "B", text: "useEffect 会变成死循环" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "CSS 不会变" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "闭包捕获旧 messages,上下文错乱.",
      detail:
        "messages 是 effect 内部用到的, 但不在依赖数组里, 第一次执行后 effect 永不重跑, " +
        "后续 sendMessage 拿到的永远是第一次的 messages. 用户连发时新消息丢失.",
    },
    abilityTags: ["frontend.effect.useEffect"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/hooks/useNemesisChat.client.ts",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/hooks/useNemesisChat.client.ts"],
    realWorldImpact:
      "用户连发 3 条消息, 后端只看到第 1 条 + 第 1 条时的旧历史, 上下文断片, 重新生成时旧消息再现.",
    aiReviewRisk:
      "漏依赖是 React 经典 bug, AI 经常为'避免 effect 重跑'漏写 messages / session 等大对象.",
    wrongAnswerFeedback: {
      B: "漏依赖不会造成死循环, 死循环通常来自 setState 漏依赖.",
      C: "TS 不会报 — 依赖数组是 any[].",
      D: "CSS 与 effect 依赖无关.",
    },
  });
}

/**
 * §19.2-2: AI 删除 GSAP cleanup.
 */
export function reactGsapCleanupDropped(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "React §19.2-2 GSAP cleanup 删除"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 gsap.context 里的 ctx.revert() 删除, " +
        "理由是 '反正路由切换组件会卸载'. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "ScrollTrigger / pointerenter listener 残留, 路由切换后重复动画 + 内存泄漏",
      },
      { id: "B", text: "GSAP 会抛错" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "CSS 类会冲突" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "gsap.context 的 revert 是统一清理入口, 删了以后 listener 残留.",
      detail:
        "ScrollTrigger / pointerenter / 自定义 plugin listener 不在 React unmount 路径上, " +
        "必须靠 ctx.revert() 反向清理. 删除后回到 / 再回到 /music, 每次都会注册新的 listener, " +
        "旧 listener 仍在监听, 触发重复动画.",
    },
    abilityTags: ["frontend.effect.useEffect"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/hooks/useMusicAnimations.client.ts",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/hooks/useMusicAnimations.client.ts", "app/routes/gallery.tsx"],
    realWorldImpact:
      "用户在 gallery / music 之间切 5 次, 每次 hover 都触发 5 倍的入场动画, " +
      "低端设备直接卡顿 / 浏览器 crash.",
    aiReviewRisk:
      "把 React unmount 等同于所有副作用清理, 忽略了 GSAP 这种非 React 库的独立生命周期.",
    wrongAnswerFeedback: {
      B: "GSAP 不会立刻抛错, 错误是延迟的 listener 重复触发.",
      C: "TS 不会报错, ctx.revert 是 void 方法, 删除不破坏类型.",
      D: "CSS 类与 GSAP cleanup 无关.",
    },
  });
}

/**
 * §19.2-3: AI 把 submit 状态只存在 DOM disabled 上,不看 fetcher.state.
 */
export function reactSubmitDomDisabledOnly(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "React §19.2-3 submit 状态只看 DOM"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 submit 状态只放在 DOM disabled 上:\n" +
        "  <button disabled={isPending} onClick={...} />\n" +
        "isPending 是从本地 useState 维护, 没看 fetcher.state. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "重复提交 / UI 与 action 真实状态不一致",
      },
      { id: "B", text: "按钮颜色会变" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "loader 会失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "isPending 应跟 fetcher.state 走, 单独维护会漂移.",
      detail:
        "本地 useState 在网络错误 / fetcher revalidate / 切换路由时不会自动重置, " +
        "按钮卡在 disabled 或用户连点成功. 应该用 fetcher.state === 'submitting'.",
    },
    abilityTags: ["frontend.state.local", "frontend.event.submit"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/messages/BubbleMessageBoard.client.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/components/messages/BubbleMessageBoard.client.tsx"],
    realWorldImpact:
      "用户提交留言失败, 按钮卡死, 刷新页面才恢复; " +
      "或者路由切换后 fetcher 已 idle 但本地 isPending 仍是 true, 用户点不到按钮.",
    aiReviewRisk:
      "把 RR 提供的 fetcher.state 当成'装饰品', 自己重造状态机, 必然漂移.",
    wrongAnswerFeedback: {
      B: "按钮颜色不是问题, 状态错乱才是.",
      C: "TS 不会报错.",
      D: "loader 与本地 isPending 无关.",
    },
  });
}

/**
 * §19.2-4: AI 在 render 期间直接调用 video.play().
 */
export function reactVideoPlayInRender(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "React §19.2-4 render 期间 video.play"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 在组件函数体里直接\n" +
        "  if (autoplay) videoRef.current?.play();\n" +
        "最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "副作用出现在 render 阶段, 违反 React 模型, 触发浏览器 play() promise 错误",
      },
      { id: "B", text: "video 元素会变黑" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "useState 会卡" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "副作用必须放进 useEffect / 事件 handler, 不能在 render 阶段执行.",
      detail:
        "render 函数应该纯净, video.play() 是副作用. 浏览器 play() 返回 Promise, " +
        "用户没交互就 autoplay 会被拒, 触发 NotAllowedError, 错误还可能让 React 整个组件树崩.",
    },
    abilityTags: ["frontend.effect.useEffect"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/home/video-showcase.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/components/home/video-showcase.tsx"],
    realWorldImpact:
      "用户首次访问首页 video 区域, 整个 React 树抛 NotAllowedError, 组件树崩, 白屏.",
    aiReviewRisk:
      "把视频自动播放当成 '小副作用' 直接放 render 阶段, 实际上违反 React 副作用模型.",
    wrongAnswerFeedback: {
      B: "video 元素不变黑, 但可能因为 autoplay 策略被静默拒绝.",
      C: "TS 不会报错, videoRef 是已知类型.",
      D: "useState 与 video.play 无关.",
    },
  });
}

/**
 * §19.2-5: AI 把 useRef timer 改成普通局部变量.
 */
export function reactTimerRefToLet(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "React §19.2-5 useRef timer 改 let"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 useRef 存 timer 改成普通 let 变量:\n" +
        "  let timerId: number | null = null;\n" +
        "  timerId = setTimeout(...)\n" +
        "最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "重新渲染后丢失 timer id, RouteTransition 无法可靠 clearTimeout",
      },
      { id: "B", text: "let 比 useRef 性能更好" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "D1 写不进去" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "let 在每次 render 都重置, timer id 会被覆盖丢失.",
      detail:
        "组件函数体每次 render 都跑, let timerId 重新声明为 null. " +
        "上次 setTimeout 的 id 丢失, clearTimeout 拿到的是 null, " +
        "timer 实际还在跑, 重复触发 / 内存泄漏.",
    },
    abilityTags: ["frontend.state.local"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/transitions/RouteTransition.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/components/transitions/RouteTransition.tsx"],
    realWorldImpact:
      "路由切换时旧 timer 还在跑, 用户看到 1 秒前页面的 toast 突然在新页面弹出, " +
      "重复切换后 timer 堆积, 内存泄漏.",
    aiReviewRisk:
      "把 useRef 当成'过度设计'的语法糖, 没意识到 ref 是 render 间的稳定存储.",
    wrongAnswerFeedback: {
      B: "let 与 useRef 性能差异不是关注点.",
      C: "TS 不会报错, let number | null 完全合法.",
      D: "D1 与 timer id 无关.",
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// §20.3 CSS 6 条 verbatim
// ────────────────────────────────────────────────────────────────────────────

/**
 * §20.3-1: AI 删除 @media (prefers-reduced-motion: reduce).
 */
export function cssDropReducedMotion(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "CSS §20.3-1 删除 prefers-reduced-motion"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 觉得 prefers-reduced-motion '影响效果' 直接删掉 @media 块. " +
        "最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "动画敏感用户无法关闭大量动效, 触发前庭功能不适甚至癫痫风险",
      },
      { id: "B", text: "CSS 体积会变小" },
      { id: "C", text: "颜色会失真" },
      { id: "D", text: "loader 加载会变慢" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "prefers-reduced-motion 是无障碍强制要求.",
      detail:
        "前庭功能疾病 / 光敏癫痫用户依赖此 OS 偏好关闭动画. " +
        "删除等于把无障碍设施直接撤掉, 触发不适甚至医疗事件.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/tailwind.css",
    layer: "ai-review",
    serverClientBoundary: "shared",
    touchedFiles: ["app/tailwind.css", "app/styles/music/_animations.css"],
    realWorldImpact:
      "前庭敏感用户在首页 hero 大量动效中直接头晕恶心, 严重时需要就医.",
    aiReviewRisk:
      "把无障碍偏好当成'可有可无的视觉效果优化', 实际上是无障碍合规底线.",
    wrongAnswerFeedback: {
      B: "CSS 体积不是关注点.",
      C: "颜色与 reduced-motion 无关.",
      D: "loader 加载与 reduced-motion 无关.",
    },
  });
}

/**
 * §20.3-2: AI 把 RouteTransition 的 pointer-events 改成 auto.
 */
export function cssRouteTransitionPointerEvents(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "CSS §20.3-2 路由过渡 pointer-events 改 auto"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 在 RouteTransition 把 .leaving 的 pointer-events 改成 auto, " +
        "理由是 '用户想点击离开页面的链接'. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "遮罩拦截页面点击, leaving 状态造成交互卡死",
      },
      { id: "B", text: "CSS 会失效" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "leaving 阶段必须 none, 让用户等动画完成.",
      detail:
        "leaving 阶段遮罩打开, pointer-events: auto 会让用户点击穿透到旧页面, " +
        "引发双重导航 / 旧页面的 fetcher 触发 / 状态错乱. 应保持 none 直到 unmount.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/transitions/RouteTransition.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/components/transitions/RouteTransition.tsx"],
    realWorldImpact:
      "路由切换时用户点击链接, 触发双重 navigation, 旧页面的 fetcher 也被触发, 状态错乱.",
    aiReviewRisk:
      "为'用户体验'打开 leaving 阶段的点击, 实际破坏路由切换的不变量.",
    wrongAnswerFeedback: {
      B: "pointer-events 不会让 CSS 失效.",
      C: "TS 不会报错, 这是纯 CSS 行为.",
      D: "loader 与 pointer-events 无关.",
    },
  });
}

/**
 * §20.3-3: AI 把 gallery reveal 从 transform 改成 animating clip-path + blur.
 */
export function cssGalleryClipPathBlur(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "CSS §20.3-3 gallery reveal 改 clip-path+blur"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 gallery reveal 从 transform: translateY 改成 animating " +
        "clip-path + filter: blur. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "大图滚动时触发重绘, 低端设备卡顿, 性能从 GPU 合成退到 CPU 绘制",
      },
      { id: "B", text: "图片会变形" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "loader 不会 hydrate" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "clip-path + filter 触发重绘, 不是合成层优化.",
      detail:
        "transform / opacity 走 GPU 合成层, 滚动时不重绘. " +
        "clip-path / filter 触发 paint, 大图滚动时整帧重画, 低端设备掉到 20fps.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/routes/gallery.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/routes/gallery.tsx", "app/styles/gallery.css"],
    realWorldImpact:
      "用户在 gallery 页面滚动, 每帧 paint 4MB 大图, iPhone X 滚动掉到 12fps, 触摸响应延迟.",
    aiReviewRisk:
      "为'视觉效果更炫'把合成层动画改成 paint 动画, 性能严重退步.",
    wrongAnswerFeedback: {
      B: "图片不会变形, 但会卡顿.",
      C: "TS 不会报错.",
      D: "hydrate 与 CSS 动画类型无关.",
    },
  });
}

/**
 * §20.3-4: AI 把 BubbleMessageBoard 移动端仍保持两列 grid.
 */
export function cssBubbleTwoColMobile(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "CSS §20.3-4 移动端保持两列 grid"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 BubbleMessageBoard 的 grid-template-columns 从 " +
        "repeat(auto-fit, minmax(320px, 1fr)) 改成 repeat(2, 1fr), " +
        "移动端也保持两列. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "窄屏表单和留言流拥挤, 文本溢出 / 横向滚动条",
      },
      { id: "B", text: "颜色失真" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "fetcher 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "两列在 < 600px 宽屏上不可读.",
      detail:
        "375px 宽屏放两列, 每列只有 170px, 文字断行 / 头像被裁 / 表单输入框窄到看不见. " +
        "正确做法是 @media (max-width: 640px) 切到单列.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/messages/BubbleMessageBoard.client.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: [
      "app/components/messages/BubbleMessageBoard.client.tsx",
      "app/styles/messages.css",
    ],
    realWorldImpact:
      "iPhone SE 用户打开 bubble board, 留言卡片每列只显示 8 个汉字, 头像被裁一半.",
    aiReviewRisk:
      "为'视觉一致'破坏响应式契约, 移动端是 50%+ 流量来源.",
    wrongAnswerFeedback: {
      B: "颜色与 grid 列数无关.",
      C: "TS 不会报错.",
      D: "fetcher 与 grid 布局无关.",
    },
  });
}

/**
 * §20.3-5: AI 把 CSS 变量全部替换为一次性颜色值.
 */
export function cssDropCssVariables(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "CSS §20.3-5 CSS 变量全部硬编码"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 --color-accent / --motion-base / --bubble-size 全部替换为 " +
        "硬编码颜色值与 px. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "主题 / hover / 全局 token 失去统一维护, 改主题成本爆炸, hover 行为不一致",
      },
      { id: "B", text: "CSS 体积会变小" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "CSS 变量是 design token, 硬编码后失去统一维护能力.",
      detail:
        "深色模式 / hover / 主题切换都依赖 --color-accent 等 token, " +
        "硬编码后改主题要全站 search/replace 几百处, hover 行为也会漂移.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/styles/theme.css",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/styles/theme.css", "app/tailwind.css"],
    realWorldImpact:
      "深色模式下 70% 组件仍是亮色, 因为它们硬编码了颜色, 主题切换半失效.",
    aiReviewRisk:
      "为'减少 indirection'把 token 系统拍平, 实际破坏 design system 一致性.",
    wrongAnswerFeedback: {
      B: "硬编码不会让 CSS 体积变小, 反而因为去重失败而变大.",
      C: "TS 不会报错, 纯 CSS 行为.",
      D: "loader 与 CSS 变量无关.",
    },
  });
}

/**
 * §20.3-6: AI 在所有元素上长期加 will-change.
 */
export function cssWillChangeEverywhere(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "CSS §20.3-6 will-change 滥用"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 在所有元素上加 will-change: transform, 理由是 '让 GPU 接管' " +
        "(项目注释里已明确要求谨慎使用). 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "占用 GPU 内存, 反而降低性能, 与项目注释明确要求冲突",
      },
      { id: "B", text: "颜色会失真" },
      { id: "C", text: "TS 报错" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "will-change 是临时 hint, 不能滥用, 占用 GPU 内存.",
      detail:
        "will-change: transform 让浏览器为该元素创建独立合成层, " +
        "全站滥用 = 几百个合成层, 每个 4MB GPU 内存, 总占用几个 GB, " +
        "中低端 GPU 直接 swap, 帧时间反而升高. MDN 与项目注释都明确警告.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/tailwind.css",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/tailwind.css"],
    realWorldImpact:
      "用户在 MacBook Air 打开首页, Chrome 进程 GPU 占用 3GB, 滚动卡顿, 风扇狂转.",
    aiReviewRisk:
      "把'性能优化 hint'当成'加速器', 实际与 will-change 的设计目的相反.",
    wrongAnswerFeedback: {
      B: "颜色与 will-change 无关.",
      C: "TS 不会报错.",
      D: "loader 与 will-change 无关.",
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// §21.4 动画 5 条 verbatim
// ────────────────────────────────────────────────────────────────────────────

/**
 * §21.4-1: AI 把 GSAP import 移到文件顶层.
 */
export function animGsapImportToTop(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Anim §21.4-1 GSAP import 移到顶层"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 useMusicAnimations.client.ts 里的\n" +
        "  const { gsap } = await import('gsap');\n" +
        "改成文件顶层 import { gsap } from 'gsap'. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "server render / build 阶段引入浏览器依赖, 也增加初始包",
      },
      { id: "B", text: "GSAP 不会运行" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: ".client.tsx 顶层 import 仍会被 SSR/build 静态分析, 动态 import 才能保证只在浏览器加载.",
      detail:
        "RR 7 的 .client.tsx 后缀保证文件不进 SSR, 但顶层 import 会被 vite 静态分析, " +
        "gsap 仍被打进 initial chunk. 动态 await import('gsap') 才能真正按需加载, " +
        "避免 server render / build 时拉到浏览器依赖.",
    },
    abilityTags: ["frontend.effect.useEffect"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/hooks/useMusicAnimations.client.ts",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/hooks/useMusicAnimations.client.ts"],
    realWorldImpact:
      "首屏 chunk 多 200KB, 移动端 LCP 退到 3s+; build 时拉到 gsap 的 browser-only 依赖, " +
      "worker 编译失败风险.",
    aiReviewRisk:
      "把 .client.tsx 后缀当成 '已经隔离', 实际顶层 import 仍会被静态分析.",
    wrongAnswerFeedback: {
      B: "GSAP 会运行, 但首屏加载变慢.",
      C: "TS 不会报错.",
      D: "loader 与 import 写法无关.",
    },
  });
}

/**
 * §21.4-2: AI 删除 cancelled 标记.
 */
export function animDropCancelled(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Anim §21.4-2 动态 import 删 cancelled 标记"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 在动态 import GSAP 的 then 回调里删掉 cancelled 检查:\n" +
        "  let cancelled = false;\n" +
        "  useEffect(() => { ... await import('gsap').then(({ gsap }) => { if (!cancelled) gsap... }) ...\n" +
        "最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "动态 import 还没完成时组件已卸载, then 里仍然操作 DOM, 抛 null 引用或写错页面",
      },
      { id: "B", text: "GSAP 不会运行" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "useState 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "异步 then 与 unmount 之间存在 race, 必须用 cancelled 标记守护.",
      detail:
        "动态 import 是异步, 用户可能在 import 还没 resolve 时切走路由. " +
        "没有 cancelled 检查, then 里继续操作已卸载的 DOM, 抛 null 引用或在新页面上误触发动画.",
    },
    abilityTags: ["frontend.effect.useEffect"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/hooks/useMusicAnimations.client.ts",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/hooks/useMusicAnimations.client.ts"],
    realWorldImpact:
      "用户快速切到 /gallery, gsap.then 在 /music 已卸载后执行, 在 gallery 页面上误启动 music 动画.",
    aiReviewRisk:
      "把 async race 当 '理论问题' 删掉, 实际在快速路由切换时必现.",
    wrongAnswerFeedback: {
      B: "GSAP 会运行, 但运行在不正确的页面上.",
      C: "TS 不会报错, cancelled 是 boolean 标记.",
      D: "useState 与 cancelled 标记无关.",
    },
  });
}

/**
 * §21.4-3: AI 删除 ctx.revert (重复 §19.2-2, 这里换为 animation 专属视角).
 * 题目: 删除 RouteTransition 的 GSAP ctx.revert, 切换时未清理 inline style.
 */
export function animDropCtxRevert(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Anim §21.4-3 删 ctx.revert 残留"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 在 RouteTransition 里删除 ctx.revert(), " +
        "理由是 '反正 GSAP 会在下一轮重新初始化'. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "ScrollTrigger / inline style 残留到下一个页面, 重复动画 + 内存泄漏",
      },
      { id: "B", text: "GSAP 不会运行" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "useState 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "gsap.context 的 revert 是统一清理入口, 删了以后 inline style / listener 残留.",
      detail:
        "ScrollTrigger 不会随组件 unmount 自我清理, 必须 ctx.revert. " +
        "下一轮初始化时旧的 ScrollTrigger 仍在监听, 新的又叠加上去, " +
        "重复触发, 元素 inline style 也可能混乱.",
    },
    abilityTags: ["frontend.effect.useEffect"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/transitions/RouteTransition.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/components/transitions/RouteTransition.tsx"],
    realWorldImpact:
      "用户切到 /music 再切回 /, 新一轮入场动画与旧轮残留 listener 叠加, 元素 transform 互相覆盖.",
    aiReviewRisk:
      "把 GSAP 重新初始化当作 cleanup, 实际只覆盖不动旧资源.",
    wrongAnswerFeedback: {
      B: "GSAP 会运行, 但行为错乱.",
      C: "TS 不会报错.",
      D: "useState 与 GSAP 无关.",
    },
  });
}

/**
 * §21.4-4: AI 用 setInterval 手写 RouteTransition.
 */
export function animSetIntervalRouteTransition(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Anim §21.4-4 setInterval 写 RouteTransition"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 用 setInterval 每 16ms 检查 navigation.state 手写 RouteTransition, " +
        "不用 useNavigation. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "难与 Remix navigation.state / location.key / 清理逻辑协调, 容易卡死或重复触发",
      },
      { id: "B", text: "setInterval 比 useNavigation 快" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "D1 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "setInterval 轮询无法准确映射 navigation.state 转移.",
      detail:
        "useNavigation 提供 idle / loading / submitting 状态机, " +
        "setInterval 轮询会错过快速跳转, 重复进入 leaving 状态, " +
        "清理逻辑不与 location.key 联动, 旧动画可能覆盖新动画.",
    },
    abilityTags: ["frontend.state.local"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/transitions/RouteTransition.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/components/transitions/RouteTransition.tsx"],
    realWorldImpact:
      "用户快速连点导航, leaving 状态被多次进入, 遮罩卡死, 必须刷新.",
    aiReviewRisk:
      "把 RR 状态机当成'可以用 polling 模拟', 实际破坏状态一致性.",
    wrongAnswerFeedback: {
      B: "setInterval 与 useNavigation 性能差异不是关注点.",
      C: "TS 不会报错.",
      D: "D1 与 setInterval 无关.",
    },
  });
}

/**
 * §21.4-5: AI 把 AnimatePresence 外层去掉.
 */
export function animDropAnimatePresence(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Anim §21.4-5 删除 AnimatePresence 外层"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 觉得 AnimatePresence '不必要' 直接把 <AnimatePresence> 外层去掉, " +
        "只保留 m.div 配 exit={{ opacity: 0 }}. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "exit 动画不会执行, modal / loading 消失突兀, 失去卸载过渡",
      },
      { id: "B", text: "颜色失真" },
      { id: "C", text: "TS 编译失败" },
      { id: "D", text: "loader 失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "AnimatePresence 是卸载动画的承载器, 没它 exit 不执行.",
      detail:
        "Framer Motion 的 exit 动画依赖 AnimatePresence 保留子节点直到动画完成, " +
        "没外层时子节点立即被卸载, exit 配置不生效, modal 立即消失, 失去过渡感.",
    },
    abilityTags: ["frontend.effect.useEffect"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/nemesis/NemesisThinkingBubble.tsx",
    layer: "ai-review",
    serverClientBoundary: "client",
    touchedFiles: ["app/components/nemesis/NemesisThinkingBubble.tsx"],
    realWorldImpact:
      "Nemesis 思考气泡突然消失, 不再有淡出过渡, 体验突兀, 用户无法判断状态切换是否完成.",
    aiReviewRisk:
      "把 Framer Motion 的 AnimatePresence 当 '装饰 wrapper' 删掉, 实际是卸载动画的承载器.",
    wrongAnswerFeedback: {
      B: "颜色与 AnimatePresence 无关.",
      C: "TS 不会报错.",
      D: "loader 与 AnimatePresence 无关.",
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// §22.4 资源管线 4 条 verbatim
// ────────────────────────────────────────────────────────────────────────────

/**
 * §22.4-1: AI 直接编辑 app/generated/image-manifest.ts.
 */
export function pipelineEditImageManifest(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Pipeline §22.4-1 手改 image-manifest"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 直接在 app/generated/image-manifest.ts 末尾加新图片条目, " +
        "理由是 '只加一行, 比跑 images:process 快'. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "下次 images:process 会覆盖, 绕过 hash 与上传队列, 缓存策略失效",
      },
      { id: "B", text: "TS 编译失败" },
      { id: "C", text: "loader 失败" },
      { id: "D", text: "Tailwind 不会生效" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "app/generated 是 AUTO-GENERATED, 不手改.",
      detail:
        "app/generated/image-manifest.ts 是 images:process 的产物, 文件头注释明确写 " +
        "'DO NOT EDIT'. 手改后下次跑 process 时被覆盖, 新图片缺 sha256 hash, " +
        "CDN 缓存策略失效, upload-manifest 也不会包含它.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/generated/image-manifest.ts",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/generated/image-manifest.ts", "scripts/process-images.mjs"],
    realWorldImpact:
      "新加的图片没经过 sharp 转 webp, 没 hash 前缀, CDN 命中不到, 用户每次访问都回源.",
    aiReviewRisk:
      "为'省时间'破坏构建产物的不变量, 后续维护与回滚成本远高于跑一次 process.",
    wrongAnswerFeedback: {
      B: "TS 不会报错, 看起来是合法代码.",
      C: "loader 不会立刻失败, 但缓存层会失效.",
      D: "Tailwind 与 manifest 无关.",
    },
  });
}

/**
 * §22.4-2: AI 把 raw 图片直接放 public 并引用.
 */
export function pipelineRawImageInPublic(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Pipeline §22.4-2 raw 图片放 public"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 把 raw 目录里的 jpg 直接复制到 public/images/ 并在组件里引用. " +
        "最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "绕过 R2/CDN hash cache 策略, 生产缓存不可控, 大图未压缩",
      },
      { id: "B", text: "TS 编译失败" },
      { id: "C", text: "loader 失败" },
      { id: "D", text: "图片会消失" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "raw 必须经 process-images 转 webp + hash 后再上传.",
      detail:
        "raw 是 5MB 的 jpg, 直接放 public 等于把未优化的图喂给用户. " +
        "绕过 hash cache 等于每次都重传, R2 / CDN 缓存策略失效. " +
        "正确流程是 config → process-images → upload-manifest → R2.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/components/home/HomeHero.tsx",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/components/home/HomeHero.tsx", "scripts/process-images.mjs"],
    realWorldImpact:
      "首页首屏加载 5MB 未压缩 jpg, LCP 退到 6s+, 移动端流量爆炸, R2 费用也失控.",
    aiReviewRisk:
      "为'快速上线'绕过图片管线, 实际上损失了 hash 缓存 / 体积优化 / 多分辨率.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "loader 不会立刻失败, 但首屏慢.",
      D: "图片不会消失, 但缓存策略失败.",
    },
  });
}

/**
 * §22.4-3: AI 直接编辑 app/data/lyrics/goodbye.json.
 */
export function pipelineEditLyricsJson(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Pipeline §22.4-3 手改歌词 JSON"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 直接编辑 app/data/lyrics/goodbye.json 改正一处错别字. " +
        "最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "下次 lyrics:build 覆盖, 正确源头是 assets/lyrics/*.lrc",
      },
      { id: "B", text: "TS 编译失败" },
      { id: "C", text: "loader 失败" },
      { id: "D", text: "lrc 解析失败" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "app/data/lyrics 是生成结果, 改歌词源应从 assets/lyrics 入手.",
      detail:
        "build-lyrics.mjs 从 assets/lyrics/*.lrc 解析时间戳 + 文本, 写入 app/data/lyrics/*.json. " +
        "直接改 JSON 等下次 build 时被覆盖. 正确做法是修 assets/lyrics/goodbye.lrc.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/data/lyrics/goodbye.json",
    layer: "ai-review",
    serverClientBoundary: "server",
    touchedFiles: ["app/data/lyrics/goodbye.json", "assets/lyrics/goodbye.lrc"],
    realWorldImpact:
      "改完一周后跑 lyrics:build, 错别字回来, 团队浪费排查时间.",
    aiReviewRisk:
      "为'快'直接改生成产物, 破坏源 - 生成的不变量.",
    wrongAnswerFeedback: {
      B: "TS 不会报错.",
      C: "loader 不会立刻失败.",
      D: "lrc 解析与 JSON 是否手改无关.",
    },
  });
}

/**
 * §22.4-4: AI 把 Platform.id 改成 string 后删除 PlatformId.
 */
export function pipelinePlatformIdWiden(ctx: RecipeContext): RealQ {
  return q({
    type: "ai_review",
    title: titleWith(ctx, "Pipeline §22.4-4 PlatformId 改 string"),
    prompt: tag(
      ctx,
      "AI 改坏: AI 在 app/data/game.ts 把 Platform.id 改成 string, " +
        "然后删除 app/types/game.ts 里的 PlatformId. 最大风险是什么?",
    ),
    options: [
      {
        id: "A",
        text: "gamePlatformHref / isPlatformId / AllGamesData 类型约束失效, 编译期不再报非法平台",
      },
      { id: "B", text: "TS 编译失败" },
      { id: "C", text: "loader 失败" },
      { id: "D", text: "图片不会显示" },
    ],
    correctAnswer: { choiceId: "A" },
    explanation: {
      short: "PlatformId 是受控 union, 删了之后所有平台守卫失效.",
      detail:
        "PlatformId 限定平台枚举, gamePlatformHref 用它做 exhaustive switch, " +
        "AllGamesData 用 mapped type 保证每个平台都有数据. 改成 string 后, " +
        "编译器不再报 'platform 不是合法 PlatformId', 非法平台溜到生产.",
    },
    abilityTags: ["ai.review.architecture"] satisfies AbilityTag[],
    sourceFilePath: ctx.primaryFile ?? "app/data/game.ts",
    layer: "typescript-review",
    serverClientBoundary: "shared",
    touchedFiles: ["app/data/game.ts", "app/types/game.ts"],
    typeSafetyRisk:
      "受控 union 退化成 string 等价于 '不验证', 编译期失去 exhaustive 检查.",
    realWorldImpact:
      "新增一个 platform 但忘了在 AllGamesData 加条目, 编译通过, 运行期 gamePlatformHref 返回 undefined.",
    aiReviewRisk:
      "为'少写一个类型'删掉 union 守卫, 把类型安全网拆掉.",
    wrongAnswerFeedback: {
      B: "TS 不会立刻报错, 这是行为级退化.",
      C: "loader 不会立刻失败.",
      D: "图片与 PlatformId 无关.",
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 全部 recipe 索引 (lesson 模块可以 import 这个 map 一次性拿到所有 recipe)
// ────────────────────────────────────────────────────────────────────────────

export const ALL_RECIPES = {
  // §11.3 Nemesis (8)
  nemesisRateLimitAfterGuard,
  nemesisModelOnGuardReject,
  nemesisClassifierReasonLeak,
  nemesisAuditWaitUntil,
  nemesisProviderErrorSwallow,
  nemesisUrlTrustBreak,
  nemesisLocalStorageUntrusted,
  nemesisGrokFallbackBreak,
  // §12.2 TypeScript (4)
  tsModelJsonDirectCast,
  tsChatAttachmentFlatten,
  tsServerImportInClient,
  tsSseEventWiden,
  // §18.3 Remix (5)
  remixPublicCacheOnMessages,
  remixParamsPlatformCast,
  remixFetcherToFetch,
  remixDropForwardLoaderCacheControl,
  remixRouteCssInRoot,
  // §19.2 React (5)
  reactUseEffectMissingDep,
  reactGsapCleanupDropped,
  reactSubmitDomDisabledOnly,
  reactVideoPlayInRender,
  reactTimerRefToLet,
  // §20.3 CSS (6)
  cssDropReducedMotion,
  cssRouteTransitionPointerEvents,
  cssGalleryClipPathBlur,
  cssBubbleTwoColMobile,
  cssDropCssVariables,
  cssWillChangeEverywhere,
  // §21.4 动画 (5)
  animGsapImportToTop,
  animDropCancelled,
  animDropCtxRevert,
  animSetIntervalRouteTransition,
  animDropAnimatePresence,
  // §22.4 资源管线 (4)
  pipelineEditImageManifest,
  pipelineRawImageInPublic,
  pipelineEditLyricsJson,
  pipelinePlatformIdWiden,
} as const;

export type RecipeName = keyof typeof ALL_RECIPES;

/** 方便 lesson 模块一次性拿所有 37 个 recipe (传入 ctx 即可). */
export function buildAllRecipes(ctx: RecipeContext): RealQ[] {
  return Object.values(ALL_RECIPES).map((fn) => fn(ctx));
}

// 防止 layer 类型被擦除 — 确保 recipe 返回的 layer 落在 Layer 联合内.
const _layerTypeCheck: Layer | undefined = undefined;
void _layerTypeCheck;
