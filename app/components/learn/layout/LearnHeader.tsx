import { Link } from "react-router";
import { useEffect, useState } from "react";
import {
  initLearnThemeFromStorage,
  setLearnTheme,
  subscribeLearnTheme,
  getLearnTheme,
} from "~/lib/learn/theme.client";

type LearnHeaderProps = {
  title?: string;
  breadcrumbs?: { label: string; to?: string }[];
  onMenuClick?: () => void;
  /** 桌面端侧边栏是否已收起 */
  sidebarCollapsed?: boolean;
  /** 桌面端收起/展开侧边栏 */
  onToggleSidebar?: () => void;
};

function resolveInitialDark(): boolean {
  return initLearnThemeFromStorage();
}

export function LearnHeader({
  title,
  breadcrumbs,
  onMenuClick,
  sidebarCollapsed = false,
  onToggleSidebar,
}: LearnHeaderProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(resolveInitialDark());
    return subscribeLearnTheme(() => {
      setDark(getLearnTheme());
    });
  }, []);

  function toggleTheme() {
    setLearnTheme(!dark);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--surface-overlay)] sm:px-8 sm:py-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px studio-hairline"
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2 text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--fg-primary)] lg:hidden"
              aria-label="打开导航菜单"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2 text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--fg-primary)] lg:inline-flex"
              aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
              title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M9 4v16" />
                {sidebarCollapsed ? (
                  <path d="M13 9l3 3-3 3" />
                ) : (
                  <path d="M16 9l-3 3 3 3" />
                )}
              </svg>
            </button>
          )}
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="mb-0.5 flex flex-wrap items-center gap-1 text-xs text-[var(--fg-soft)]">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && (
                      <span aria-hidden className="text-[var(--fg-faint)]">
                        ›
                      </span>
                    )}
                    {crumb.to ? (
                      <Link
                        to={crumb.to}
                        className="transition-colors hover:text-[var(--brand-fg)]"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[var(--fg-muted)]">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            {title && (
              <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--fg-primary)] sm:text-xl">
                {title}
              </h1>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand-fg)]"
        >
          {dark ? (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
