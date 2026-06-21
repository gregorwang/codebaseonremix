import { createHighlighter, type Highlighter } from "shiki";

const MAX_CACHE_SIZE = 100;

let highlighterPromise: Promise<Highlighter> | null = null;
const highlightCache = new Map<string, string>();
const cacheOrder: string[] = [];

function cacheKey(code: string, language: string, isDark: boolean): string {
  return `${language}:${isDark ? "dark" : "light"}:${code}`;
}

function rememberCache(key: string, html: string): string {
  if (highlightCache.has(key)) {
    return highlightCache.get(key)!;
  }

  highlightCache.set(key, html);
  cacheOrder.push(key);

  while (cacheOrder.length > MAX_CACHE_SIZE) {
    const oldest = cacheOrder.shift();
    if (oldest) highlightCache.delete(oldest);
  }

  return html;
}

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["tsx", "typescript", "javascript", "sql", "json", "bash", "css"],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  language: string,
  isDark: boolean,
): Promise<string> {
  const key = cacheKey(code, language, isDark);
  const cached = highlightCache.get(key);
  if (cached) return cached;

  const highlighter = await getHighlighter();
  const loadedLangs = highlighter.getLoadedLanguages();
  const lang = loadedLangs.includes(language as never)
    ? language
    : loadedLangs.includes("typescript" as never)
      ? "typescript"
      : "txt";

  const html = highlighter.codeToHtml(code, {
    lang: lang as "typescript",
    theme: isDark ? "github-dark" : "github-light",
  });

  return rememberCache(key, html);
}

export function clearHighlightCache(): void {
  highlightCache.clear();
  cacheOrder.length = 0;
}

/**
 * 把整段代码高亮后, 按源码行拆成"每行一个 HTML 串"(每个是 shiki 的 `<span class="line">…</span>`)。
 * 供需要逐行渲染(行间插注释行)的视图使用。整段一次性高亮, 保留跨行上下文(模板字符串等)。
 */
export async function highlightToLines(
  code: string,
  language: string,
  isDark: boolean,
): Promise<string[]> {
  const html = await highlightCode(code, language, isDark);
  // 浏览器端解析 shiki 输出, 取出每个 .line 的 outerHTML。
  if (typeof DOMParser === "undefined") {
    return code.split("\n");
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lineEls = doc.querySelectorAll("code .line");
  if (lineEls.length === 0) return code.split("\n");
  return Array.from(lineEls).map((el) => el.outerHTML);
}
