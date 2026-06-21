import type { TeachingBlock } from "~/lib/learn/types";
import { CodeBlock } from "~/components/learn/code/CodeBlock";

function ConceptBlock({
  block,
}: {
  block: Extract<TeachingBlock, { type: "concept" }>;
}) {
  return (
    <article className="studio-card p-5">
      <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
        {block.title}
      </h3>
      <p className="mt-3 whitespace-pre-wrap leading-relaxed text-[var(--fg-muted)]">
        {block.content}
      </p>
      {block.keyPoints.length > 0 && (
        <ul className="mt-4 space-y-2">
          {block.keyPoints.map((point) => (
            <li
              key={point}
              className="flex gap-2 text-sm text-[var(--fg-muted)]"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function CodeWalkthroughBlock({
  block,
}: {
  block: Extract<TeachingBlock, { type: "code_walkthrough" }>;
}) {
  const highlightLines = block.highlights.flatMap((h) => {
    const lines: number[] = [];
    for (let i = h.lineStart; i <= h.lineEnd; i++) lines.push(i);
    return lines;
  });

  return (
    <article className="studio-card p-5">
      <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
        {block.title}
      </h3>
      <CodeBlock
        code={block.code}
        filePath={`remix/${block.sourceFilePath}`}
        highlightLines={highlightLines}
        collapsible
        className="mt-4"
      />
      {block.highlights.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {block.highlights.map((h) => (
            <div
              key={`${h.lineStart}-${h.label}`}
              className="rounded-lg border border-[var(--accent-fg)]/25 bg-[var(--accent-soft)] p-3"
            >
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-fg)]">
                <span className="rounded bg-[var(--accent-fg)]/15 px-1.5 py-0.5 font-mono text-xs">
                  L{h.lineStart}
                  {h.lineEnd !== h.lineStart ? `–${h.lineEnd}` : ""}
                </span>
                {h.label}
              </p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{h.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function FlowBlock({
  block,
}: {
  block: Extract<TeachingBlock, { type: "flow" }>;
}) {
  return (
    <article className="studio-card p-5">
      <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
        {block.title}
      </h3>
      <ol className="mt-4 space-y-2.5">
        {block.steps.map((step, index) => (
          <li
            key={step.id}
            className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3"
          >
            <span
              aria-hidden
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-sm font-bold text-white shadow"
            >
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-[var(--fg-primary)]">{step.title}</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                {step.description}
              </p>
              {step.sourceHint && (
                <p className="mt-1 font-mono text-xs text-[var(--fg-soft)]">
                  {step.sourceHint}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function ExampleBlock({
  block,
}: {
  block: Extract<TeachingBlock, { type: "example" }>;
}) {
  return (
    <article className="rounded-[var(--radius-card)] border border-emerald-200/60 bg-emerald-50/40 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/5">
      <h3 className="text-lg font-semibold tracking-tight text-emerald-800 dark:text-emerald-200">
        {block.title}
      </h3>
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" />
        </svg>
        场景：{block.scenario}
      </p>
      {block.code && <CodeBlock code={block.code} collapsible className="mt-4" />}
      <p className="mt-3 text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-100/80">
        {block.explanation}
      </p>
    </article>
  );
}

function CheckpointBlock({
  block,
}: {
  block: Extract<TeachingBlock, { type: "checkpoint" }>;
}) {
  return (
    <article className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-soft-brand)] bg-[var(--brand-soft)] p-5">
      <h3 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-[var(--brand-fg-strong)]">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        {block.title}
      </h3>
      <p className="mt-2 text-sm text-[var(--fg-primary)]">{block.prompt}</p>
      <p className="mt-2 text-xs text-[var(--fg-soft)]">
        先在心里回答，再继续往下看。
      </p>
    </article>
  );
}

export function TeachingBlockRenderer({ blocks }: { blocks: TeachingBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "concept":
            return <ConceptBlock key={index} block={block} />;
          case "code_walkthrough":
            return <CodeWalkthroughBlock key={index} block={block} />;
          case "flow":
            return <FlowBlock key={index} block={block} />;
          case "example":
            return <ExampleBlock key={index} block={block} />;
          case "checkpoint":
            return <CheckpointBlock key={index} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
