import { z } from "zod";

/*
 * Request samples and parameter tables for the API reference, made from each
 * route's own schema and example, so the docs show exactly what the API takes.
 */

export type RouteLike = {
  method: string;
  path: string;
  access: "public" | "key";
  query?: z.ZodType;
  body?: z.ZodType;
  multipart?: boolean;
  example?: { body?: Record<string, unknown>; query?: string; path?: string; response: unknown };
};

export type Param = {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
};

type Json = {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  anyOf?: Json[];
  oneOf?: Json[];
  items?: Json;
  properties?: Record<string, Json>;
  required?: string[];
  description?: string;
  default?: unknown;
  additionalProperties?: Json | boolean;
  format?: string;
};

function typeLabel(s: Json): string {
  const options = s.anyOf ?? s.oneOf;
  if (options) {
    const real = options.filter((o) => o.type !== "null");
    if (real.some((o) => o.type === "boolean")) return "boolean";
    const arr = real.find((o) => o.type === "array");
    if (arr) return `${typeLabel(arr.items ?? {})}[]`;
    const labels = [...new Set(real.map(typeLabel))];
    return labels.join(" or ");
  }
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (s.const !== undefined) return JSON.stringify(s.const);
  if (s.type === "array") return `${typeLabel(s.items ?? {})}[]`;
  if (s.type === "object") return s.properties ? "object" : "object (map)";
  if (s.type === "integer") return "integer";
  if (Array.isArray(s.type)) return s.type.filter((t) => t !== "null").join(" or ");
  return s.type ?? "any";
}

export function params(schema: z.ZodType | undefined): Param[] {
  if (!schema) return [];
  let json: Json;
  try {
    json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Json;
  } catch {
    return [];
  }
  return Object.entries(json.properties ?? {}).map(([name, s]) => ({
    name,
    type: typeLabel(s),
    required: !!json.required?.includes(name) && s.default === undefined,
    description: s.description ?? (s.anyOf ?? []).find((o) => o.description)?.description,
    defaultValue: s.default !== undefined ? JSON.stringify(s.default) : undefined,
  }));
}

const flat = (body: Record<string, unknown>) =>
  Object.values(body).every((v) => v === null || ["string", "number", "boolean"].includes(typeof v));

function indent(text: string, by: string) {
  return text.split("\n").map((l, i) => (i === 0 ? l : by + l)).join("\n");
}

function shellQuote(value: string) {
  return /^[\w.,:/@%+=-]+$/.test(value) ? value : `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

export function samples(route: RouteLike, baseUrl: string) {
  const path = route.example?.path ?? route.path;
  const url = `${baseUrl}${path}${route.example?.query ? `?${route.example.query}` : ""}`;
  const body = route.example?.body;
  const auth = route.access === "key";
  const hasBody = route.method !== "GET" && route.method !== "DELETE";

  // curl
  const lines = [`curl ${route.method === "GET" || (route.method === "POST" && body) ? "" : `-X ${route.method} `}${url}`];
  if (auth) lines.push(`-H "Authorization: Bearer $RESELL_KEY"`);
  if (hasBody && body) {
    if (flat(body)) {
      for (const [k, v] of Object.entries(body)) lines.push(`-d ${k}=${shellQuote(String(v))}`);
    } else {
      lines.push(`-H "Content-Type: application/json"`);
      lines.push(`-d '${indent(JSON.stringify(body, null, 2), "  ")}'`);
    }
  }
  const curl = lines.join(" \\\n  ");

  // JavaScript
  const jsHeaders = [
    ...(auth ? ["Authorization: `Bearer ${process.env.RESELL_KEY}`"] : []),
    ...(hasBody && body ? [`"Content-Type": "application/json"`] : []),
  ];
  const jsOpts = [
    ...(route.method !== "GET" ? [`method: "${route.method}"`] : []),
    ...(jsHeaders.length ? [`headers: { ${jsHeaders.join(", ")} }`] : []),
    ...(hasBody && body ? [`body: JSON.stringify(${indent(JSON.stringify(body, null, 2), "  ")})`] : []),
  ];
  const js = `const res = await fetch("${url}"${jsOpts.length ? `, {\n  ${jsOpts.join(",\n  ")},\n}` : ""});\nconst data = await res.json();`;

  // Python
  const pyArgs = [
    `"${url}"`,
    ...(auth ? [`headers={"Authorization": f"Bearer {os.environ['RESELL_KEY']}"}`] : []),
    ...(hasBody && body ? [`json=${indent(JSON.stringify(body, null, 4).replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\bnull\b/g, "None"), "")}`] : []),
  ];
  const py = `import os, requests\n\nres = requests.${route.method.toLowerCase()}(\n    ${pyArgs.map((a) => indent(a, "    ")).join(",\n    ")},\n)\ndata = res.json()`;

  return [
    { lang: "curl", label: "curl", code: curl },
    { lang: "js", label: "JavaScript", code: js },
    { lang: "python", label: "Python", code: py },
  ];
}

export function anchorFor(route: { method: string; path: string }) {
  return `${route.method.toLowerCase()}-${route.path.replace(/[/:.]+/g, "-").replace(/^-|-$/g, "")}`;
}
