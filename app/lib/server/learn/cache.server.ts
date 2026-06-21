import { PUBLIC_CACHE_TTL_SECONDS } from "./cache-keys";

export async function getCachedJson<T>(
  cache: KVNamespace | undefined,
  key: string,
): Promise<T | null> {
  if (!cache) return null;
  try {
    return await cache.get(key, "json");
  } catch {
    return null;
  }
}

export async function setCachedJson<T>(
  cache: KVNamespace | undefined,
  key: string,
  value: T,
  ttlSeconds: number = PUBLIC_CACHE_TTL_SECONDS,
): Promise<void> {
  if (!cache) return;
  try {
    await cache.put(key, JSON.stringify(value), {
      expirationTtl: ttlSeconds,
    });
  } catch {
    // KV write failure must not break requests
  }
}

export async function deleteCacheKey(
  cache: KVNamespace | undefined,
  key: string,
): Promise<void> {
  if (!cache) return;
  try {
    await cache.delete(key);
  } catch {
    // ignore
  }
}
