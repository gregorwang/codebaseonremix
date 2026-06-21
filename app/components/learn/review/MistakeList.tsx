import { Link } from "react-router";
import { useFetcher } from "react-router";
import type { MistakeReviewItem } from "~/lib/server/learn/mistakes.server";
import { EmptyState } from "~/components/learn/ui/EmptyState";
import { MistakeCard } from "./MistakeCard";

type MistakeListProps = {
  mistakes: MistakeReviewItem[];
};

type ReviewActionData =
  | { ok: true; mistakeId: string; aiSummary?: string }
  | { ok: false; error: string; code?: string };

export function MistakeList({ mistakes }: MistakeListProps) {
  const fetcher = useFetcher<ReviewActionData>();
  const activeMistakeId =
    fetcher.state !== "idle"
      ? String(fetcher.formData?.get("mistakeId") ?? "")
      : "";
  const activeIntent = fetcher.formData?.get("intent");

  if (mistakes.length === 0) {
    return (
      <EmptyState
        message="当前没有符合条件的错题。"
        action={
          <Link
            to="/learn/courses"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft-brand)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-soft)]"
          >
            去课程练习 →
          </Link>
        }
      />
    );
  }

  function handleResolve(mistakeId: string) {
    fetcher.submit(
      { intent: "resolve_mistake", mistakeId },
      { method: "post" },
    );
  }

  function handleGenerateSummary(mistakeId: string) {
    fetcher.submit(
      { intent: "ai_mistake_summary", mistakeId },
      { method: "post" },
    );
  }

  return (
    <div className="space-y-3">
      {mistakes.map((mistake) => {
        const actionData =
          fetcher.data?.ok && fetcher.data.mistakeId === mistake.id
            ? fetcher.data
            : null;

        let displayMistake = mistake;
        if (actionData?.aiSummary) {
          displayMistake = { ...mistake, aiSummary: actionData.aiSummary };
        } else if (actionData && !actionData.aiSummary) {
          displayMistake = { ...mistake, isResolved: true };
        }

        const aiError =
          fetcher.data &&
          !fetcher.data.ok &&
          activeMistakeId === mistake.id &&
          activeIntent === "ai_mistake_summary"
            ? fetcher.data.error
            : null;

        return (
          <MistakeCard
            key={mistake.id}
            mistake={displayMistake}
            onResolve={handleResolve}
            onGenerateSummary={handleGenerateSummary}
            isResolving={
              activeMistakeId === mistake.id && activeIntent === "resolve_mistake"
            }
            isGeneratingSummary={
              activeMistakeId === mistake.id && activeIntent === "ai_mistake_summary"
            }
            aiError={aiError}
          />
        );
      })}
    </div>
  );
}
