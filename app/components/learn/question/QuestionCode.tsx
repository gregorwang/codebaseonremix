import { CodeBlock } from "~/components/learn/code/CodeBlock";

export function QuestionCode({
  code,
  filePath,
  highlightLines,
  collapsible,
}: {
  code?: string;
  filePath?: string;
  highlightLines?: number[];
  collapsible?: boolean;
}) {
  if (!code) return null;
  return (
    <div className="mt-4">
      <CodeBlock
        code={code}
        filePath={filePath}
        highlightLines={highlightLines}
        collapsible={collapsible ?? code.split("\n").length > 18}
      />
    </div>
  );
}
