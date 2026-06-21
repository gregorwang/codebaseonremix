const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

export function assertSafeRemixPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) {
    throw new Error("Invalid path");
  }
  if (normalized.split("/").some((segment) => segment === "..")) {
    throw new Error("Path traversal is not allowed");
  }
  const ext = normalized.slice(normalized.lastIndexOf(".")).toLowerCase();
  if (!SOURCE_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type: ${ext || "(none)"}`);
  }
  return normalized;
}

export function isSourceExtension(ext: string): boolean {
  return SOURCE_EXTENSIONS.has(ext.toLowerCase());
}
