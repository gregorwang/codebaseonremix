import { Outlet, data } from "react-router";
import { AdminNav } from "~/components/learn/admin/AdminNav";
import { mergeHeaders } from "~/lib/server/learn/user.server";
import { requireAdmin } from "~/lib/server/learn/requireAdmin.server";
import type { Route } from "./+types/learn.admin";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { userId, headers } = requireAdmin(request, env);
  return data(
    { userId },
    headers ? { headers: mergeHeaders(null, headers) } : undefined,
  );
}

export default function AdminLayout() {
  return (
    <div>
      <h2 className="text-2xl font-bold">管理后台</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        AI 出题草稿生成、审核与发布
      </p>
      <div className="mt-4">
        <AdminNav />
        <Outlet />
      </div>
    </div>
  );
}
