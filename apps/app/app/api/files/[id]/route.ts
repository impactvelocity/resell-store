import { openFile } from "../../../../lib/server/files";

const cacheForever = "public, max-age=31536000, immutable";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const opened = await openFile((await params).id);
  if (!opened) return new Response("Not found", { status: 404 });
  // The public bucket serves it from Cloudflare's edge; the redirect is cacheable too
  if (opened.kind === "redirect")
    return new Response(null, {
      status: 308,
      headers: { Location: opened.url, "Cache-Control": cacheForever },
    });
  // Files never change once uploaded
  return new Response(opened.body, {
    headers: {
      "Content-Type": opened.row.contentType,
      "Content-Length": String(opened.row.size),
      "Cache-Control": cacheForever,
    },
  });
}
