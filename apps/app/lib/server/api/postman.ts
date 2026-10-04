import "server-only";
import { z } from "zod";
import { apiUrl } from "../../urls";
import type { RouteDef } from "./router";

/*
 * The API as a Postman collection (v2.1), served at /v1/postman.json and
 * downloaded from /tools/api. One folder per docs group, one request per
 * route, the docs example as the body. The key lives in the {{apiKey}}
 * collection variable, sent as a Bearer token by every request.
 */

type Schema = { type?: string | string[]; description?: string; default?: unknown; properties?: Record<string, Schema>; required?: string[] };

function schemaOf(s: z.ZodType | undefined): Schema | undefined {
  if (!s) return undefined;
  try {
    return z.toJSONSchema(s, { io: "input", unrepresentable: "any" }) as Schema;
  } catch {
    return undefined;
  }
}

/** A starting body when the route has no example: its required fields, blank. */
function skeleton(schema: Schema | undefined) {
  const out: Record<string, unknown> = {};
  for (const name of schema?.required ?? []) {
    const p = schema?.properties?.[name];
    const type = Array.isArray(p?.type) ? p.type[0] : p?.type;
    out[name] = p?.default ?? (type === "number" || type === "integer" ? 0 : type === "boolean" ? false : type === "array" ? [] : type === "object" ? {} : "");
  }
  return out;
}

function request(r: RouteDef) {
  const segments = r.path.split("/").filter(Boolean);
  const variables = segments.filter((s) => s.startsWith(":")).map((s) => ({ key: s.slice(1), value: "", description: `The ${s.slice(1)}.` }));

  const example = new URLSearchParams(r.example?.query ?? "");
  const query = schemaOf(r.query);
  const params = [
    ...[...example].map(([key, value]) => ({ key, value, description: query?.properties?.[key]?.description })),
    ...Object.entries(query?.properties ?? {})
      .filter(([key]) => !example.has(key))
      .map(([key, p]) => ({ key, value: "", description: p.description, disabled: true })),
  ];
  const qs = example.toString();
  const raw = `{{baseUrl}}${r.path}${qs ? `?${qs}` : ""}`;

  const body = r.multipart
    ? { mode: "formdata", formdata: [{ key: "file", type: "file", src: [] }] }
    : r.body
      ? {
          mode: "raw",
          raw: JSON.stringify(r.example?.body ?? skeleton(schemaOf(r.body)), null, 2),
          options: { raw: { language: "json" } },
        }
      : undefined;

  return {
    name: r.summary,
    request: {
      method: r.method,
      header: body?.mode === "raw" ? [{ key: "Content-Type", value: "application/json" }] : [],
      url: {
        raw,
        host: ["{{baseUrl}}"],
        path: segments,
        ...(params.length ? { query: params } : {}),
        ...(variables.length ? { variable: variables } : {}),
      },
      ...(body ? { body } : {}),
      description: [r.description, r.scope ? `Needs the \`${r.scope}\` scope.` : null].filter(Boolean).join("\n\n"),
    },
    ...(r.example?.response
      ? {
          response: [
            {
              name: "Example",
              originalRequest: { method: r.method, url: raw },
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: JSON.stringify(r.example.response, null, 2),
            },
          ],
        }
      : {}),
  };
}

export function postmanCollection(routes: RouteDef[], opts: { apiKey?: string } = {}) {
  const groups = new Map<string, RouteDef[]>();
  for (const r of routes) {
    if (r.path === "/openapi.json" || r.path === "/postman.json") continue;
    groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
  }
  return {
    info: {
      // A fixed id, so importing again replaces the collection instead of adding a second one.
      _postman_id: "5e11e5a0-7e5e-4a1e-9b0c-000000000001",
      name: "resell.store API",
      description:
        "Everything you can do in resell.store, your code can do too.\n\nSet the `apiKey` variable to your secret key from resell.store/tools/api. Docs: https://docs.resell.store/api",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    auth: { type: "bearer", bearer: [{ key: "token", value: "{{apiKey}}", type: "string" }] },
    variable: [
      { key: "baseUrl", value: apiUrl(), type: "string" },
      { key: "apiKey", value: opts.apiKey ?? "", type: "secret" },
    ],
    item: [...groups].map(([name, rs]) => ({ name, item: rs.map(request) })),
  };
}
