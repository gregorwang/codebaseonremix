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
