import "./server-only";
import type { FieldValue } from "@/types/f1";
import type { DataError } from "@/types/f1-provider";

export class ProviderFailure extends Error {
  constructor(readonly detail: DataError) {
    super(detail.message);
  }
}

export function invalid(): never {
  throw new ProviderFailure({
    code: "invalid-response",
    message: "Jolpica returned an invalid or inconsistent response.",
    retryable: false,
  });
}

export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    invalid();
  // The guard excludes null/arrays/primitives; properties remain untrusted unknown.
  return value as Record<string, unknown>;
}

export function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) invalid();
  return value;
}

export function string(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512)
    invalid();
  return value;
}

export function integer(value: unknown, minimum = 0): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) invalid();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) invalid();
  return parsed;
}

export function year(value: unknown): number {
  const parsed = integer(value, 1950);
  if (parsed > 9999) invalid();
  return parsed;
}

export function decimal(value: unknown): number {
  if (typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value)) invalid();
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > Number.MAX_SAFE_INTEGER)
    invalid();
  return parsed;
}

export function available<T>(value: T): FieldValue<T> {
  return { status: "available", value };
}
export const missing = { status: "missing" } as const;
export const notApplicable = { status: "not-applicable" } as const;
export function field<T>(
  value: unknown,
  parse: (value: unknown) => T,
): FieldValue<T> {
  return value === undefined || value === null
    ? missing
    : available(parse(value));
}

export function identifier(value: unknown): string {
  const parsed = string(value);
  if (!/^[a-zA-Z0-9_-]+$/.test(parsed)) invalid();
  return parsed;
}

export function date(value: unknown): string {
  const parsed = string(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) invalid();
  const stamp = Date.parse(`${parsed}T00:00:00Z`);
  if (
    !Number.isFinite(stamp) ||
    new Date(stamp).toISOString().slice(0, 10) !== parsed
  )
    invalid();
  return parsed;
}

export function utcTime(value: unknown): string {
  const parsed = string(value);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(parsed))
    invalid();
  return parsed;
}

/** Source durations have seconds, mm:ss or hh:mm:ss; preserve their precision. */
export function duration(value: unknown): number {
  const parsed = string(value);
  if (!/^\d+(?::[0-5]\d){0,2}(?:\.\d{1,3})?$/.test(parsed)) invalid();
  const pieces = parsed.split(":").map(Number);
  const seconds = pieces.reduce((total, piece) => total * 60 + piece, 0);
  const milliseconds = Math.round(seconds * 1000);
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) invalid();
  return milliseconds;
}

export function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
