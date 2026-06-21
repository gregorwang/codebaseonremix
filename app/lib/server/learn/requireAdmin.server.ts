import { data } from "react-router";
import { ensureLearnUser } from "./user.server";

function parseAdminUids(env: Env): Set<string> {
  const raw = env.LEARN_ADMIN_UIDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function isAdminUser(userId: string, env: Env): boolean {
  const allowlist = parseAdminUids(env);
  return allowlist.has(userId);
}

export function requireAdmin(request: Request, env: Env) {
  const { userId, headers } = ensureLearnUser(request);
  if (!isAdminUser(userId, env)) {
    throw data("需要管理员权限", { status: 403 });
  }
  return { userId, headers };
}
