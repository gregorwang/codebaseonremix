import { data, redirect } from "react-router";
import { SnippetDetail } from "~/components/learn/snippet/SnippetDetail";
import { isAbilityTag } from "~/lib/learn/abilityTags";
import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { Difficulty, QuestionType } from "~/lib/learn/types";
import {
  generateQuestionsFromSnippet,
  toAiLearnError,
} from "~/lib/server/ai/aiLearn.server";
import { getDraftsBySnippetId } from "~/lib/server/learn/aiDrafts.server";
import {
  archiveSnippet,
  getSnippetById,
} from "~/lib/server/learn/snippets.server";
import { isAdminUser, requireAdmin } from "~/lib/server/learn/requireAdmin.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.snippets.$snippetId";

const QUESTION_TYPES: QuestionType[] = [
  "single_choice",
  "multi_choice",
  "sort",
  "fill_blank",
  "debug",
  "branch_trace",
  "position_judgement",
  "ai_review",
];

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

function isQuestionType(value: string): value is QuestionType {
  return (QUESTION_TYPES as readonly string[]).includes(value);
}

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

function parseAbilityTags(formData: FormData): AbilityTag[] {
  const tags: AbilityTag[] = [];
  for (const value of formData.getAll("targetAbilities")) {
    const tag = String(value);
    if (isAbilityTag(tag)) tags.push(tag);
  }
  return tags;
}

function parseQuestionTypes(formData: FormData): QuestionType[] {
  const types: QuestionType[] = [];
  for (const value of formData.getAll("preferredQuestionTypes")) {
    const type = String(value);
    if (isQuestionType(type)) types.push(type);
  }
  return types;
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const snippetId = params.snippetId;

  const snippet = await getSnippetById(db, snippetId, userId);
  if (!snippet) {
    throw data("片段不存在", { status: 404 });
  }

  const drafts = await getDraftsBySnippetId(db, snippetId, userId);
  const isAdmin = isAdminUser(userId, context.cloudflare.env);

  return data(
    { snippet, drafts, isAdmin },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

export async function action({ request, context, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    throw data("Method not allowed", { status: 405 });
  }

  const db = context.cloudflare.env.DB;
  const env = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  const snippetId = params.snippetId;
  const formData = await request.formData();
  const intent = formData.get("intent");

  const responseHeaders = cookieHeaders
    ? { headers: mergeHeaders(null, cookieHeaders) }
    : undefined;

  const snippet = await getSnippetById(db, snippetId, userId);
  if (!snippet) {
    throw data({ ok: false, error: "片段不存在" }, { status: 404 });
  }

  if (intent === "archive_snippet") {
    await archiveSnippet(db, snippetId, userId);
    return redirect("/learn/snippets", responseHeaders);
  }

  if (intent === "generate_draft") {
    requireAdmin(request, env);
    const targetAbilities = parseAbilityTags(formData);
    const preferredQuestionTypes = parseQuestionTypes(formData);
    if (targetAbilities.length === 0) {
      return data(
        { ok: false as const, error: "请至少选择一个目标能力" },
        responseHeaders,
      );
    }
    if (preferredQuestionTypes.length === 0) {
      return data(
        { ok: false as const, error: "请至少选择一种题型" },
        responseHeaders,
      );
    }

    const difficultyRaw = String(formData.get("difficulty") ?? "intermediate");
    const difficulty = isDifficulty(difficultyRaw) ? difficultyRaw : "intermediate";
    const generationGoal =
      String(formData.get("generationGoal") ?? "").trim() ||
      "围绕真实项目代码因果链生成训练题。";
    const desiredQuestionCount = Math.min(
      8,
      Math.max(1, Number(formData.get("desiredQuestionCount") ?? 3) || 3),
    );

    try {
      const result = await generateQuestionsFromSnippet(db, env, {
        userId,
        snippet,
        targetAbilities,
        preferredQuestionTypes,
        difficulty,
        generationGoal,
        desiredQuestionCount,
      });

      return data(
        {
          ok: true as const,
          draftId: result.draft.id,
        },
        responseHeaders,
      );
    } catch (error) {
      const aiError = toAiLearnError(error);
      return data(
        { ok: false as const, error: aiError.message, code: aiError.code },
        responseHeaders,
      );
    }
  }

  throw data({ ok: false, error: "Unknown intent" }, { status: 400 });
}

export default function SnippetDetailPage({ loaderData }: Route.ComponentProps) {
  const { snippet, drafts, isAdmin } = loaderData;

  return (
    <div>
      <SnippetDetail snippet={snippet} drafts={drafts} isAdmin={isAdmin} />
    </div>
  );
}
