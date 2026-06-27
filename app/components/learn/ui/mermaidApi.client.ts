/**
 * mermaid 库的真正加载入口。文件名带 `.client.` —— cloudflare-vite-plugin 会把这种
 * 文件在 SSR 构建里替换成 stub (导出全是 undefined), 所以 `mermaid` 整包及其几 MB 的
 * 依赖 (elkjs / dagre / katex / wardley 等) 都不会跟进 build/server/assets/, 也就不会被
 * wrangler 当作 worker 附属模块上传。
 *
 * 调用方 (MermaidDiagram.tsx) 在浏览器 useEffect 里 `import("./mermaidApi.client")` 拿到
 * `loadMermaid` 再调; SSR 不进 useEffect, 永远碰不到这个 stub, 不会在服务端炸。
 */
type MermaidLib = typeof import("mermaid")["default"];

let mermaidPromise: Promise<MermaidLib> | null = null;

export function detectTheme(): "default" | "dark" {
  if (typeof document === "undefined") return "default";
  return document.documentElement.classList.contains("dark") ? "dark" : "default";
}

export async function loadMermaid(): Promise<MermaidLib> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        // securityLevel: "strict" 会过滤 HTML 标签, 防止 AI 输出里夹 <script> 之类。
        securityLevel: "strict",
        // 默认情况下 mermaid.render 解析失败时会往 <body> 追加一张「炸弹」错误 SVG,
        // 飘在页面最下方。我们自己有 fallback 卡片 (展开看源码), 不需要它那张图,
        // 所以关掉, 避免页面底部出现孤立的 "Syntax error in text" 炸弹。
        suppressErrorRendering: true,
        theme: detectTheme(),
        fontFamily: "inherit",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}
