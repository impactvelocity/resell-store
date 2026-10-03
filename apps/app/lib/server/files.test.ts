import { beforeEach, describe, expect, it } from "vitest";
import { db, eq, file } from "@repo/db";
import { resetDb } from "../../test/db";
import { createUser } from "../../test/factories";
import {
  deleteFiles,
  fileIdsOwnedBy,
  fileUrl,
  openFile,
  r2Configured,
  readFile,
  readFileBytes,
  saveUpload,
  UploadError,
} from "./files";

/*
 * Uploads without R2 (the R2_* env is blank in tests): bytes live in the
 * file row, and every reader serves them from there.
 */

beforeEach(async () => {
  await resetDb();
});

const upload = (body: string | Uint8Array<ArrayBuffer>, type: string, name = "photo") => new File([body], name, { type });

describe("saveUpload", () => {
  it("keeps the bytes in Postgres when there's no R2", async () => {
    expect(r2Configured).toBe(false);
    const me = await createUser();
    const saved = await saveUpload(upload("jpeg-bytes", "image/jpeg"), me.id);

    expect(saved).toEqual({ id: saved.id, url: `/api/files/${saved.id}`, isVideo: false });
    const [row] = await db.select().from(file).where(eq(file.id, saved.id));
    expect(row).toMatchObject({ ownerId: me.id, contentType: "image/jpeg", size: 10, storageKey: null });
    expect(row!.data!.toString()).toBe("jpeg-bytes");
  });

  it("knows a video", async () => {
    const me = await createUser();
    expect((await saveUpload(upload("mp4", "video/mp4"), me.id)).isVideo).toBe(true);
  });

  it("turns away anything that isn't a photo or video", async () => {
    const me = await createUser();
    await expect(saveUpload(upload("%PDF", "application/pdf"), me.id)).rejects.toThrow(UploadError);
    await expect(saveUpload(upload("%PDF", "application/pdf"), me.id)).rejects.toThrow("That isn't a photo or a video.");
    expect(await db.select().from(file)).toHaveLength(0);
  });

  it("caps photos at 10 MB and videos at 40 MB", async () => {
    const me = await createUser();
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    await expect(saveUpload(upload(big, "image/png"), me.id)).rejects.toThrow("Photos can be up to 10 MB.");
    // The same size is fine for a video
    expect((await saveUpload(upload(big, "video/mp4"), me.id)).isVideo).toBe(true);
    const huge = new Uint8Array(40 * 1024 * 1024 + 1);
    await expect(saveUpload(upload(huge, "video/mp4"), me.id)).rejects.toThrow("Videos can be up to 40 MB.");
  });
});

describe("reading files", () => {
  it("reads the row, the bytes, and opens it for /api/files", async () => {
    const me = await createUser();
    const { id } = await saveUpload(upload("png-bytes", "image/png"), me.id);

    expect((await readFile(id))!.contentType).toBe("image/png");
    const bytes = await readFileBytes(id);
    expect(bytes!.contentType).toBe("image/png");
    expect(bytes!.data.toString()).toBe("png-bytes");

    const opened = await openFile(id);
    expect(opened!.kind).toBe("bytes");
    expect(Buffer.from(opened!.body as Uint8Array).toString()).toBe("png-bytes");
  });

  it("is null for an unknown id", async () => {
    expect(await readFile("nope")).toBeNull();
    expect(await readFileBytes("nope")).toBeNull();
    expect(await openFile("nope")).toBeNull();
  });

  it("is null for a file that lives in R2 when R2 isn't set up here", async () => {
    const [row] = await db
      .insert(file)
      .values({ contentType: "image/jpeg", size: 3, storageKey: "uploads/u/x.jpg" })
      .returning();
    expect(await readFileBytes(row!.id)).toBeNull();
    expect(await openFile(row!.id)).toBeNull();
  });
});

describe("deleteFiles and fileIdsOwnedBy", () => {
  it("lists what someone uploaded and deletes just the ids given", async () => {
    const me = await createUser();
    const other = await createUser();
    const a = await saveUpload(upload("a", "image/jpeg"), me.id);
    const b = await saveUpload(upload("b", "image/jpeg"), me.id);
    const theirs = await saveUpload(upload("c", "image/jpeg"), other.id);

    expect((await fileIdsOwnedBy(me.id)).sort()).toEqual([a.id, b.id].sort());

    await deleteFiles([a.id]);
    expect(await fileIdsOwnedBy(me.id)).toEqual([b.id]);
    expect(await readFile(theirs.id)).not.toBeNull();
  });

  it("does nothing with no ids", async () => {
    await expect(deleteFiles([])).resolves.toBeUndefined();
  });
});

describe("fileUrl", () => {
  it("is relative, so it works on the marketplace and every store host", () => {
    expect(fileUrl("abc")).toBe("/api/files/abc");
  });
});
