export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJsonField(value: unknown): string {
  return JSON.stringify(value);
}

export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

export function intToBool(value: number): boolean {
  return value === 1;
}
