export function inferCodeLanguage(filePath?: string, code?: string): string {
  if (filePath) {
    if (filePath.endsWith(".tsx")) return "tsx";
    if (filePath.endsWith(".ts")) return "typescript";
    if (filePath.endsWith(".jsx")) return "jsx";
    if (filePath.endsWith(".js")) return "javascript";
    if (filePath.endsWith(".sql")) return "sql";
    if (filePath.endsWith(".json")) return "json";
    if (filePath.endsWith(".css")) return "css";
    if (filePath.endsWith(".md")) return "markdown";
  }
  if (code?.includes("export const loader") || code?.includes("useLoaderData")) {
    return "tsx";
  }
  if (code?.includes("CREATE TABLE")) return "sql";
  return "typescript";
}
