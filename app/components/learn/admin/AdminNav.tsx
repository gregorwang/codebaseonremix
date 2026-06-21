import { Link, useLocation } from "react-router";

const tabs = [
  { to: "/learn/admin/ai-generate", label: "AI 出题" },
  { to: "/learn/admin/drafts", label: "题目草稿" },
  { to: "/learn/admin/questions", label: "题库管理" },
];

export function AdminNav() {
  const location = useLocation();

  return (
    <nav className="mb-6 flex flex-wrap gap-1.5 border-b border-[var(--border-subtle)] pb-4">
      {tabs.map((tab) => {
        const active =
          location.pathname === tab.to ||
          location.pathname.startsWith(tab.to + "/");
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent-fg)] ring-1 ring-inset ring-[var(--accent-fg)]/30"
                : "text-[var(--fg-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--fg-primary)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
