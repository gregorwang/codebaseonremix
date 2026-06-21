import { useEffect, useState } from "react";

/**
 * 本地折叠状态 hook。SSR 阶段返回 defaultCollapsed (避免水合不一致),
 * 挂载后从 localStorage 读取真值; 用户点折叠/展开会同步写回。
 *
 * 用 lessonSlug + 卡片标识做 key, 这样不同 lesson 间互不影响,
 * 同一 lesson 内的两个卡片折叠状态独立。
 */
export function usePersistedCollapsed(
  storageKey: string,
  defaultCollapsed = false,
): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsedState] = useState<boolean>(defaultCollapsed);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "1") setCollapsedState(true);
      else if (raw === "0") setCollapsedState(false);
    } catch {
      // localStorage 在某些隐私模式 / iframe 里会抛, 忽略即可
    }
  }, [storageKey]);

  function setCollapsed(next: boolean) {
    setCollapsedState(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      // 同上
    }
  }

  return [collapsed, setCollapsed];
}
