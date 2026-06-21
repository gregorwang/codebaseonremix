export type ProjectFileKind =
  | "root"
  | "route"
  | "component"
  | "layout"
  | "server_util"
  | "auth"
  | "session"
  | "ai_gateway"
  | "database"
  | "rate_limit"
  | "theme"
  | "data"
  | "worker"
  | "config"
  | "unknown";

export function classifyFileKind(filePath: string): ProjectFileKind {
  const p = filePath.replace(/\\/g, "/").toLowerCase();

  if (p === "app/root.tsx" || p.endsWith("/root.tsx")) return "root";
  if (p.includes("wrangler") || p === "package.json" || p.includes("vite.config"))
    return "config";
  if (p.includes("/routes/") || p.startsWith("app/routes/")) return "route";
  if (p.includes("/components/")) return "component";
  if (p.includes("layout")) return "layout";
  if (p.includes("auth") || p.includes("better-auth")) return "auth";
  if (p.includes("session") || p.includes("cookie")) return "session";
  if (p.includes("nemesis") && (p.includes("gateway") || p.includes("ai")))
    return "ai_gateway";
  if (p.includes("rate-limit") || p.includes("rate_limit") || p.includes("guard"))
    return "rate_limit";
  if (p.includes("theme")) return "theme";
  if (p.includes("/migrations/") || p.includes("d1") || p.includes("database"))
    return "database";
  if (p.includes("/data/")) return "data";
  if (p.startsWith("workers/") || p.startsWith("worker/")) return "worker";
  if (
    p.includes(".server.") ||
    p.includes("/services/") ||
    p.includes("/lib/")
  ) {
    return "server_util";
  }
  return "unknown";
}

export function scoreFileImportance(
  filePath: string,
  kind: ProjectFileKind,
): number {
  const p = filePath.replace(/\\/g, "/").toLowerCase();
  let score = 0.3;

  const kindBoost: Partial<Record<ProjectFileKind, number>> = {
    root: 1,
    route: 0.7,
    auth: 0.95,
    ai_gateway: 0.95,
    rate_limit: 0.9,
    theme: 0.85,
    server_util: 0.75,
    database: 0.8,
    config: 0.5,
  };
  score = kindBoost[kind] ?? score;

  if (p.includes("loader") || p.includes("action")) score += 0.1;
  if (p.includes("api.")) score += 0.15;
  if (p.includes("chat")) score += 0.1;

  return Math.min(1, Math.round(score * 100) / 100);
}

export function languageFromPath(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  if (ext === ".tsx") return "tsx";
  if (ext === ".ts") return "ts";
  if (ext === ".jsx") return "jsx";
  if (ext === ".js") return "js";
  return "text";
}
