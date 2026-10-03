import "server-only";
import { headers } from "next/headers";
import { serviceFromHost } from "../urls";

/**
 * Where the docs live on this request: "" on docs.resell.store (proxy.ts
 * rewrites it onto /docs), "/docs" when reached through the marketplace.
 */
export async function docsBase() {
  const h = await headers();
  return serviceFromHost(h.get("host")) === "docs" ? "" : "/docs";
}
