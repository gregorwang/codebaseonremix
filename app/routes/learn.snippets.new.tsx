import { data, redirect } from "react-router";
import { SnippetForm } from "~/components/learn/snippet/SnippetForm";
import { isAbilityTag } from "~/lib/learn/abilityTags";
import type { AbilityTag } from "~/lib/learn/abilityTags";
import { createSnippet } from "~/lib/server/learn/snippets.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.snippets.new";

function parseAbilityTags(formData: FormData): AbilityTag[] {
  const tags: AbilityTag[] = [];
  for (const value of formData.getAll("abilityTags")) {
    const tag = String(value);
    if (isAbilityTag(tag)) tags.push(tag);
  }
  return tags;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { headers: cookieHeaders } = ensureLearnUser(request);

  return data(
    { remixBrowserAvailable: import.meta.env.DEV },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    throw data("Method not allowed", { status: 405 });
  }

  const db = context.cloudflare.env.DB;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const responseHeaders = cookieHeaders
    ? { headers: mergeHeaders(null, cookieHeaders) }
    : undefined;

  if (intent !== "create_snippet") {
    throw data({ ok: false, error: "Unknown intent" }, { status: 400 });
  }

  const title = String(formData.get("title") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!title || !code) {
    throw data({ ok: false, error: "标题和代码不能为空" }, { status: 400 });
  }

  const snippet = await createSnippet(db, {
    userId,
    title,
    code,
    sourceFilePath: String(formData.get("sourceFilePath") ?? "").trim() || undefined,
    projectContext: String(formData.get("projectContext") ?? "").trim() || undefined,
    userConfusion: String(formData.get("userConfusion") ?? "").trim() || undefined,
    abilityTags: parseAbilityTags(formData),
  });

  return redirect(`/learn/snippets/${snippet.id}`, responseHeaders);
}

export default function SnippetNewPage({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold">新建代码片段</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        从本地 remix 副本选取文件，或手动粘贴代码与背景说明。
      </p>
      <div className="mt-6 max-w-3xl">
        <SnippetForm remixBrowserAvailable={loaderData.remixBrowserAvailable} />
      </div>
    </div>
  );
}
