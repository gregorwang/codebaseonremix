import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-[var(--surface-base)] text-[var(--fg-primary)] antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// Root-level error boundary. This is the LAST line of defence — it catches
// anything that escapes the /learn boundary or fires before that boundary
// has even mounted (e.g. a thrown loader at the root layout). Because we
// can't trust that user data has been loaded, this page is fully
// self-contained: it doesn't import LearnShell, doesn't read any context,
// and works in both light and dark themes via CSS variables.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let status: number | null = null;
  let title = "出错了";
  let detail = "学习中心遇到了一个未知错误。";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) {
      title = "页面不存在";
      detail = "你访问的页面找不到了，可能链接已经过期或被移除。";
    } else {
      title = `${status} ${error.statusText || ""}`.trim();
      detail = (() => {
        const data = error.data as unknown;
        if (typeof data === "string" && data.trim().length > 0) return data;
        if (data && typeof data === "object" && "message" in data) {
          const m = (data as { message?: unknown }).message;
          if (typeof m === "string") return m;
        }
        return error.statusText || "请求处理失败，可以稍后再试。";
      })();
    }
  } else if (error instanceof Error) {
    detail = error.message || detail;
    if (import.meta.env.DEV) stack = error.stack;
  }

  const is404 = status === 404;

  return (
    <main
      role="alert"
      className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12"
    >
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              is404
                ? "bg-[var(--accent-soft)] text-[var(--accent-fg)]"
                : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
            }`}
          >
            {is404 ? (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-5-5" />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.29 3.86l-7.4 12.78A2 2 0 0 0 4.62 20h14.76a2 2 0 0 0 1.73-3.36L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">
              Code Coach
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--fg-primary)]">
              {title}
            </h1>
            <p className="mt-3 leading-relaxed text-[var(--fg-muted)]">
              {detail}
            </p>
            {!is404 && (
              <p className="mt-2 text-sm text-[var(--fg-soft)]">
                这一步出错通常是临时的，刷新一次或返回学习中心多半就能继续。
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/learn"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]/40"
          >
            <svg
              aria-hidden
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12l9-9 9 9" />
              <path d="M9 21V12h6v9" />
            </svg>
            返回学习中心
          </Link>
          {!is404 && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft-brand)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]/40"
            >
              <svg
                aria-hidden
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 4v5h-5" />
              </svg>
              刷新重试
            </button>
          )}
        </div>

        {stack && (
          <details className="mt-6 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 text-xs">
            <summary className="cursor-pointer select-none text-[var(--fg-soft)]">
              开发者堆栈（仅本地可见）
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-[var(--fg-muted)]">
              {stack}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}
