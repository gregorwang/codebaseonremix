/**
 * 极简 markdown → React 渲染。
 *
 * AI 讲解 prompt (aiPrompts.server.ts) 让模型输出 `### 小标题`/`**bold**`/`- 列表`,
 * 但前端历来用 whitespace-pre-wrap 直接渲染纯文本, 导致 `###` 这种 markdown 标记直接
 * 暴露给用户。引入 react-markdown 对 Workers bundle 偏重, 而我们只需要四种语法:
 *   - 行级:    `### 标题` / `## 标题` / `# 标题`
 *   - 行级:    `- 列表项` / `* 列表项` / `1. 列表项`
 *   - 内联:    `**加粗**`
 *   - 内联:    `` `行内代码` ``
 *
 * 其它原文按段落保留 (双换行隔断, 单换行用 <br />)。
 */
import { Fragment } from "react";
import { CopyAiTextButton } from "~/components/learn/ui/CopyAiTextButton";

type AiMarkdownProps = {
  text: string;
  className?: string;
  /**
   * 是否在右上角显示「复制并追问」按钮（默认 true）。所有 AI 讲解渲染点都走这里,
   * 所以默认开启即可全站覆盖; 个别不需要的地方可显式传 false。
   */
  copyable?: boolean;
};

/** 把一行内含的 `**bold**` 与 ` `code` ` 切成 React node 数组。 */
function renderInline(line: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // 同时匹配 **bold** 和 `code` —— 用一个 regex 一次扫完, 顺序保留。
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) nodes.push(line.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      nodes.push(
        <strong key={i++} className="font-semibold text-[var(--fg-primary)]">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={i++}
          className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--brand-fg)]"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < line.length) nodes.push(line.slice(last));
  return nodes;
}

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "para"; lines: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let buf: string[] = [];
  let listBuf: string[] = [];

  function flushPara() {
    if (buf.length > 0) {
      blocks.push({ kind: "para", lines: buf });
      buf = [];
    }
  }
  function flushList() {
    if (listBuf.length > 0) {
      blocks.push({ kind: "list", items: listBuf });
      listBuf = [];
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    const listMatch = /^\s*(?:[-*]|\d+\.)\s+(.+)$/.exec(line);

    if (headingMatch) {
      flushPara();
      flushList();
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      });
      continue;
    }
    if (listMatch) {
      flushPara();
      listBuf.push(listMatch[1]);
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    buf.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

export function AiMarkdown({ text, className, copyable = true }: AiMarkdownProps) {
  const blocks = parseBlocks(text);
  const content = (
    <div className={className ?? "space-y-3 text-sm leading-[1.7]"}>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          // h1/h2/h3 在 AI 讲解里都是节标题, 视觉一致即可。
          return (
            <p
              key={i}
              className="mt-4 text-sm font-semibold tracking-tight text-[var(--fg-primary)]"
            >
              {renderInline(block.text)}
            </p>
          );
        }
        if (block.kind === "list") {
          return (
            <ul
              key={i}
              className="ml-5 list-disc space-y-1.5 marker:text-[var(--color-brand-500)] text-[var(--fg-muted)]"
            >
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        // 段落: 单换行变 <br />, 双换行(空行)在 parseBlocks 已切成新 block。
        return (
          <p key={i} className="text-[var(--fg-muted)]">
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );

  if (!copyable || text.trim() === "") return content;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <CopyAiTextButton text={text} />
      </div>
      {content}
    </div>
  );
}
