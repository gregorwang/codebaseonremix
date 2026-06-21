import { useEffect, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import {
  ABILITY_TAGS,
  ABILITY_TAG_LABELS,
} from "~/lib/learn/abilityTags";
import type { QuestionType } from "~/lib/learn/types";

const DEFAULT_QUESTION_TYPES: QuestionType[] = [
  "single_choice",
  "sort",
  "debug",
  "branch_trace",
];

const ALL_QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "single_choice", label: "单选" },
  { value: "multi_choice", label: "多选" },
  { value: "sort", label: "排序" },
  { value: "fill_blank", label: "填空" },
  { value: "debug", label: "找错" },
  { value: "branch_trace", label: "分支追踪" },
  { value: "position_judgement", label: "位置判断" },
];

type GenerateDraftActionData =
  | {
      ok: true;
      draftId: string;
    }
  | {
      ok: false;
      error: string;
      code?: "rate_limited" | "not_configured" | "ai_failed" | "forbidden";
    };

type GenerateDraftPanelProps = {
  snippetId: string;
};

const checkboxClass =
  "flex cursor-pointer items-center gap-2 rounded-lg border border-violet-200/60 bg-white/60 px-3 py-2 text-sm text-[var(--fg-muted)] transition-colors hover:bg-violet-100/40 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-500/15 has-[:checked]:text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/5 dark:has-[:checked]:text-violet-200";

const inputClass =
  "mt-1 w-full rounded-lg border border-violet-200/60 bg-white/60 px-3 py-2 text-sm shadow-sm transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-violet-500/30 dark:bg-violet-500/5";

export function GenerateDraftPanel({ snippetId }: GenerateDraftPanelProps) {
  const fetcher = useFetcher<GenerateDraftActionData>();
  const revalidator = useRevalidator();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isLoading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok) {
      setSuccessMessage(`草稿已保存（${fetcher.data.draftId}）`);
      void revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  const error = fetcher.data && !fetcher.data.ok ? fetcher.data : null;

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-card)] border border-violet-200/60 p-6 dark:border-violet-500/30">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-violet-50 to-indigo-50/60 dark:from-violet-950/30 dark:to-indigo-950/30"
      />
      <div className="relative">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-violet-900 dark:text-violet-100">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
          </svg>
          从片段生成题目草稿
        </h3>
        <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
          调用 AI Gateway 生成题目 JSON 草稿；须通过 Schema 校验后才会保存。
        </p>

        <fetcher.Form method="post" className="mt-5 space-y-4">
          <input type="hidden" name="intent" value="generate_draft" />
          <input type="hidden" name="snippetId" value={snippetId} />

          <fieldset>
            <legend className="text-sm font-medium text-[var(--fg-primary)]">
              目标能力
            </legend>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {ABILITY_TAGS.slice(0, 8).map((tag) => (
                <label key={tag} className={checkboxClass}>
                  <input
                    type="checkbox"
                    name="targetAbilities"
                    value={tag}
                    defaultChecked={
                      tag.startsWith("bridge.") || tag.startsWith("backend.")
                    }
                    className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-2 focus:ring-violet-500/30"
                  />
                  {ABILITY_TAG_LABELS[tag]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-[var(--fg-primary)]">
              偏好题型
            </legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_QUESTION_TYPES.map(({ value, label }) => (
                <label
                  key={value}
                  className={`${checkboxClass} flex-row gap-1.5`}
                >
                  <input
                    type="checkbox"
                    name="preferredQuestionTypes"
                    value={value}
                    defaultChecked={DEFAULT_QUESTION_TYPES.includes(value)}
                    className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-2 focus:ring-violet-500/30"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="difficulty"
                className="block text-sm font-medium text-[var(--fg-primary)]"
              >
                难度
              </label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue="intermediate"
                className={inputClass}
              >
                <option value="beginner">入门</option>
                <option value="intermediate">中级</option>
                <option value="advanced">进阶</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="desiredQuestionCount"
                className="block text-sm font-medium text-[var(--fg-primary)]"
              >
                题目数量
              </label>
              <input
                id="desiredQuestionCount"
                name="desiredQuestionCount"
                type="number"
                min={1}
                max={8}
                defaultValue={3}
                className={`${inputClass} tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="generationGoal"
              className="block text-sm font-medium text-[var(--fg-primary)]"
            >
              生成目标
            </label>
            <textarea
              id="generationGoal"
              name="generationGoal"
              rows={2}
              defaultValue="围绕真实项目代码因果链，训练读懂状态流与后端守门。"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
            </svg>
            {isLoading ? "生成中…" : "生成题目草稿"}
          </button>
        </fetcher.Form>

        {error && (
          <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            {error.error}
          </p>
        )}

        {successMessage && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l5 5 9-11" />
            </svg>
            {successMessage}
          </p>
        )}
      </div>
    </section>
  );
}
