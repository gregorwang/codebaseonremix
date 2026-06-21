# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Code Coach** — a Chinese-language learning platform for developers who already have a real codebase but lost the ability to *read* the code AI generated for them. The product teaches users to trace cause-and-effect through real project files (state scope, request flow, guards, validation, rate limiting, loader/action wiring) instead of generic syntax drills.

The runtime is **React Router 7 (framework mode) on Cloudflare Workers**, with D1 for content, KV for public read cache, and the Cloudflare AI Gateway for all LLM calls.

The repo also contains a **separate sibling project under `remix/`** — a Remix v2 personal site used as the *subject* of the curriculum (Code Coach scans it, extracts code assets, and asks questions about it). The two projects share the workspace but are not built together. `tsconfig.json` excludes `remix/**` and Code Coach never imports from it; reads are restricted to the dev-only `/__remix-assets` Vite middleware.

## Commands

All commands run from the **repo root** (where this `CLAUDE.md` lives), not from `remix/`.

```bash
npm run dev                  # Vite + RR7 dev server (with cloudflare vite plugin)
npm run build                # production build
npm run typecheck            # react-router typegen + tsc --noEmit
npm run test                 # vitest run (single-shot; no watch)
npm run deploy               # wrangler deploy

# D1
npm run db:migrate:local     # wrangler d1 migrations apply code-coach-db --local
npm run db:seed:local        # seed 3 sample courses (force overwrite)
npm run db:seed:sample:local # seed only the small sample set
npm run db:rebuild-progress:local   # rebuild lesson/course_progress rows from answer_attempts
npm run db:seed:remote       # seed locally then wrangler d1 export → --remote execute
```

Run a single test file: `npx vitest run tests/questionCheck.test.ts` (note: these are `*.test.ts`, not TSX, and use the `~` alias via `vitest.config.ts`).

## Architecture map

```
workers/app.ts                Cloudflare entry: passes env+ctx into RR7 request handler
app/root.tsx                  HTML shell, error boundary (zh-CN)
app/entry.{client,server}.tsx React 19 streaming SSR

app/routes.ts                 ALL routes are declared here (config-based, not file-system)
app/routes/                   /learn/* nested layout: dashboard, courses, lessons, exams,
                              review, ability-map, snippets, admin/*
app/components/learn/         One folder per feature area:
                                {ability, admin, code, course, dashboard, exam, layout,
                                 lesson, question, review, snippet, teaching, ui}
                              Group LessonPractice.tsx / ExamPractice.tsx are the heavy ones.

app/lib/learn/                Pure (isomorphic) types, ability tags, question checkers,
                              code-language inference, AI input formatters.
                              Hot files: types.ts, questionCheck.ts, abilityTags.ts.
app/lib/server/learn/         D1 reads/writes. Each domain is its own *.server.ts.
                              Submitting an answer = attempts.server.ts (the orchestrator).
app/lib/server/ai/            The ONLY place that calls the LLM. aiGateway.server.ts is the
                              network layer; aiLearn.server.ts is the feature layer
                              (hint / explanation / mistake_summary / question_generation /
                              exam_review / snippet_explain).
app/lib/server/project-curriculum/  Scan → extract → plan → publish pipeline.
                              Drives the curriculum generated from remix/.

migrations/                   0001–0007 SQL. *_json columns hold serialized arrays/objects;
                              parse via parseJsonField in app/lib/server/learn/db-json.server.ts.

scripts/                      One-shot Node scripts that use getPlatformProxy<Env>
                              (NOT wrangler dev) to talk to D1. The four curriculum scripts
                              (scan / plan / extract-assets / publish) form a manual pipeline
                              operated by admins.

tests/                        Vitest unit tests for the pure helpers in app/lib/learn/*.
                              Server modules and routes are not tested here.
```

## Key conventions

- **All routes are explicit in `app/routes.ts`** with `route()` / `prefix()` / `layout()`. Do not assume file-system routing.
- **All D1 access goes through `*.server.ts` modules** under `app/lib/server/`. Routes call into them; components never touch `context.cloudflare.env.DB` directly.
- **No auth.** The user is identified by a `learn_uid` HttpOnly cookie minted by `ensureLearnUser()` in `app/lib/server/learn/user.server.ts`. The admin gate is `requireAdmin(request, env)` against the `LEARN_ADMIN_UIDS` env var (comma-separated). There is no login, no session, no Better Auth in this project — that lives in `remix/`.
- **JSON-in-D1.** `*_json` text columns are parsed with `parseJsonField(json, fallback)`. Boolean columns are stored as `INTEGER (0/1)` and round-tripped with `intToBool` / `boolToInt`.
- **AI calls are funneled.** Routes/components never import `aiGateway.server.ts` directly. They go through the high-level helpers in `app/lib/server/ai/aiLearn.server.ts` or the curriculum pipeline in `app/lib/server/project-curriculum/`. There is no per-user rate limit — the only cost gate is the AI Gateway quota itself, which Cloudflare enforces upstream and surfaces as `AiGatewayError("rate_limited")`.
- **AI output safety.** `app/lib/server/ai/aiSchemas.server.ts` runs `validateAiSecurityContent` on anything the AI returns or that the user pastes in; it rejects bearer tokens, sk-* keys, "bypass login/rate limit" wording, etc. The scanner also uses it to skip storing files that look like secrets (`shouldSkipFileContent` in `projectScanner.server.ts`).
- **Public reads are KV-cached.** `LEARN_CACHE` holds snapshots of courses overview, exam list, ability tags, course structures, and lesson question lists, with versioned keys (`LEARN_CACHE_VERSION` in `cache-keys.ts`). To invalidate globally, bump that version. Single-key deletes use `deleteCacheKey`.
- **Type system has two layers.** `app/lib/learn/types.ts` defines both the in-memory domain (`Course`, `Lesson`, `Question` …) and the snake_case `*Row` DTOs. Mappers in `app/lib/server/learn/mappers.server.ts` convert between them; new tables need both halves.
- **Question types** are a closed set in `app/lib/learn/types.ts`: `single_choice | multi_choice | sort | fill_blank | debug | branch_trace | position_judgement | ai_review`. Adding a new type means adding a renderer in `app/components/learn/question/`, a checker branch in `app/lib/learn/questionCheck.ts`, an answer variant in `UserAnswer`, and an `AiFeature` mapping.
- **Ability tags** are a closed set of 15 strings in `app/lib/learn/abilityTags.ts`. Mistake types are also a closed set in the same file. Both are wired through to the D1 schema, the ability tree, the AI prompts, and the recommendation engine — adding one is a multi-file change.
- **Reading the `remix/` project.** From the dev server, browse files via the `/__remix-assets/list?dir=app` and `/__remix-assets/read?path=...` endpoints, exposed by `scripts/vite-remix-assets-plugin.ts` (dev only, never in production build). The corresponding helpers `listRemixSourceFiles` / `readRemixSourceFile` live in `scripts/remix-assets.ts` and are also used by `seed-data/snippets` so the snippet form can show real files. The full pipeline (scan → plan → extract → publish) goes through `app/lib/server/project-curriculum/*` instead and writes to D1.

## Environment & secrets

Local secrets live in `.dev.vars` (gitignored). Required keys (see `.dev.vars.example`):

- `NEMESIS_AI_GATEWAY_ID` — AI Gateway ID. Without this, all AI features throw `AiGatewayError("not_configured")`.
- `CF_AIG_TOKEN` (or `CLOUDFLARE_API_TOKEN`) — bearer for the gateway.
- `CLOUDFLARE_ACCOUNT_ID` — used as fallback to build the gateway URL.
- `CODE_COACH_AI_MODEL` — defaults to `google-ai-studio/gemini-3.1-flash-lite`; format is `provider/model`.
- `LEARN_ADMIN_UIDS` — comma-separated `learn_uid` cookie values that can access `/learn/admin/*`.

Wrangler bindings (`wrangler.jsonc`): `DB` (D1), `LEARN_CACHE` (KV), `AI` (Workers AI binding — used as a discovery path for the AI Gateway URL, not as the inference engine).

## When you change things

- Adding a D1 column → new migration under `migrations/`, plus a new `*Row` type in `types.ts` and a mapper. The `defer_foreign_keys = TRUE` pragma at the top of each migration matters.
- Adding an AI feature → new entry in `AiFeature` union, a prompt builder in `aiPrompts.server.ts`, and a runner in `aiLearn.server.ts`. Don't forget to add a JSON schema guard in `aiSchemas.server.ts` if the new feature accepts free-form code.
- Adding a route → declare in `app/routes.ts`, then add the file. Nested learn routes go under the `learn` prefix; admin routes go under the `learn/admin` sub-prefix.
- Touching the public cache → prefer adding a new key in `LEARN_CACHE_KEYS` and bumping `LEARN_CACHE_VERSION` if a shape change is backwards-incompatible.
