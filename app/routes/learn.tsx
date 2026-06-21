import { Outlet, data } from "react-router";
import { LearnShell } from "~/components/learn/layout/LearnShell";
import { isAdminUser } from "~/lib/server/learn/requireAdmin.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { userId, headers } = ensureLearnUser(request);
  return data(
    { userId, isAdmin: isAdminUser(userId, env) },
    headers ? { headers } : undefined,
  );
}

export default function LearnLayout({ loaderData }: Route.ComponentProps) {
  return (
    <LearnShell isAdmin={loaderData.isAdmin}>
      <Outlet />
    </LearnShell>
  );
}
