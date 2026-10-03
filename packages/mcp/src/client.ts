/*
 * A small client for the resell.store REST API (docs.resell.store/api). The
 * MCP tools only ever talk to the shop through this, so anything they can do,
 * a script with the same key can do too.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ClientOptions = {
  /** e.g. https://api.resell.store/v1 */
  baseUrl: string;
  /** A secret key (rs_live_…) or an agent link token. Optional for public calls. */
  token?: string | null;
  /** Swap in another fetch, e.g. to call the API in-process. */
  fetch?: FetchLike;
  userAgent?: string;
  /** Sent with every request, e.g. which app and tool it's for (the owner's activity log reads them). */
  headers?: Record<string, string>;
};

/** The API's error envelope, as a throwable. `message` is a plain sentence. */
export class ResellApiError extends Error {
  constructor(
    readonly status: number,
    readonly type: string,
    message: string,
    readonly param?: string,
  ) {
    super(message);
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export type Account = {
  id: string;
  name: string;
  email: string;
  key: { kind: "api" | "agent"; scopes: string[]; ask_first: string[]; max_offer?: number | null };
  shops: { slug: string; name: string; url: string }[];
};

export class ResellClient {
  readonly baseUrl: string;
  readonly hasToken: boolean;
  private readonly token: string | null;
  private readonly doFetch: FetchLike;
  private readonly userAgent: string;
  private readonly opts: ClientOptions;

  constructor(opts: ClientOptions) {
    this.opts = opts;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.token = opts.token?.trim() || null;
    this.hasToken = !!this.token;
    this.doFetch = opts.fetch ?? ((input, init) => fetch(input, init));
    this.userAgent = opts.userAgent ?? "resell-mcp/0.1";
  }

  async request<T = unknown>(method: string, path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { ...this.opts.headers, accept: "application/json", "user-agent": this.userAgent };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.doFetch(url.toString(), { method, headers, body });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new ResellApiError(res.status, "server_error", `The API answered with something that isn't JSON (${res.status}).`);
    }
    if (!res.ok) {
      const e = (data as { error?: { type?: string; message?: string; param?: string } } | null)?.error;
      throw new ResellApiError(res.status, e?.type ?? "server_error", e?.message ?? `The API answered ${res.status}.`, e?.param);
    }
    return data as T;
  }

  get<T = unknown>(path: string, query?: Query) {
    return this.request<T>("GET", path, { query });
  }
  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("POST", path, { body: body ?? {} });
  }
  patch<T = unknown>(path: string, body: unknown) {
    return this.request<T>("PATCH", path, { body });
  }
  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, { body: body ?? {} });
  }
  delete<T = unknown>(path: string) {
    return this.request<T>("DELETE", path);
  }

  /** The same client, sending these headers too. */
  withHeaders(headers: Record<string, string>) {
    return new ResellClient({ ...this.opts, headers: { ...this.opts.headers, ...headers } });
  }

  /** Who the token belongs to and what it may do, or null without a token. */
  async account(): Promise<Account | null> {
    if (!this.token) return null;
    return this.get<Account>("/me");
  }
}

/** Path segments are ids and slugs from the model: keep them to one segment. */
export function seg(value: string) {
  const v = value.trim();
  // URLs resolve "." and ".." (photos/.. would be the listing itself), and "" drops the segment
  if (v === "" || v === "." || v === "..") throw new ResellApiError(400, "invalid_request", "That isn't a valid id.");
  return encodeURIComponent(v);
}
