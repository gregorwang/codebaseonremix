import path from "node:path";
import baseConfig, { type CodeCoachConfig } from "../../../../code-coach.config";

export type { CodeCoachConfig };

export function getCodeCoachConfig(): CodeCoachConfig {
  return baseConfig;
}

export function resolveProjectRoot(repoRoot: string): string {
  const cfg = getCodeCoachConfig();
  return path.resolve(repoRoot, cfg.projectSourceDir);
}
