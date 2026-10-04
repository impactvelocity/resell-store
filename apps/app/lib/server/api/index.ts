import "server-only";
import { z } from "zod";
import { apiUrl } from "../../urls";
import { postmanCollection } from "./postman";
import { createRouter, route, type RouteDef } from "./router";
import { accountRoutes } from "./routes/account";
import { afterSaleRoutes } from "./routes/after-sale";
import { offerRoutes, orderRoutes } from "./routes/commerce";
import { listingRoutes } from "./routes/listings";
import { marketRoutes } from "./routes/market";
import { messageRoutes } from "./routes/messages";
import { reviewRoutes } from "./routes/reviews";
import { shopRoutes } from "./routes/shops";
import { statsRoutes } from "./routes/stats";
import { webhookRoutes } from "./routes/webhooks";

/*
 * The public API, v1. Served at /api/v1/* on the marketplace and at
 * api.resell.store/v1/* (proxy.ts rewrites that host here). The docs site
 * (app/docs) and the MCP servers read the same route list.
 */

const openapiRoute = route({
  method: "GET",
  path: "/openapi.json",
  group: "Account",
  access: "public",
  summary: "OpenAPI description",
  description: "This API as an OpenAPI 3.1 document, for code generators and API tools.",
  handler: async () => openapi(),
});

const postmanRoute = route({
  method: "GET",
  path: "/postman.json",
  group: "Account",
  access: "public",
  summary: "Postman collection",
  description: "This API as a Postman collection. In Postman, choose Import and paste this address.",
  handler: async () => postmanCollection(apiRoutes),
});

export const apiRoutes: RouteDef[] = [
  ...accountRoutes,
  ...shopRoutes,
  ...listingRoutes,
  ...offerRoutes,
  ...orderRoutes,
  ...afterSaleRoutes,
  ...reviewRoutes,
  ...messageRoutes,
  ...statsRoutes,
  ...webhookRoutes,
  ...marketRoutes,
  openapiRoute,
  postmanRoute,
];

export const handleApiRequest = createRouter(apiRoutes);

function jsonSchema(schema: z.ZodType | undefined) {
  if (!schema) return undefined;
  try {
    return z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  } catch {
    return { type: "object" };
  }
}

export function openapi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of apiRoutes) {
    const path = r.path.replace(/:([A-Za-z]+)/g, "{$1}");
    const params = [...r.path.matchAll(/:([A-Za-z]+)/g)].map((m) => ({
      name: m[1],
      in: "path",
      required: true,
      schema: { type: "string" },
    }));
    const query = jsonSchema(r.query) as { properties?: Record<string, { description?: string }>; required?: string[] } | undefined;
    for (const [name, schema] of Object.entries(query?.properties ?? {})) {
      params.push({ name, in: "query", required: !!query?.required?.includes(name), schema: schema as never, ...(schema.description ? { description: schema.description } : {}) } as never);
    }
    paths[path] ??= {};
    paths[path][r.method.toLowerCase()] = {
      operationId: `${r.method.toLowerCase()}_${r.path.replace(/[/:.-]+/g, "_").replace(/^_|_$/g, "")}`,
      summary: r.summary,
      description: r.description,
      tags: [r.group],
      security: r.access === "public" ? [{}, { bearer: [] }] : [{ bearer: [] }],
      ...(r.scope ? { "x-scope": r.scope } : {}),
      parameters: params,
      ...(r.body
        ? {
            requestBody: {
              content: {
                "application/json": { schema: jsonSchema(r.body), ...(r.example?.body ? { example: r.example.body } : {}) },
                "application/x-www-form-urlencoded": { schema: jsonSchema(r.body) },
                ...(r.multipart ? { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } } : {}),
              },
            },
          }
        : {}),
      responses: {
        "200": {
          description: "OK",
          ...(r.example?.response ? { content: { "application/json": { example: r.example.response } } } : {}),
        },
        default: {
          description: "An error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "object",
                    properties: { type: { type: "string" }, message: { type: "string" }, param: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "resell.store API",
      version: "1",
      description: "Everything you can do in resell.store, your code can do too. Docs: https://docs.resell.store/api",
    },
    servers: [{ url: apiUrl() }],
    components: { securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "Your secret key (rs_live_…) or agent link token." } } },
    paths,
  };
}
