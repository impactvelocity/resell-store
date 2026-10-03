import "server-only";
import { readFileBytes } from "./files";

/*
 * Photos for the share images. Satori can't fetch relative URLs, so uploads
 * (/api/files/{id}) are read straight from storage and web pictures fetched
 * over https, then passed in as data URLs. Satori only draws PNG, JPEG and
 * GIF, so anything else (WebP, HEIC, AVIF) or any failure gives null and the
 * card draws a tone-coloured tile with the item's initial instead.
 */

const PHOTO_TIMEOUT_MS = 4000;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** The kinds of image Satori can draw, by their first bytes. */
export function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/gif" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b))
    return "image/png";
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38)
    return "image/gif";
  return null;
}

/** The upload id in an /api/files/{id} URL (relative or on any of our hosts). */
export function fileIdFromUrl(url: string) {
  return url.match(/^(?:https?:\/\/[^/]+)?\/api\/files\/([0-9a-f-]{36})(?:[?#].*)?$/i)?.[1] ?? null;
}

/**
 * Web pictures worth fetching from the server: https only, never an IP
 * literal, localhost or an internal name, so a photo URL can't point the
 * image route at something on our own network.
 */
export function isFetchableRemote(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal"))
    return false;
  // IPv4 literal or bracketed IPv6
  if (/^\d+(\.\d+){3}$/.test(host) || host.startsWith("[")) return false;
  return true;
}

function toDataUrl(bytes: Uint8Array) {
  const type = sniffImageType(bytes);
  return type ? `data:${type};base64,${Buffer.from(bytes).toString("base64")}` : null;
}

/** A photo URL as a data URL Satori can draw, or null (unknown, unsupported or unreachable). */
export async function ogPhoto(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const id = fileIdFromUrl(url);
    if (id) {
      const file = await readFileBytes(id);
      if (!file || file.data.length > MAX_PHOTO_BYTES) return null;
      return toDataUrl(new Uint8Array(file.data));
    }
    if (!isFetchableRemote(url)) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS), redirect: "error" });
    if (!res.ok) return null;
    if (Number(res.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return bytes.length > MAX_PHOTO_BYTES ? null : toDataUrl(bytes);
  } catch (error) {
    console.error("Share image photo unavailable", url, error);
    return null;
  }
}
