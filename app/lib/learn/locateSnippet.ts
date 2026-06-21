/**
 * 在完整文件源码中定位某个代码片段所在的行区间, 用于源码阅读器把题目片段高亮。
 * 按"逐行 trim 后子串匹配"做: 以片段首个非空行为锚点, 在全文里找最匹配的连续窗口。
 * 返回 1-based 行号数组(连续区间); 匹配不到返回空数组。
 */
export function locateSnippetLines(fullCode: string, snippet: string): number[] {
  if (!fullCode || !snippet) return [];

  const fullLines = fullCode.split("\n").map((l) => l.trim());
  const snippetLines = snippet
    .split("\n")
    .map((l) => l.trim());

  // 去掉片段首尾空行, 保留中间结构。
  let start = 0;
  let end = snippetLines.length - 1;
  while (start <= end && snippetLines[start] === "") start++;
  while (end >= start && snippetLines[end] === "") end--;
  const core = snippetLines.slice(start, end + 1);
  if (core.length === 0) return [];

  const firstLine = core[0]!;
  const nonEmptyCore = core.filter((l) => l !== "").length;
  // 命中阈值: 要求对齐窗口里至少有半数非空行真正匹配, 否则视为没找到。
  // 否则"片段≈整文件 + 首行常见(如 import)"会让一整段被错误高亮成大蓝块。
  const threshold = Math.max(1, Math.ceil(nonEmptyCore * 0.5));
  let bestIndex = -1;
  let bestScore = 0;

  for (let i = 0; i < fullLines.length; i++) {
    if (fullLines[i] !== firstLine || firstLine === "") continue;
    // 从 i 起对齐, 统计 core 中有多少行与全文对应位置相等。
    let score = 0;
    for (let k = 0; k < core.length && i + k < fullLines.length; k++) {
      if (core[k] !== "" && core[k] === fullLines[i + k]) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || bestScore < threshold) return [];

  const spanEnd = Math.min(bestIndex + core.length, fullLines.length);
  const result: number[] = [];
  for (let n = bestIndex + 1; n <= spanEnd; n++) result.push(n);
  return result;
}
