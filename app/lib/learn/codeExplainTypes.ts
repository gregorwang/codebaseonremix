/**
 * 新版「代码 + AI 讲解」专用数据结构。
 *
 * 注意: 项目原本在 `~/lib/learn/types.ts` 里已经有一份 `CodeAnnotation`,
 * 那一份是给 AnnotatedCode.tsx (行内/块下/高亮三种 placement) 用的, 形如:
 *   { startLine, endLine, note, placement }
 *
 * 这里是一份**结构化批注**, 给新版 CodeExplainView 用, 字段更明确,
 * 不再让 AI 把所有内容糊成一个 markdown `note`。两套并存, 互不污染:
 *   - 旧组件继续从 `~/lib/learn/types` 导入。
 *   - 新组件从 `~/lib/learn/codeExplainTypes` 导入。
 */

export type CodeAnnotationLevel =
  | "basic"
  | "important"
  | "risk"
  | "suggestion";

/** 一条结构化批注: 对应某段源码行区间, 像老师在代码旁边写的小评语。 */
export type CodeAnnotation = {
  /** 稳定 id, 用作 key / activeAnnotationId。 */
  id: string;
  /** 关联的源码文件相对路径(仅展示, 不读盘)。 */
  filePath: string;
  /** 1-based 起始行(含)。 */
  startLine: number;
  /** 1-based 结束行(含, >= startLine)。 */
  endLine: number;
  /** 卡片标题, 一句话点出这段代码的角色。 */
  title: string;
  /** 严重程度 / 类别, 控制卡片配色。 */
  level: CodeAnnotationLevel;
  /** 一行简介, 卡片折叠态优先显示。 */
  summary: string;
  /** 详细说明, 多 1~3 句。 */
  details: string;
  /** 风险点, 可选, 红色高亮。 */
  risk?: string;
  /** 修改建议, 可选, 紫色高亮。 */
  suggestion?: string;
};
