import { useEffect, useState } from "react";

type RemixFileBrowserProps = {
  onSelect: (path: string, content: string) => void;
};

type ListResponse = { files: string[] };
type ReadResponse = { path: string; content: string };
type ErrorResponse = { error: string };

export function RemixFileBrowser({ onSelect }: RemixFileBrowserProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [readingPath, setReadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/__remix-assets/list?dir=app");
        if (!res.ok) {
          const body = (await res.json()) as ErrorResponse;
          throw new Error(body.error ?? "无法加载 remix 文件列表");
        }
        const body = (await res.json()) as ListResponse;
        if (!cancelled) setFiles(body.files);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = files.filter((f) =>
    f.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  async function handleSelect(path: string) {
    setReadingPath(path);
    setError(null);
    try {
      const res = await fetch(
        `/__remix-assets/read?path=${encodeURIComponent(path)}`,
      );
      if (!res.ok) {
        const body = (await res.json()) as ErrorResponse;
        throw new Error(body.error ?? "无法读取文件");
      }
      const body = (await res.json()) as ReadResponse;
      onSelect(body.path, body.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取失败");
    } finally {
      setReadingPath(null);
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4">
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight text-[var(--fg-primary)]">
        <svg
          className="h-4 w-4 text-[var(--brand-fg)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7h6l2 2h10v10H3z" />
        </svg>
        从 remix 项目选取（仅本地 dev）
      </p>
      <p className="mt-1 text-xs text-[var(--fg-soft)]">
        只读浏览根目录 remix/ 下的源码，不会修改原项目。
      </p>

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="筛选文件路径…"
        className="mt-3 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
      />

      {error && (
        <p className="mt-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          {error}
        </p>
      )}

      <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        {loading ? (
          <p className="p-3 text-sm text-[var(--fg-soft)]">加载文件列表…</p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-sm text-[var(--fg-soft)]">没有匹配的文件</p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {filtered.slice(0, 80).map((file) => (
              <li key={file}>
                <button
                  type="button"
                  onClick={() => void handleSelect(file)}
                  disabled={readingPath !== null}
                  className="w-full px-3 py-2 text-left font-mono text-xs text-[var(--fg-muted)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand-fg)] disabled:opacity-50"
                >
                  {readingPath === file ? "读取中…" : file}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {filtered.length > 80 && (
        <p className="mt-1 text-xs text-[var(--fg-soft)]">
          仅显示前 80 条，请用筛选缩小范围。
        </p>
      )}
    </div>
  );
}
