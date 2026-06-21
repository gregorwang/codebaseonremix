import { data } from "react-router";
import { QuestionAdminTable } from "~/components/learn/admin/QuestionAdminTable";
import {
  archiveQuestion,
  listQuestionsForAdmin,
  publishQuestion,
} from "~/lib/server/learn/questions.server";
import { mergeHeaders } from "~/lib/server/learn/user.server";
import { requireAdmin } from "~/lib/server/learn/requireAdmin.server";
import type { Route } from "./+types/learn.admin.questions";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { headers } = requireAdmin(request, env);
  const questions = await listQuestionsForAdmin(env.DB);

  return data(
    { questions },
    headers ? { headers: mergeHeaders(null, headers) } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const db = env.DB;
  const { headers } = requireAdmin(request, env);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const questionId = String(formData.get("questionId") ?? "");

  const responseHeaders = headers
    ? { headers: mergeHeaders(null, headers) }
    : undefined;

  if (!questionId) {
    throw data({ ok: false, error: "Missing questionId" }, { status: 400 });
  }

  if (intent === "publish_question") {
    await publishQuestion(db, questionId, env.LEARN_CACHE);
    return data({ ok: true }, responseHeaders);
  }

  if (intent === "archive_question") {
    await archiveQuestion(db, questionId, env.LEARN_CACHE);
    return data({ ok: true }, responseHeaders);
  }

  throw data({ ok: false, error: "Unknown intent" }, { status: 400 });
}

export default function AdminQuestionsPage({ loaderData }: Route.ComponentProps) {
  return <QuestionAdminTable questions={loaderData.questions} />;
}
