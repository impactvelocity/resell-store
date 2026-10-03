import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../../test/db";
import { createFile } from "../../test/factories-market";
import { fileIdFromUrl, isFetchableRemote, ogPhoto, sniffImageType } from "./og-photos";

/* Photos for share images: only what Satori can draw, only from places we trust. */

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const GIF = Buffer.from("GIF89a....");
const WEBP = Buffer.from("RIFF\0\0\0\0WEBPVP8 ");

describe("sniffImageType", () => {
  it("knows JPEG, PNG and GIF by their bytes", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(GIF)).toBe("image/gif");
  });

  it("refuses what Satori can't draw", () => {
    expect(sniffImageType(WEBP)).toBeNull();
    expect(sniffImageType(Buffer.from("<html>"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("fileIdFromUrl", () => {
  const id = "0b7c1f0e-8d1a-4c3e-9f55-3a9b8c7d6e5f";
  it("finds the upload id in relative and absolute /api/files URLs", () => {
    expect(fileIdFromUrl(`/api/files/${id}`)).toBe(id);
    expect(fileIdFromUrl(`http://maya.localhost:5689/api/files/${id}?v=2`)).toBe(id);
    expect(fileIdFromUrl("/api/files/not-an-id")).toBeNull();
    expect(fileIdFromUrl(`/api/files/${id}/../secret`)).toBeNull();
  });
});

describe("isFetchableRemote", () => {
  it("allows https on a public hostname", () => {
    expect(isFetchableRemote("https://cdn.example.com/a.jpg")).toBe(true);
  });

  it("refuses http, IP literals, localhost, internal names and credentials", () => {
    for (const url of [
      "http://cdn.example.com/a.jpg",
      "https://127.0.0.1/a.jpg",
      "https://169.254.169.254/latest",
      "https://[::1]/a.jpg",
      "https://localhost/a.jpg",
      "https://maya.localhost/a.jpg",
      "https://db.internal/a.jpg",
      "https://printer.local/a.jpg",
      "https://user:pw@cdn.example.com/a.jpg",
      "/api/files/x",
      "data:image/png;base64,AAAA",
    ]) {
      expect(isFetchableRemote(url), url).toBe(false);
    }
  });
});

describe("ogPhoto", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads an upload from storage as a data URL", async () => {
    const f = await createFile(null, { data: JPEG, size: JPEG.length });
    expect(await ogPhoto(`/api/files/${f.id}`)).toBe(`data:image/jpeg;base64,${JPEG.toString("base64")}`);
  });

  it("is null for a WebP upload, a missing upload or no URL", async () => {
    const f = await createFile(null, { data: WEBP, size: WEBP.length, contentType: "image/webp" });
    expect(await ogPhoto(`/api/files/${f.id}`)).toBeNull();
    expect(await ogPhoto("/api/files/0b7c1f0e-8d1a-4c3e-9f55-3a9b8c7d6e5f")).toBeNull();
    expect(await ogPhoto(null)).toBeNull();
  });

  it("fetches an https web picture, refusing redirects", async () => {
    const fetch = vi.fn(async () => new Response(PNG));
    vi.stubGlobal("fetch", fetch);
    expect(await ogPhoto("https://cdn.example.com/a.png")).toBe(`data:image/png;base64,${PNG.toString("base64")}`);
    expect(fetch).toHaveBeenCalledWith("https://cdn.example.com/a.png", expect.objectContaining({ redirect: "error" }));
  });

  it("never fetches an internal address, and is null when a fetch fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = vi.fn(async () => { throw new Error("down"); });
    vi.stubGlobal("fetch", fetch);
    expect(await ogPhoto("https://169.254.169.254/latest/meta-data")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(await ogPhoto("https://cdn.example.com/a.png")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("missing", { status: 404 })));
    expect(await ogPhoto("https://cdn.example.com/b.png")).toBeNull();
    error.mockRestore();
  });
});
