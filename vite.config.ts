import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { remixAssetsDevPlugin } from "./scripts/vite-remix-assets-plugin";

export default defineConfig(({ command }) => ({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    ...(command === "serve" ? [remixAssetsDevPlugin()] : []),
  ],
  build: {
    rollupOptions: {
      output: {
        // 把 mermaid / shiki 拆到独立 vendor chunk: 两者都是几百 KB 级、只在
        // "AI 思维导图"和"代码块高亮"才会被实际 import (CodeBlock 已经做了
        // dynamic import('./shikiHighlight.client'), MermaidDiagram 同理)。
        // 拆开后浏览器只在真正用到这俩功能的页面才下载, 普通学习者首屏不背这份税。
        //
        // 注: Vite SSR build 仍会按"动态可达"emit 一份 mermaid chunk 到
        // build/server/assets/, wrangler deploy 会把它当作 worker 附属模块上传;
        // 想从 worker 体积里彻底去掉这份, 需要做 client-only 切分 (MermaidDiagram
        // 拆成 wrapper + mermaid-renderer.client, 后者用 useEffect 内动态 import),
        // 而不是 ssr.external —— Cloudflare Vite 插件不允许 Worker 环境配 external。
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (/[\\/]mermaid[\\/]/.test(id)) return "vendor-mermaid";
            if (/[\\/]shiki[\\/]/.test(id)) return "vendor-shiki";
          }
        },
      },
    },
  },
}));
