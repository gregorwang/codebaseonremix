import { Form } from "react-router";
import {
  ABILITY_TAGS,
  ABILITY_TAG_LABELS,
} from "~/lib/learn/abilityTags";
import type { CodeSnippet } from "~/lib/learn/types";
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

type AiGenerateFormProps = {
  snippets: CodeSnippet[];
  error?: string;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--fg-primary)] shadow-sm transition-colors focus:border-[var(--accent-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-fg)]/20";

const checkboxClass =
  "flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-sunken)] has-[:checked]:border-[var(--accent-fg)] has-[:checked]:bg-[var(--accent-soft)] has-[:checked]:text-[var(--accent-fg)]";

const sectionClass = "studio-card p-5";

export function AiGenerateForm({ snippets, error }: AiGenerateFormProps) {
  return (
    <Form method="post" className="max-w-3xl space-y-4">
      <input type="hidden" name="intent" value="generate" />

      {error && (
        <p className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger-fg)]">
          {error}
        </p>
      )}

      <section className={sectionClass}>
        <h3 className="text-sm font-semibold tracking-tight text-[var(--fg-primary)]">
          来源
        </h3>
        {snippets.length > 0 && (
          <div className="mt-3">
            <label
              htmlFor="snippetId"
              className="block text-sm font-medium text-[var(--fg-primary)]"
            >
              从代码片段预填（可选）
            </label>
            <select
              id="snippetId"
              name="snippetId"
              className={inputClass}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const snippet = snippets.find((s) => s.id === id);
                if (!snippet) return;
                const title = document.getElementById(
                  "sourceTitle",
                ) as HTMLInputElement;
                const path = document.getElementById(
                  "sourceFilePath",
                ) as HTMLInputElement;
                const code = document.getElementById(
                  "sourceCode",
                ) as HTMLTextAreaElement;
                const ctx = document.getElementById(
                  "projectContext",
                ) as HTMLTextAreaElement;
                if (title) title.value = snippet.title;
                if (path) path.value = snippet.sourceFilePath ?? "";
                if (code) code.value = snippet.code;
                if (ctx) ctx.value = snippet.projectContext ?? "";
              }}
            >
              <option value="">手动输入</option>
              {snippets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-3">
          <label
            htmlFor="sourceTitle"
            className="block text-sm font-medium text-[var(--fg-primary)]"
          >
            来源标题 <span className="text-rose-500">*</span>
          </label>
          <input
            id="sourceTitle"
            name="sourceTitle"
            required
            className={inputClass}
          />
        </div>

        <div className="mt-3">
          <label
            htmlFor="sourceFilePath"
            className="block text-sm font-medium text-[var(--fg-primary)]"
          >
            来源文件路径
          </label>
          <input
            id="sourceFilePath"
            name="sourceFilePath"
            className={`${inputClass} font-mono`}
          />
        </div>

        <div className="mt-3">
          <label
            htmlFor="sourceCode"
            className="block text-sm font-medium text-[var(--fg-primary)]"
          >
            代码 <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="sourceCode"
            name="sourceCode"
            required
            rows={14}
            className={`${inputClass} font-mono bg-[var(--code-bg)] text-[var(--code-fg)]`}
          />
        </div>

        <div className="mt-3">
          <label
            htmlFor="projectContext"
            className="block text-sm font-medium text-[var(--fg-primary)]"
          >
            项目背景
          </label>
          <textarea
            id="projectContext"
            name="projectContext"
            rows={3}
            className={inputClass}
          />
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="text-sm font-semibold tracking-tight text-[var(--fg-primary)]">
          能力标签
        </h3>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {ABILITY_TAGS.map((tag) => (
            <label key={tag} className={checkboxClass}>
              <input
                type="checkbox"
                name="targetAbilities"
                value={tag}
                defaultChecked={tag.startsWith("bridge.")}
                className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--accent-fg)] focus:ring-2 focus:ring-[var(--accent-fg)]/30"
              />
              {ABILITY_TAG_LABELS[tag]}
            </label>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="text-sm font-semibold tracking-tight text-[var(--fg-primary)]">
          题型
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ALL_QUESTION_TYPES.map(({ value, label }) => (
            <label key={value} className={checkboxClass}>
              <input
                type="checkbox"
                name="preferredQuestionTypes"
                value={value}
                defaultChecked={DEFAULT_QUESTION_TYPES.includes(value)}
                className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--accent-fg)] focus:ring-2 focus:ring-[var(--accent-fg)]/30"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="text-sm font-semibold tracking-tight text-[var(--fg-primary)]">
          生成参数
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
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

        <div className="mt-3">
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
      </section>

      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-500)] to-[var(--color-accent-600)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
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
        生成并保存草稿
      </button>
    </Form>
  );
}
