import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadOgFonts, parseFontCss, resetOgFonts } from "./og-fonts";

/* Share image fonts: parsing Google's stylesheet, and falling back quietly when it's unreachable. */

const css = `
@font-face {
  font-family: 'Bricolage Grotesque';
  font-style: normal;
  font-weight: 800;
  src: url(https://fonts.gstatic.com/s/bricolage/a.ttf) format('truetype');
}
@font-face {
  font-family: 'Figtree';
  font-style: normal;
  font-weight: 500;
  src: url(https://fonts.gstatic.com/s/figtree/b.ttf) format('truetype');
}
@font-face {
  font-family: 'Figtree';
  font-weight: 700;
  src: url(https://fonts.gstatic.com/s/figtree/c.woff2) format('woff2');
}`;

describe("parseFontCss", () => {
  it("keeps TrueType faces with family, weight and URL; skips woff2", () => {
    expect(parseFontCss(css)).toEqual([
      { family: "Bricolage Grotesque", weight: 800, url: "https://fonts.gstatic.com/s/bricolage/a.ttf" },
      { family: "Figtree", weight: 500, url: "https://fonts.gstatic.com/s/figtree/b.ttf" },
    ]);
  });

  it("is empty for anything else", () => {
    expect(parseFontCss("<html>rate limited</html>")).toEqual([]);
  });
});

describe("loadOgFonts", () => {
  beforeEach(() => resetOgFonts());
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the stylesheet and each face once, then serves them from memory", async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes("googleapis") ? new Response(css) : new Response(new Uint8Array([1, 2, 3])),
    );
    vi.stubGlobal("fetch", fetch);
    const fonts = await loadOgFonts();
    expect(fonts.map((f) => [f.name, f.weight])).toEqual([
      ["Bricolage Grotesque", 800],
      ["Figtree", 500],
    ]);
    expect(fonts[0]!.data.byteLength).toBe(3);
    await loadOgFonts();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("gives [] when Google can't be reached, and tries again next time", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await loadOgFonts()).toEqual([]);
    expect(error).toHaveBeenCalled();

    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.includes("googleapis") ? new Response(css) : new Response(new Uint8Array([9])),
    ));
    expect(await loadOgFonts()).toHaveLength(2);
    error.mockRestore();
  });

  it("gives [] when a face fails to download", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.includes("googleapis") ? new Response(css) : new Response("nope", { status: 404 }),
    ));
    expect(await loadOgFonts()).toEqual([]);
    error.mockRestore();
  });
});
