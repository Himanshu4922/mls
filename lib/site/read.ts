/** Safe to import from client components. No network calls. */

export function textOf(content: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const value = content?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function boolOf(content: Record<string, unknown> | undefined, key: string, fallback: boolean): boolean {
  const value = content?.[key];
  return typeof value === "boolean" ? value : fallback;
}

export function listOf<T>(content: Record<string, unknown> | undefined, key: string, fallback: T[]): T[] {
  const value = content?.[key];
  return Array.isArray(value) && value.length > 0 ? (value as T[]) : fallback;
}

export function headingLines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}
