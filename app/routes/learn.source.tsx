import { data } from "react-router";
import { getSourceFileContent } from "~/lib/server/project-curriculum/projectScanner.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.source";

/**
 * 只读资源路由: 返回被扫描源码文件的完整内容, 供做题/讲解页的源码阅读器拉取。
 * 内容在扫描阶段已过 validateAiSecurityContent 过滤(含密文件不入库), 这里无需额外脱敏。
 * GET /learn/source?path=app/utils/cloudflare-env.server.ts
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const { DB: db } = context.cloudflare.env;
  const { headers: cookieHeaders } = ensureLearnUser(request);
  const responseInit = cookieHeaders
    ? { headers: mergeHeaders(null, cookieHeaders) }
    : undefined;

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) {
    return data({ ok: false as const, error: "Missing path" }, responseInit);
  }

  const file = await getSourceFileContent(db, path);
  if (!file) {
    return data(
      { ok: false as const, error: "该文件未收录源码" },
      responseInit,
    );
  }

  return data(
    {
      ok: true as const,
      path: file.path,
      code: file.code,
      language: file.language,
      lineCount: file.lineCount,
    },
    responseInit,
  );
}
