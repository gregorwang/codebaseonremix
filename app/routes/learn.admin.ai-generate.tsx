import { data, redirect } from "react-router";
import { AiGenerateForm } from "~/components/learn/admin/AiGenerateForm";
import { isAbilityTag } from "~/lib/learn/abilityTags";
import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { Difficulty, QuestionType } from "~/lib/learn/types";
import {
  generateAndValidateQuestionDraft,
  toAiLearnError,
} from "~/lib/server/ai/aiLearn.server";
import { AiDraftValidationError } from "~/lib/server/learn/aiDrafts.server";
import { getActiveSnippetById, listActiveSnippets } from "~/lib/server/learn/snippets.server";
import { mergeHeaders } from "~/lib/server/learn/user.server";
import { requireAdmin } from "~/lib/server/learn/requireAdmin.server";
import type { Route } from "./+types/learn.admin.ai-generate";

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
    if ((QUESTION_TYPES as readonly string[]).includes(type)) {
      types.push(type as QuestionType);
    }
  }
  return types;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { headers } = requireAdmin(request, env);
  const db = env.DB;
  const snippets = await listActiveSnippets(db);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  return data(
    { snippets, error },
    headers ? { headers: mergeHeaders(null, headers) } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const db = env.DB;
  const { userId, headers } = requireAdmin(request, env);
  const formData = await request.formData();

  if (formData.get("intent") !== "generate") {
    throw data("Unknown intent", { status: 400 });
  }

  const responseHeaders = headers
    ? { headers: mergeHeaders(null, headers) }
    : undefined;

  const sourceTitle = String(formData.get("sourceTitle") ?? "").trim();
  const sourceCode = String(formData.get("sourceCode") ?? "").trim();
  if (!sourceTitle || !sourceCode) {
    return redirect(
      `/learn/admin/ai-generate?error=${encodeURIComponent("标题和代码不能为空")}`,
      responseHeaders,
    );
  }

  const targetAbilities = parseAbilityTags(formData);
  const preferredQuestionTypes = parseQuestionTypes(formData);
  if (targetAbilities.length === 0 || preferredQuestionTypes.length === 0) {
    return redirect(
      `/learn/admin/ai-generate?error=${encodeURIComponent("请选择能力与题型")}`,
      responseHeaders,
    );
  }

  const difficultyRaw = String(formData.get("difficulty") ?? "intermediate");
  const difficulty = (DIFFICULTIES as readonly string[]).includes(difficultyRaw)
    ? (difficultyRaw as Difficulty)
    : "intermediate";

  const snippetId = String(formData.get("snippetId") ?? "").trim() || undefined;
  let snippetContext: {
    sourceFilePath?: string;
    projectContext?: string;
  } = {
    sourceFilePath: String(formData.get("sourceFilePath") ?? "").trim() || undefined,
    projectContext: String(formData.get("projectContext") ?? "").trim() || undefined,
  };

  if (snippetId) {
    const snippet = await getActiveSnippetById(db, snippetId);
    if (snippet) {
      snippetContext = {
        sourceFilePath: snippet.sourceFilePath ?? snippetContext.sourceFilePath,
        projectContext: snippet.projectContext ?? snippetContext.projectContext,
      };
    }
  }

  try {
    const result = await generateAndValidateQuestionDraft(db, env, {
      userId,
      snippetId,
      sourceTitle,
      sourceCode,
      sourceFilePath: snippetContext.sourceFilePath,
      projectContext: snippetContext.projectContext,
      targetAbilities,
      preferredQuestionTypes,
      difficulty,
      generationGoal:
        String(formData.get("generationGoal") ?? "").trim() ||
        "围绕真实项目代码因果链生成训练题。",
      desiredQuestionCount: Math.min(
        8,
        Math.max(1, Number(formData.get("desiredQuestionCount") ?? 3) || 3),
      ),
    });

    return redirect(
      `/learn/admin/drafts?highlight=${result.draft.id}`,
      responseHeaders,
    );
  } catch (error) {
    const message =
      error instanceof AiDraftValidationError
        ? error.errors.join("；")
        : toAiLearnError(error).message;
    return redirect(
      `/learn/admin/ai-generate?error=${encodeURIComponent(message)}`,
      responseHeaders,
    );
  }
}

export default function AdminAiGeneratePage({ loaderData }: Route.ComponentProps) {
  return (
    <AiGenerateForm
      snippets={loaderData.snippets}
      error={loaderData.error ?? undefined}
    />
  );
}
