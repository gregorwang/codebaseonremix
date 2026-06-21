type ThemeListener = () => void;

let isDark = false;
let observer: MutationObserver | null = null;
const listeners = new Set<ThemeListener>();

function readTheme(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function ensureObserver() {
  if (typeof document === "undefined" || observer) return;
  isDark = readTheme();
  observer = new MutationObserver(() => {
    const next = readTheme();
    if (next === isDark) return;
    isDark = next;
    notify();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

export function getLearnTheme(): boolean {
  if (typeof document !== "undefined") {
    isDark = readTheme();
  }
  return isDark;
}

export function subscribeLearnTheme(listener: ThemeListener): () => void {
  ensureObserver();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLearnTheme(dark: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("learn-theme", dark ? "dark" : "light");
  isDark = dark;
  notify();
}

export function initLearnThemeFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("learn-theme");
  let prefersDark = false;
  if (stored === "dark") prefersDark = true;
  else if (stored === "light") prefersDark = false;
  else prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setLearnTheme(prefersDark);
  return prefersDark;
}
