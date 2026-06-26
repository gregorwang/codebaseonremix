import { Link, useLocation } from "react-router";
import type { ReactNode } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

const iconClass = "h-4 w-4 shrink-0";
const stroke = {
  className: iconClass,
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

const icons = {
  compass: (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  ),
  books: (
    <svg {...stroke}>
      <path d="M4 5a2 2 0 0 1 2-2h3v18H6a2 2 0 0 1-2-2z" />
      <path d="M9 3h5l1.5 18H9z" />
      <path d="M16 5l3 .5-2 16-3-.5z" />
    </svg>
  ),
  list: (
    <svg {...stroke}>
      <circle cx="6" cy="6" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="6" cy="18" r="1.5" />
      <path d="M11 6h9M11 12h9M11 18h6" />
    </svg>
  ),
  network: (
    <svg {...stroke}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M12 7v3M12 10l-5 6M12 10l5 6" />
    </svg>
  ),
  badge: (
    <svg {...stroke}>
      <path d="M12 3l8 4v5c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V7z" />
      <path d="M9.5 12.5l2 2 3.5-4" />
    </svg>
  ),
  file: (
    <svg {...stroke}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  ),
  user: (
    <svg {...stroke}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  ),
  sparkle: (
    <svg {...stroke}>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
      <path d="M19 4l.7 1.6L21 6l-1.3.4L19 8l-.7-1.6L17 6l1.3-.4z" />
    </svg>
  ),
  inbox: (
    <svg {...stroke}>
      <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 13h4l1 2h6l1-2h4" />
    </svg>
  ),
  database: (
    <svg {...stroke}>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </svg>
  ),
};

type Group = {
  label: string;
  items: NavItem[];
};

const learnerGroups: Group[] = [
  {
    label: "学习",
    items: [
      { to: "/learn", label: "学习中心", icon: icons.compass },
      { to: "/learn/courses", label: "全部课程", icon: icons.books },
    ],
  },
  {
    label: "成长",
    items: [
      { to: "/learn/review", label: "错题本", icon: icons.list },
      { to: "/learn/ability-map", label: "能力树", icon: icons.network },
      { to: "/learn/exams", label: "阶段考试", icon: icons.badge },
    ],
  },
  {
    label: "工具",
    items: [
      { to: "/learn/snippets", label: "项目代码资产", icon: icons.file },
      { to: "/learn/account", label: "跨设备同步", icon: icons.user },
    ],
  },
];

const adminItems: NavItem[] = [
  { to: "/learn/admin/ai-generate", label: "AI 出题", icon: icons.sparkle },
  { to: "/learn/admin/drafts", label: "草稿审核", icon: icons.inbox },
  { to: "/learn/admin/questions", label: "题库管理", icon: icons.database },
];

type LearnSidebarProps = {
  isAdmin?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** 桌面端收起: 直接从 lg+ 布局移除, 让主区铺满。移动端不受影响(始终走抽屉)。 */
  collapsed?: boolean;
};

export function LearnSidebar({
  isAdmin,
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
}: LearnSidebarProps) {
  const location = useLocation();

  function isActive(to: string) {
    if (to === "/learn") {
      return location.pathname === "/learn";
    }
    return location.pathname === to || location.pathname.startsWith(to + "/");
  }

  const panelClass = [
    "z-50 flex h-full w-[80vw] max-w-64 shrink-0 flex-col gap-6 border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-5",
    "fixed inset-y-0 left-0 transition-transform duration-200 lg:static lg:translate-x-0",
    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
    collapsed ? "lg:hidden" : "",
  ].join(" ");

  return (
    <aside className={panelClass}>
      <Link
        to="/learn"
        onClick={onMobileClose}
        className="flex items-center gap-3 rounded-[var(--radius-card)] px-2 py-2 transition-colors hover:bg-[var(--brand-soft)]"
      >
        <span
          aria-hidden
          className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[var(--color-brand-500)] via-[var(--color-brand-600)] to-[var(--color-accent-500)] text-white shadow-md"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l-5 6 5 6" />
            <path d="M15 6l5 6-5 6" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block text-base font-semibold tracking-tight text-[var(--fg-primary)]">
            Code Coach
          </span>
          <span className="block text-[11px] text-[var(--fg-soft)]">
            真实项目代码训练
          </span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-5">
        {learnerGroups.map((group) => (
          <NavGroup
            key={group.label}
            group={group}
            isActive={isActive}
            onClick={onMobileClose}
          />
        ))}

        {isAdmin && (
          <div className="mt-auto border-t border-[var(--border-subtle)] pt-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-fg)]">
              管理后台
            </p>
            <ul className="space-y-1">
              {adminItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onMobileClose}
                      aria-current={active ? "page" : undefined}
                      className={navLinkClass(active, true)}
                    >
                      <span className="text-current">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}

function NavGroup({
  group,
  isActive,
  onClick,
}: {
  group: Group;
  isActive: (to: string) => boolean;
  onClick?: () => void;
}) {
  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-soft)]">
        {group.label}
      </p>
      <ul className="space-y-1">
        {group.items.map((item) => {
          const active = isActive(item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onClick}
                aria-current={active ? "page" : undefined}
                className={navLinkClass(active, false)}
              >
                <span className="text-current">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function navLinkClass(active: boolean, isAdminItem: boolean): string {
  const base =
    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors";
  if (active) {
    if (isAdminItem) {
      return `${base} bg-[var(--accent-soft)] font-medium text-[var(--accent-fg)] ring-1 ring-inset ring-[var(--accent-fg)]/30`;
    }
    return `${base} bg-[var(--brand-soft)] font-medium text-[var(--brand-fg-strong)] ring-1 ring-inset ring-[var(--border-soft-brand)]`;
  }
  return `${base} text-[var(--fg-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--fg-primary)]`;
}
