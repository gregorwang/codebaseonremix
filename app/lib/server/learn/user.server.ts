const LEARN_UID_COOKIE = "learn_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type LearnUserResult = {
  userId: string;
  headers?: Headers;
};

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function ensureLearnUser(request: Request): LearnUserResult {
  const existing = parseCookie(request.headers.get("Cookie"), LEARN_UID_COOKIE);
  if (existing) {
    return { userId: existing };
  }

  const userId = crypto.randomUUID();
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `${LEARN_UID_COOKIE}=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`,
  );
  return { userId, headers };
}

/**
 * Build a Set-Cookie header that adopts an arbitrary `learn_uid` (used by the
 * /learn/account "import identity" flow so the user can sync progress across
 * devices by pasting their UID). The new cookie has the same lifetime as a
 * fresh `ensureLearnUser` cookie.
 */
export function buildAdoptUidCookie(userId: string): Headers {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `${LEARN_UID_COOKIE}=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`,
  );
  return headers;
}

/**
 * Strict UUID v4 check. We accept *any* RFC-4122 UUID though — older devices
 * may have minted v1 / v5 ids. The point is to refuse free-form text that
 * could only have come from a typo, not to enforce v4.
 */
export function isValidLearnUid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export function mergeHeaders(
  base?: Headers | null,
  extra?: Headers | null,
): Headers | undefined {
  if (!base && !extra) return undefined;
  const merged = new Headers(base ?? undefined);
  extra?.forEach((value, key) => merged.append(key, value));
  return merged;
}
