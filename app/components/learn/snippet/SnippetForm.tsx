import { Form } from "react-router";
import {
  ABILITY_TAGS,
  ABILITY_TAG_LABELS,
  type AbilityTag,
} from "~/lib/learn/abilityTags";
import { RemixFileBrowser } from "./RemixFileBrowser";

type SnippetFormProps = {
  remixBrowserAvailable: boolean;
  defaultValues?: {
    title?: string;
    sourceFilePath?: string;
    code?: string;
    projectContext?: string;
    userConfusion?: string;
    abilityTags?: AbilityTag[];
  };
};

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--fg-primary)] shadow-sm transition-colors focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20";

const textareaClass = inputClass;

export function SnippetForm({
  remixBrowserAvailable,
  defaultValues,
}: SnippetFormProps) {
  const selectedTags = new Set(defaultValues?.abilityTags ?? []);

  return (
    <Form method="post" className="space-y-5">
      <input type="hidden" name="intent" value="create_snippet" />

      {remixBrowserAvailable && (
        <RemixFileBrowser
          onSelect={(path, content) => {
            const pathInput = document.getElementById(
              "sourceFilePath",
            ) as HTMLInputElement | null;
            const codeInput = document.getElementById(
              "code",
            ) as HTMLTextAreaElement | null;
            const titleInput = document.getElementById(
              "title",
            ) as HTMLInputElement | null;
            if (pathInput) pathInput.value = path;
            if (codeInput) codeInput.value = content;
            if (titleInput && !titleInput.value) {
              const base = path.split("/").pop() ?? path;
              titleInput.value = base.replace(/\.(tsx?|jsx?)$/, "");
            }
          }}
        />
      )}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-[var(--fg-primary)]"
        >
          标题 <span className="text-rose-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="sourceFilePath"
          className="block text-sm font-medium text-[var(--fg-primary)]"
        >
          来源文件路径
        </label>
        <input
          id="sourceFilePath"
          name="sourceFilePath"
          defaultValue={defaultValues?.sourceFilePath}
          placeholder="app/routes/api.nemesis.ts"
          className={`${inputClass} font-mono`}
        />
      </div>

      <div>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-[var(--fg-primary)]"
        >
          代码内容 <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="code"
          name="code"
          required
          rows={16}
          defaultValue={defaultValues?.code}
          className={`${textareaClass} font-mono bg-[var(--code-bg)] text-[var(--code-fg)]`}
        />
      </div>

      <div>
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
          defaultValue={defaultValues?.projectContext}
          placeholder="这段代码在个人网站里负责什么？"
          className={textareaClass}
        />
      </div>

      <div>
        <label
          htmlFor="userConfusion"
          className="block text-sm font-medium text-[var(--fg-primary)]"
        >
          我的困惑
        </label>
        <textarea
          id="userConfusion"
          name="userConfusion"
          rows={3}
          defaultValue={defaultValues?.userConfusion}
          placeholder="我看不懂或不确定的地方…"
          className={textareaClass}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-[var(--fg-primary)]">
          关联能力标签
        </legend>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {ABILITY_TAGS.map((tag) => (
            <label
              key={tag}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-sunken)] has-[:checked]:border-[var(--color-brand-500)] has-[:checked]:bg-[var(--brand-soft)] has-[:checked]:text-[var(--brand-fg-strong)]"
            >
              <input
                type="checkbox"
                name="abilityTags"
                value={tag}
                defaultChecked={selectedTags.has(tag)}
                className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-500)]/30"
              />
              {ABILITY_TAG_LABELS[tag]}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
      >
        保存片段
      </button>
    </Form>
  );
}
