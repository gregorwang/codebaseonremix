import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { LearnHeader } from "./LearnHeader";
import { LearnSidebar } from "./LearnSidebar";

type LearnShellProps = {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; to?: string }[];
  isAdmin?: boolean;
};

const SIDEBAR_COLLAPSE_KEY = "learn:sidebar-collapsed";

/** 沉浸式全宽页面(做题/讲解页): 去掉 max-width 居中, 让源码/题目铺满左右。 */
function isImmersivePath(pathname: string): boolean {
  return /^\/learn\/courses\/[^/]+\/lessons\/[^/]+/.test(pathname);
}

export function LearnShell({
  children,
  title,
  breadcrumbs,
  isAdmin,
}: LearnShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // 移动端抽屉
  const [collapsed, setCollapsed] = useState(false); // 桌面端收起
  const location = useLocation();

  // 读取持久化的桌面收起偏好(放 effect 里避免 SSR 水合不一致)。
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const immersive = isImmersivePath(location.pathname);
  const mainClass = immersive
    ? "w-full flex-1 px-3 py-5 sm:px-5 lg:px-6"
    : "mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-10 xl:max-w-6xl";

  return (
    <div className="flex min-h-screen text-[var(--fg-primary)]">
      {/* 键盘可见的 skip link: 默认 .sr-only, focus 时浮出。键盘用户每次进页
          不必再 Tab 穿过整条侧边栏才能到主区。链接到下面 <main> 的 id。 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-[var(--color-brand-500)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        跳到主内容
      </a>

      <LearnSidebar
        isAdmin={isAdmin}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="关闭导航"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <LearnHeader
          title={title}
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setSidebarOpen(true)}
          sidebarCollapsed={collapsed}
          onToggleSidebar={toggleCollapsed}
        />
        <main id="main-content" tabIndex={-1} className={mainClass}>
          {children}
        </main>
      </div>
    </div>
  );
}
