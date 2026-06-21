import { Link } from "react-router";
import { data } from "react-router";
import { CodeAssetCard } from "~/components/learn/snippet/CodeAssetCard";
import { SnippetCard } from "~/components/learn/snippet/SnippetCard";
import {
  getSnippetDraftCounts,
  getSnippetsByUser,
} from "~/lib/server/learn/snippets.server";
import { listPublishedCodeAssets } from "~/lib/server/project-curriculum/codeAssetExtractor.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.snippets._index";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);

  const [snippets, draftCounts, projectAssets] = await Promise.all([
    getSnippetsByUser(db, userId),
    getSnippetDraftCounts(db, userId),
    listPublishedCodeAssets(db),
  ]);

  return data(
    { snippets, draftCounts, projectAssets },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

export default function SnippetsIndexPage({ loaderData }: Route.ComponentProps) {
  const { snippets, draftCounts, projectAssets } = loaderData;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative pl-4">
          <span
            aria-hidden
            className="absolute left-0 top-1.5 h-7 w-1 rounded-full bg-gradient-to-b from-[var(--color-brand-400)] via-[var(--color-brand-500)] to-[var(--color-accent-500)]"
          />
          <h2 className="text-2xl font-bold tracking-tight text-[var(--fg-primary)] sm:text-3xl">
            项目代码资产库
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
            浏览从个人网站源码抽取的代码资产，或保存自己的片段供 AI 出题。
          </p>
        </div>
        <Link
          to="/learn/snippets/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建我的片段
        </Link>
      </div>

      <section className="mt-8">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
          项目代码资产
        </h3>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          由管理员扫描 remix 源码并审核发布后可见。
        </p>
        {projectAssets.length === 0 ? (
          <p className="mt-4 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-6 text-center text-sm text-[var(--fg-soft)]">
            暂无已发布的项目代码资产
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {projectAssets.map((asset) => (
              <CodeAssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
          我的片段
        </h3>
        {snippets.length === 0 ? (
          <div className="mt-4 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-10 text-center">
            <p className="text-[var(--fg-muted)]">还没有保存的代码片段</p>
            <Link
              to="/learn/snippets/new"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-fg)] hover:underline"
            >
              从 remix 项目选取或粘贴代码 →
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {snippets.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                draftCount={draftCounts[snippet.id] ?? 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
