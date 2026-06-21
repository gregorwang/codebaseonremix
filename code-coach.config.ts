export type CodeCoachConfig = {
  projectSourceDir: string;
  ignoreDirPatterns: string[];
  ignoreFilePatterns: string[];
  includeExtensions: string[];
  allowedJsonFiles: string[];
  importantDirectories: string[];
  maxFileSizeBytes: number;
  preferredModules: string[];
  aiGenerationEnabled: boolean;
};

const config: CodeCoachConfig = {
  projectSourceDir: "remix",
  ignoreDirPatterns: [
    "node_modules",
    ".git",
    ".wrangler",
    "dist",
    "build",
    ".cache",
    "coverage",
    ".history",
    ".cursor",
    ".claude",
    "stickers",
    "public",
  ],
  ignoreFilePatterns: [
    ".env",
    ".dev.vars",
    ".pem",
    ".key",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
  ],
  includeExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  allowedJsonFiles: [
    "package.json",
    "react-router.config.ts",
    "tsconfig.json",
    "wrangler.jsonc",
  ],
  importantDirectories: [
    "app",
    "app/routes",
    "app/components",
    "app/lib",
    "app/services",
    "app/nemesis",
    "workers",
    "worker",
  ],
  maxFileSizeBytes: 200 * 1024,
  preferredModules: [
    "root.tsx",
    "auth",
    "theme",
    "nemesis",
    "rate-limit",
    "gateway",
    "loader",
    "action",
  ],
  aiGenerationEnabled: true,
};

export default config;
