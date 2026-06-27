/**
 * 「代码 + AI 讲解」专用数据结构。
 *
 * v5 (当前): 单栏「源码精读讲义」, 给 InlineCodeExplainView 用。
 *   - lineNotes: 每行一句很短的旁批 (≤ 30 字), 直接渲染到那行代码下面。
 *   - blockNotes: 一段代码的多层级讲解, 插入到 endLine 后, 像老师在源码里加批注。
 *
 * v4 (legacy): 左源码 + 右批注栏的卡片式 CodeAnnotation, 给 CodeExplainView 用。
 *   保留导出, 但 AnnotatedSourceCard 不再使用。新代码请用 v5 的两个新类型。
 *
 * v3 之前 (` ~/lib/learn/types.ts ` 里的 CodeAnnotation): 给 AnnotatedCode.tsx
 *   行内/块下/高亮三态注释用, 形如 { startLine, endLine, note, placement }, 也保留。
 */

export type CodeAnnotationLevel =
  | "basic"
  | "important"
  | "risk"
  | "suggestion";

/** v6: AI 一次性输出的"代码行 + 可选旁批"组合。
 *  每行带 line / code / note?, 行号、代码内容、旁批全部由 AI 在同一次输出里同步生成,
 *  从根上避免"AI 数行飘 / 行号锚错位"的问题 — 因为 AI 自己输出代码自己锚行号, 内部一致。 */
export type CodeExplainedLine = {
  /** 1-based 行号, AI 输出时与 code 同步生成。 */
  line: number;
  /** 这一行的源码原文 (AI 从输入里原样 echo, 不做加工)。 */
  code: string;
  /** 可选行内旁批 (≤ 30 字, // 风格小注释), 没有就不出现这字段。 */
  note?: string;
};

/** v5: 一行代码下的简短旁批。AI 同一行只允许一条。
 *  @deprecated v6 起把 line+code+note 合并进 CodeExplainedLine, 这个类型不再用。 */
export type CodeLineNote = {
  /** 1-based 行号。 */
  line: number;
  /** 单行注释正文 (≤ 30 字, 渲染时会以 `//` 前缀显示)。 */
  text: string;
};

/**
 * v5: 一段代码下的多层级讲解块, 渲染在 endLine 后的代码流里 (不是右栏卡片)。
 * 字段拆细是为了 UI 能用小标签区分 why / risk / suggestion 三种语气, 不让 AI
 * 把所有内容糊在一个 markdown 段里。
 */
export type CodeBlockNote = {
  /** 稳定 id, 本次输出里唯一。 */
  id: string;
  /** 1-based 起始行 (含)。用作"重点段落"软高亮起点。 */
  startLine: number;
  /** 1-based 结束行 (含)。讲解块插入到这一行**之后**。 */
  endLine: number;
  /** ≤ 24 字, 这段代码段的角色, 例如「为什么这里要先判断 cookie」。 */
  title: string;
  /** 严重程度 / 类别, 控制讲解块配色与小标签。 */
  level: CodeAnnotationLevel;
  /** 1-2 句简介, 这段代码段在干嘛。 */
  summary: string;
  /** 可选: 为什么这样写, 因果原理。 */
  why?: string;
  /** 可选: AI 来改这里最容易改坏什么 (红色小标签)。 */
  risk?: string;
  /** 可选: 应该怎么改更稳 (紫色小标签)。 */
  suggestion?: string;
};

/* --------------------------------------------------------------
 * v4 legacy: 右侧卡片式批注 (CodeExplainView 用)。保留导出, 但已不在新页面使用。
 * 新代码请使用 CodeLineNote + CodeBlockNote。
 * ------------------------------------------------------------ */

/** @deprecated v4 右栏卡片式批注。新代码用 CodeLineNote / CodeBlockNote。 */
export type CodeAnnotation = {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  title: string;
  level: CodeAnnotationLevel;
  summary: string;
  details: string;
  risk?: string;
  suggestion?: string;
};
