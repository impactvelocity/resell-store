import "server-only";
import { z } from "zod";
import type { ApiScope } from "@repo/db";
import { CommerceError } from "../commerce";
import { UploadError } from "../files";
import { FollowError } from "../follows";
import { LikeError } from "../likes";
import { MessageError } from "../messages";
import type { ApiKeyRow } from "./keys";

/*
 * Plumbing shared by every /v1 route: errors, auth context, body parsing and
 * the schema helpers that let one schema accept JSON and curl's form fields.
 */

export type ErrorType =
  | "invalid_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "unavailable"
  | "server_error";

const statusFor: Record<ErrorType, number> = {
  invalid_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  unavailable: 503,
  server_error: 500,
};

/** An error the caller can act on. The message is a plain sentence. */
export class ApiError extends Error {
  readonly status: number;
  constructor(
    readonly type: ErrorType,
    message: string,
    readonly param?: string,
  ) {
    super(message);
    this.status = statusFor[type];
  }
}

export const notFound = (what: string) => new ApiError("not_found", `No ${what} with that id, or it isn't yours.`);

export type Auth = {
  key: ApiKeyRow;
  user: { id: string; name: string; email: string };
};

export function hasScope(auth: Auth | null, scope: ApiScope) {
  return !!auth?.key.scopes.includes(scope);
}

/** Agent links stop at the owner's ceiling for one thing (P7). Secret keys have none. */
export function checkCeiling(auth: Auth, cents: number) {
  const max = auth.key.kind === "agent" ? auth.key.maxOfferCents : null;
  if (max === null || cents <= max) return;
  throw new ApiError(
    "forbidden",
    `That's over the $${(max / 100).toLocaleString("en-US")} its owner allows for one thing. Ask them: they can raise it at resell.store/agent, or do this themselves.`,
  );
}

/** The domain's own errors (a person could fix them) become 400s or 409s; zod becomes 400. */
export function toApiError(error: unknown): ApiError | null {
  if (error instanceof ApiError) return error;
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    const param = issue?.path.join(".") || undefined;
    return new ApiError(
      "invalid_request",
      issue ? `${param ? `${param}: ` : ""}${issue.message}` : "Something in the request doesn't look right.",
      param,
    );
  }
  if (error instanceof CommerceError) return new ApiError("conflict", error.message);
  if (error instanceof MessageError || error instanceof FollowError || error instanceof LikeError)
    return new ApiError("invalid_request", error.message);
  if (error instanceof UploadError) return new ApiError("invalid_request", error.message);
  return null;
}

/* Bodies: JSON, or form fields from `curl -d`, or multipart for uploads */

/**
 * Form fields → an object. `a[b]=1` nests one level, `a[]=1&a[]=2` and a
 * repeated `a` make arrays, so `-d fields[Brand]=Le Creuset` works from curl.
 */
/** Keys that would reach Object.prototype (`__proto__[x]=1` from any query string). */
const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);

function formToObject(entries: Iterable<[string, FormDataEntryValue]>) {
  const out: Record<string, unknown> = {};
  // Only the object's own keys: `toString[x]=1` mustn't find Object.prototype.toString
  const own = (o: Record<string, unknown>, k: string) => (Object.hasOwn(o, k) ? o[k] : undefined);
  for (const [rawKey, value] of entries) {
    const v = typeof value === "string" ? value : value;
    const nested = rawKey.match(/^([^[\]]+)\[([^[\]]*)\]$/);
    if (nested) {
      const [, key, inner] = nested as unknown as [string, string, string];
      if (unsafeKeys.has(key) || unsafeKeys.has(inner)) continue;
      const prev = own(out, key);
      if (inner === "") {
        // `a=1&a[]=2` is a list of both, not a crash
        const list = Array.isArray(prev) ? prev : prev === undefined ? [] : [prev];
        list.push(v);
        out[key] = list;
      } else {
        const obj = prev && typeof prev === "object" && !Array.isArray(prev) ? (prev as Record<string, unknown>) : {};
        obj[inner] = v;
        out[key] = obj;
      }
    } else if (unsafeKeys.has(rawKey)) {
      continue;
    } else if (Object.hasOwn(out, rawKey)) {
      const prev = out[rawKey];
      out[rawKey] = Array.isArray(prev) ? [...prev, v] : [prev, v];
    } else {
      out[rawKey] = v;
    }
  }
  return out;
}

export async function readBody(req: Request): Promise<{ body: Record<string, unknown>; form: FormData | null }> {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "DELETE") return { body: {}, form: null };
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data")) {
    const form = await req.formData();
    return { body: formToObject(form.entries()), form };
  }
  const text = await req.text();
  if (!text.trim()) return { body: {}, form: null };
  if (type.includes("application/x-www-form-urlencoded") || (!type.includes("json") && !/^\s*[{[]/.test(text))) {
    return { body: formToObject(new URLSearchParams(text).entries()), form: null };
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new ApiError("invalid_request", "The body should be a JSON object.");
    return { body: parsed as Record<string, unknown>, form: null };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("invalid_request", "The body isn't valid JSON.");
  }
}

export function queryObject(url: URL) {
  return formToObject(url.searchParams.entries());
}

/* Schema helpers: every field may arrive as a string from a form or query */

/** Dollars, e.g. 185 or 185.50. */
export const money = () =>
  z.coerce
    .number({ error: "Use a number of dollars, like 185 or 185.50." })
    .min(0)
    .max(100_000)
    .transform((n) => Math.round(n * 100) / 100);

export const flag = () =>
  z.union([
    z.boolean(),
    z.enum(["true", "false", "1", "0", "yes", "no", "on", "off"]).transform((v) => ["true", "1", "yes", "on"].includes(v)),
  ]);

export const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const idParam = z.string().min(1).max(64);

/** A string or an array of strings, from JSON, `a[]=` or a comma list. */
export const stringList = (max = 50) =>
  z
    .union([z.array(z.string()), z.string()])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(2000)).max(max));

export const pagination = {
  limit: int(1, 100).default(25).describe("How many to return, 1 to 100. Default 25."),
  offset: int(0, 100_000).default(0).describe("How many to skip, for the next page."),
};

/** A page of a list, Stripe style. */
export function page<T>(all: T[], q: { limit: number; offset: number }) {
  const data = all.slice(q.offset, q.offset + q.limit);
  return { object: "list" as const, data, total: all.length, has_more: q.offset + data.length < all.length };
}
