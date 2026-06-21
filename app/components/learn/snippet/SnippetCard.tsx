import { Link } from "react-router";
import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import type { CodeSnippet } from "~/lib/learn/types";
import { Badge } from "~/components/learn/ui/Badge";

type SnippetCardProps = {
  snippet: CodeSnippet;
  draftCount?: number;
};

export function SnippetCard({ snippet, draftCount = 0 }: SnippetCardProps) {
  return (
    <Link
      to={`/learn/snippets/${snippet.id}`}
      className="studio-card studio-card-interactive group block p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold tracking-tight text-[var(--fg-primary)]">
            {snippet.title}
          </h3>
          {snippet.sourceFilePath && (
            <p className="mt-1 truncate font-mono text-xs text-[var(--fg-soft)]">
              {snippet.sourceFilePath}
            </p>
          )}
        </div>
        {draftCount > 0 && (
          <Badge variant="default" dot>
            {draftCount} 份草稿
          </Badge>
        )}
      </div>

      {snippet.abilityTags && snippet.abilityTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {snippet.abilityTags.map((tag) => (
            <Badge key={tag} variant="muted">
              {ABILITY_TAG_LABELS[tag]}
            </Badge>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--fg-soft)]">
        保存于 {new Date(snippet.createdAt).toLocaleString("zh-CN")}
      </p>
    </Link>
  );
}
