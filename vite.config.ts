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
}));
