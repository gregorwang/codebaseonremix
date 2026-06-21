/**
 * Hand-written, lesson-specific question banks anchored to real remix/ source.
 *
 * Each entry is a per-lesson Q[] (Q = Omit<CreateQuestionInput, "lessonId">).
 * The questions use the actual file paths, line numbers, and symbols from
 * remix/, not the synthetic codeExcerpt that perLessonGenerators emits.
 *
 * Registry contract:
 *   - Key:   `${courseSlug}/${lessonSlug}` (matches the LessonSpec keys
 *            built by units/courseCatalog.ts)
 *   - Value: Q[] of length 22-30 (or 36-54 for Nemesis units).
 *
 * Lookup order (see `courses/lessonExpand.ts`):
 *   1. REAL_LESSON_QUESTIONS[key]   — used as-is when present and >= 22.
 *   2. buildLessonQuestions(...)    — fallback synthetic generator (Phase 3).
 *
 * Adding a lesson:
 *   1. Drop a `<course-slug>/<lesson-slug>.ts` file under this directory
 *      that default-exports an array of Q built with the `q()` helper.
 *   2. Import and register here. That's it.
 */

import type { CreateQuestionInput } from "~/lib/learn/types";
import { rootLoaderQuestions } from "./site-02-root-shell/root-loader";
import { layoutHtmlQuestions } from "./site-02-root-shell/layout-html";
import { outletShellQuestions } from "./site-02-root-shell/outlet-shell";
import { errorBoundaryQuestions } from "./site-02-root-shell/error-boundary";
import { lazyLoginQuestions } from "./site-02-root-shell/lazy-login";
import { shellCapstoneQuestions } from "./site-02-root-shell/shell-capstone";
import { rootThemeLoaderQuestions } from "./site-04-theme-system/root-theme-loader";
import { rootThemeActionQuestions } from "./site-04-theme-system/root-theme-action";
import { themeFoucQuestions } from "./site-04-theme-system/theme-fouc";
import { themeServerQuestions } from "./site-04-theme-system/theme-server";
import { themeToggleUiQuestions } from "./site-04-theme-system/theme-toggle-ui";
import { themeCapstoneQuestions } from "./site-04-theme-system/theme-capstone";
import { lazyImportQuestions } from "./site-12-client-boundary/lazy-import";
import { clientOnlyQuestions } from "./site-12-client-boundary/client-only";
import { dotClientQuestions } from "./site-12-client-boundary/dot-client";
import { hydrationMismatchQuestions } from "./site-12-client-boundary/hydration-mismatch";
import { browserApiQuestions } from "./site-12-client-boundary/browser-api";
import { clientCapstoneQuestions } from "./site-12-client-boundary/client-capstone";
import { loaderContractQuestions } from "./site-14-loader-read/loader-contract";
import { cookieReadQuestions } from "./site-14-loader-read/cookie-read";
import { typedLoaderQuestions } from "./site-14-loader-read/typed-loader";
import { loaderCapstoneQuestions } from "./site-14-loader-read/loader-capstone";
import { rootActionQuestions } from "./site-15-action-write/root-action";
import { apiNemesisPostQuestions } from "./site-15-action-write/api-nemesis-post";
import { requestBodyQuestions } from "./site-15-action-write/request-body";
import { validationQuestions } from "./site-15-action-write/validation";
import { guardOrderQuestions } from "./site-17-guard/guard-order";
import { classifierReasonQuestions } from "./site-17-guard/classifier-reason";
import { auditCtxWaitUntilQuestions } from "./site-17-guard/audit-ctx-waitUntil";
import { apiEntryQuestions } from "./site-18-nemesis/api-entry";
import { nemesisServiceQuestions } from "./site-18-nemesis/nemesis-service";
import { feedbackRouteQuestions } from "./site-18-nemesis/feedback-route";
import { googleOauthQuestions } from "./site-16-auth-session/google-oauth";
import { dbReadQuestions } from "./site-14-loader-read/db-read";
import { cacheHeadersReadQuestions } from "./site-14-loader-read/cache-headers-read";
import { setCookieQuestions } from "./site-15-action-write/set-cookie";
import { cacheInvalidateQuestions } from "./site-15-action-write/cache-invalidate";
import { actionCapstoneQuestions } from "./site-15-action-write/action-capstone";
import { authServerQuestions } from "./site-16-auth-session/auth-server";
import { authRouteQuestions } from "./site-16-auth-session/auth-route";
import { sessionCachedQuestions } from "./site-16-auth-session/session-cached";
import { protectedRoutesQuestions } from "./site-16-auth-session/protected-routes";
import { authCapstoneQuestions } from "./site-16-auth-session/auth-capstone";
import { guardModuleQuestions } from "./site-17-guards-rate-limit/guard-module";
import { rateLimitQuestions } from "./site-17-guards-rate-limit/rate-limit";
import { errorResponsesQuestions } from "./site-17-guards-rate-limit/error-responses";
import { adminBypassQuestions } from "./site-17-guards-rate-limit/admin-bypass";
import { guardsCapstoneQuestions } from "./site-17-guards-rate-limit/guards-capstone";
import { parseBodyQuestions } from "./site-18-nemesis-api-chain/parse-body";
import { callGuardQuestions } from "./site-18-nemesis-api-chain/call-guard";
import { apiCapstoneQuestions } from "./site-18-nemesis-api-chain/api-capstone";
import { apiRoutesQuestions } from "./site-06-routing/api-routes";
import { indexRouteQuestions } from "./site-06-file-routing/index-route";
import { flatRoutesQuestions } from "./site-06-file-routing/flat-routes";
import { authSplatQuestions } from "./site-06-file-routing/auth-splat";
import { layoutRouteQuestions } from "./site-06-file-routing/layout-route";
import { routingCapstoneQuestions } from "./site-06-file-routing/routing-capstone";
import { streamResponseQuestions } from "./site-19-nemesis-sse/stream-response";
import { sseServerQuestions } from "./site-19-nemesis-sse-gateway/sse-server";
import { aiGatewayQuestions } from "./site-19-nemesis-sse-gateway/ai-gateway";
import { clientParseSseQuestions } from "./site-19-nemesis-sse-gateway/client-parse-sse";
import { promptsCatalogQuestions } from "./site-19-nemesis-sse-gateway/prompts-catalog";
import { sseCapstoneQuestions } from "./site-19-nemesis-sse-gateway/sse-capstone";
import { errorMappingQuestions } from "./site-20-d1-errors/error-mapping";
import { crossModuleQuestions } from "./site-20-d1-errors/cross-module";
import { dbServerQuestions } from "./site-20-d1-errors-capstone/db-server";
import { migrationsQuestions } from "./site-20-d1-errors-capstone/migrations";
import { messagesRouteQuestions } from "./site-20-d1-errors-capstone/messages-route";
import { finalCapstoneQuestions } from "./site-20-d1-errors-capstone/final-capstone";
import { appTreeQuestions } from "./site-01-repo-map/app-tree";
import { entryServerIntroQuestions } from "./site-01-repo-map/entry-server-intro";
import { cloudflareEnvQuestions } from "./site-01-repo-map/cloudflare-env";
import { routesFolderQuestions } from "./site-01-repo-map/routes-folder";
import { componentsFolderQuestions } from "./site-01-repo-map/components-folder";
import { repoCapstoneQuestions } from "./site-01-repo-map/repo-capstone";
import { handleRequestQuestions } from "./site-03-entry-server/handle-request";
import { responseHeadersQuestions } from "./site-03-entry-server/response-headers";
import { botDetectionQuestions } from "./site-03-entry-server/bot-detection";
import { streamFallbackQuestions } from "./site-03-entry-server/stream-fallback";
import { entryEnvQuestions } from "./site-03-entry-server/entry-env";
import { entryCapstoneQuestions } from "./site-03-entry-server/entry-capstone";
import { routeTransitionQuestions } from "./site-05-shell-errors/route-transition";
import { notFoundQuestions } from "./site-05-shell-errors/not-found";
import { errorBoundaryCompQuestions } from "./site-05-shell-errors/error-boundary-comp";
import { rootErrorExportQuestions } from "./site-05-shell-errors/root-error-export";
import { transitionAccessQuestions } from "./site-05-shell-errors/transition-access";
import { errorsCapstoneQuestions } from "./site-05-shell-errors/errors-capstone";
import { gameLayoutQuestions } from "./site-07-nested-layouts/game-layout";
import { gameIndexQuestions } from "./site-07-nested-layouts/game-index";
import { gamePlatformQuestions } from "./site-07-nested-layouts/game-platform";
import { gameLoaderQuestions } from "./site-07-nested-layouts/game-loader";
import { gameComponentsQuestions } from "./site-07-nested-layouts/game-components";
import { nestedCapstoneQuestions } from "./site-07-nested-layouts/nested-capstone";
import { indexRouteHomeQuestions } from "./site-08-home-landing/index-route-home";
import { homeHeroQuestions } from "./site-08-home-landing/home-hero";
import { homeVideoQuestions } from "./site-08-home-landing/home-video";
import { homeLyricsQuestions } from "./site-08-home-landing/home-lyrics";
import { homeDataQuestions } from "./site-08-home-landing/home-data";
import { homeCapstoneQuestions } from "./site-08-home-landing/home-capstone";
import { galleryRouteQuestions } from "./site-09-gallery-updates/gallery-route";
import { updatesRouteQuestions } from "./site-09-gallery-updates/updates-route";
import { cvRouteQuestions } from "./site-09-gallery-updates/cv-route";
import { animeRouteQuestions } from "./site-09-gallery-updates/anime-route";
import { sharedLayoutQuestions } from "./site-09-gallery-updates/shared-layout";
import { contentCapstoneQuestions } from "./site-09-gallery-updates/content-capstone";
import { chatRouteQuestions } from "./site-10-chat-page/chat-route";
import { nemesisPageClientQuestions } from "./site-10-chat-page/nemesis-page-client";
import { chatLoaderQuestions } from "./site-10-chat-page/chat-loader";
import { chatMetaQuestions } from "./site-10-chat-page/chat-meta";
import { chatLayoutQuestions } from "./site-10-chat-page/chat-layout";
import { chatCapstoneQuestions } from "./site-10-chat-page/chat-capstone";
import { headerNavQuestions } from "./site-11-ui-header/header-nav";
import { headerThemeQuestions } from "./site-11-ui-header/header-theme";
import { headerAuthQuestions } from "./site-11-ui-header/header-auth";
import { headerMobileQuestions } from "./site-11-ui-header/header-mobile";
import { headerA11yQuestions } from "./site-11-ui-header/header-a11y";
import { headerCapstoneQuestions } from "./site-11-ui-header/header-capstone";
import { nemesisHookQuestions } from "./site-13-frontend-state/nemesis-hook";
import { submitChainQuestions } from "./site-13-frontend-state/submit-chain";
import { sessionStorageQuestions } from "./site-13-frontend-state/session-storage";
import { loadingUiQuestions } from "./site-13-frontend-state/loading-ui";
import { errorStateQuestions } from "./site-13-frontend-state/error-state";
import { stateCapstoneQuestions } from "./site-13-frontend-state/state-capstone";

export type RealQ = Omit<CreateQuestionInput, "lessonId">;

export const REAL_LESSON_QUESTIONS: Record<string, RealQ[]> = {
  "site-01-repo-map/app-tree": appTreeQuestions,
  "site-01-repo-map/entry-server-intro": entryServerIntroQuestions,
  "site-01-repo-map/cloudflare-env": cloudflareEnvQuestions,
  "site-01-repo-map/routes-folder": routesFolderQuestions,
  "site-01-repo-map/components-folder": componentsFolderQuestions,
  "site-01-repo-map/repo-capstone": repoCapstoneQuestions,
  "site-03-entry-server/handle-request": handleRequestQuestions,
  "site-03-entry-server/response-headers": responseHeadersQuestions,
  "site-03-entry-server/bot-detection": botDetectionQuestions,
  "site-03-entry-server/stream-fallback": streamFallbackQuestions,
  "site-03-entry-server/entry-env": entryEnvQuestions,
  "site-03-entry-server/entry-capstone": entryCapstoneQuestions,
  "site-05-shell-errors/route-transition": routeTransitionQuestions,
  "site-05-shell-errors/not-found": notFoundQuestions,
  "site-05-shell-errors/error-boundary-comp": errorBoundaryCompQuestions,
  "site-05-shell-errors/root-error-export": rootErrorExportQuestions,
  "site-05-shell-errors/transition-access": transitionAccessQuestions,
  "site-05-shell-errors/errors-capstone": errorsCapstoneQuestions,
  "site-07-nested-layouts/game-layout": gameLayoutQuestions,
  "site-07-nested-layouts/game-index": gameIndexQuestions,
  "site-07-nested-layouts/game-platform": gamePlatformQuestions,
  "site-07-nested-layouts/game-loader": gameLoaderQuestions,
  "site-07-nested-layouts/game-components": gameComponentsQuestions,
  "site-07-nested-layouts/nested-capstone": nestedCapstoneQuestions,
  "site-08-home-landing/index-route-home": indexRouteHomeQuestions,
  "site-08-home-landing/home-hero": homeHeroQuestions,
  "site-08-home-landing/home-video": homeVideoQuestions,
  "site-08-home-landing/home-lyrics": homeLyricsQuestions,
  "site-08-home-landing/home-data": homeDataQuestions,
  "site-08-home-landing/home-capstone": homeCapstoneQuestions,
  "site-09-gallery-updates/gallery-route": galleryRouteQuestions,
  "site-09-gallery-updates/updates-route": updatesRouteQuestions,
  "site-09-gallery-updates/cv-route": cvRouteQuestions,
  "site-09-gallery-updates/anime-route": animeRouteQuestions,
  "site-09-gallery-updates/shared-layout": sharedLayoutQuestions,
  "site-09-gallery-updates/content-capstone": contentCapstoneQuestions,
  "site-10-chat-page/chat-route": chatRouteQuestions,
  "site-10-chat-page/nemesis-page-client": nemesisPageClientQuestions,
  "site-10-chat-page/chat-loader": chatLoaderQuestions,
  "site-10-chat-page/chat-meta": chatMetaQuestions,
  "site-10-chat-page/chat-layout": chatLayoutQuestions,
  "site-10-chat-page/chat-capstone": chatCapstoneQuestions,
  "site-11-ui-header/header-nav": headerNavQuestions,
  "site-11-ui-header/header-theme": headerThemeQuestions,
  "site-11-ui-header/header-auth": headerAuthQuestions,
  "site-11-ui-header/header-mobile": headerMobileQuestions,
  "site-11-ui-header/header-a11y": headerA11yQuestions,
  "site-11-ui-header/header-capstone": headerCapstoneQuestions,
  "site-13-frontend-state/nemesis-hook": nemesisHookQuestions,
  "site-13-frontend-state/submit-chain": submitChainQuestions,
  "site-13-frontend-state/session-storage": sessionStorageQuestions,
  "site-13-frontend-state/loading-ui": loadingUiQuestions,
  "site-13-frontend-state/error-state": errorStateQuestions,
  "site-13-frontend-state/state-capstone": stateCapstoneQuestions,
  "site-02-root-shell/root-loader": rootLoaderQuestions,
  "site-02-root-shell/layout-html": layoutHtmlQuestions,
  "site-02-root-shell/outlet-shell": outletShellQuestions,
  "site-02-root-shell/error-boundary": errorBoundaryQuestions,
  "site-02-root-shell/lazy-login": lazyLoginQuestions,
  "site-02-root-shell/shell-capstone": shellCapstoneQuestions,
  "site-04-theme-system/root-theme-loader": rootThemeLoaderQuestions,
  "site-04-theme-system/root-theme-action": rootThemeActionQuestions,
  "site-04-theme-system/theme-fouc": themeFoucQuestions,
  "site-04-theme-system/theme-server": themeServerQuestions,
  "site-04-theme-system/theme-toggle-ui": themeToggleUiQuestions,
  "site-04-theme-system/theme-capstone": themeCapstoneQuestions,
  "site-06-file-routing/api-routes": apiRoutesQuestions,
  "site-06-file-routing/index-route": indexRouteQuestions,
  "site-06-file-routing/flat-routes": flatRoutesQuestions,
  "site-06-file-routing/auth-splat": authSplatQuestions,
  "site-06-file-routing/layout-route": layoutRouteQuestions,
  "site-06-file-routing/routing-capstone": routingCapstoneQuestions,
  "site-12-client-boundary/lazy-import": lazyImportQuestions,
  "site-12-client-boundary/client-only": clientOnlyQuestions,
  "site-12-client-boundary/dot-client": dotClientQuestions,
  "site-12-client-boundary/hydration-mismatch": hydrationMismatchQuestions,
  "site-12-client-boundary/browser-api": browserApiQuestions,
  "site-12-client-boundary/client-capstone": clientCapstoneQuestions,
  "site-14-loader-read/loader-contract": loaderContractQuestions,
  "site-14-loader-read/cookie-read": cookieReadQuestions,
  "site-14-loader-read/db-read": dbReadQuestions,
  "site-14-loader-read/cache-headers-read": cacheHeadersReadQuestions,
  "site-14-loader-read/typed-loader": typedLoaderQuestions,
  "site-14-loader-read/loader-capstone": loaderCapstoneQuestions,
  "site-15-action-write/root-action": rootActionQuestions,
  "site-15-action-write/api-nemesis-post": apiNemesisPostQuestions,
  "site-15-action-write/request-body": requestBodyQuestions,
  "site-15-action-write/set-cookie": setCookieQuestions,
  "site-15-action-write/validation": validationQuestions,
  "site-15-action-write/cache-invalidate": cacheInvalidateQuestions,
  "site-15-action-write/action-capstone": actionCapstoneQuestions,
  "site-16-auth-session/auth-server": authServerQuestions,
  "site-16-auth-session/auth-route": authRouteQuestions,
  "site-16-auth-session/session-cached": sessionCachedQuestions,
  "site-16-auth-session/google-oauth": googleOauthQuestions,
  "site-16-auth-session/protected-routes": protectedRoutesQuestions,
  "site-16-auth-session/auth-capstone": authCapstoneQuestions,
  "site-17-guards-rate-limit/guard-module": guardModuleQuestions,
  "site-17-guards-rate-limit/rate-limit": rateLimitQuestions,
  "site-17-guards-rate-limit/guard-order": guardOrderQuestions,
  "site-17-guards-rate-limit/classifier-reason": classifierReasonQuestions,
  "site-17-guards-rate-limit/audit-ctx-waitUntil": auditCtxWaitUntilQuestions,
  "site-17-guards-rate-limit/error-responses": errorResponsesQuestions,
  "site-17-guards-rate-limit/admin-bypass": adminBypassQuestions,
  "site-17-guards-rate-limit/guards-capstone": guardsCapstoneQuestions,
  "site-18-nemesis-api-chain/api-entry": apiEntryQuestions,
  "site-18-nemesis-api-chain/parse-body": parseBodyQuestions,
  "site-18-nemesis-api-chain/call-guard": callGuardQuestions,
  "site-18-nemesis-api-chain/nemesis-service": nemesisServiceQuestions,
  "site-18-nemesis-api-chain/feedback-route": feedbackRouteQuestions,
  "site-18-nemesis-api-chain/api-capstone": apiCapstoneQuestions,
  "site-19-nemesis-sse-gateway/sse-server": sseServerQuestions,
  "site-19-nemesis-sse-gateway/stream-response": streamResponseQuestions,
  "site-19-nemesis-sse-gateway/ai-gateway": aiGatewayQuestions,
  "site-19-nemesis-sse-gateway/client-parse-sse": clientParseSseQuestions,
  "site-19-nemesis-sse-gateway/prompts-catalog": promptsCatalogQuestions,
  "site-19-nemesis-sse-gateway/sse-capstone": sseCapstoneQuestions,
  "site-20-d1-errors-capstone/db-server": dbServerQuestions,
  "site-20-d1-errors-capstone/migrations": migrationsQuestions,
  "site-20-d1-errors-capstone/messages-route": messagesRouteQuestions,
  "site-20-d1-errors-capstone/error-mapping": errorMappingQuestions,
  "site-20-d1-errors-capstone/cross-module": crossModuleQuestions,
  "site-20-d1-errors-capstone/final-capstone": finalCapstoneQuestions,
};

export function getRealLessonQuestions(
  courseSlug: string,
  lessonSlug: string,
): RealQ[] | undefined {
  return REAL_LESSON_QUESTIONS[`${courseSlug}/${lessonSlug}`];
}
