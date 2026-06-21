import type { CodeAsset } from "~/lib/learn/types";
import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import { Badge } from "~/components/learn/ui/Badge";

type CodeAssetCardProps = {
  asset: CodeAsset;
};

export function CodeAssetCard({ asset }: CodeAssetCardProps) {
  return (
    <article className="studio-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold tracking-tight text-[var(--fg-primary)]">
            {asset.title}
          </h3>
          <p className="mt-1 truncate font-mono text-xs text-[var(--fg-soft)]">
            {asset.filePath}
          </p>
        </div>
        <Badge variant="muted">{asset.assetType}</Badge>
      </div>
      {asset.userLearningValue && (
        <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
          {asset.userLearningValue}
        </p>
      )}
      <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-[var(--code-border)] bg-[var(--code-bg)] p-3 text-xs text-[var(--code-fg)]">
        <code>
          {asset.code.slice(0, 800)}
          {asset.code.length > 800 ? "\n…" : ""}
        </code>
      </pre>
      {asset.abilityTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {asset.abilityTags.slice(0, 4).map((tag) => (
            <Badge key={tag}>{ABILITY_TAG_LABELS[tag]}</Badge>
          ))}
        </div>
      )}
    </article>
  );
}
