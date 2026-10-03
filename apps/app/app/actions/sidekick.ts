"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createDraft } from "../../lib/server/listings";
import { runResearch, startResearch } from "../../lib/server/research";
import { getCurrentUser, requireUser } from "../../lib/server/session";
import { listOwnedShops } from "../../lib/server/shops";
import { getCheck, removeCheck, setBought, SidekickError, startCheck } from "../../lib/server/sidekick";

/* D4 Shopping sidekick. Checks run in the background; the page polls while any are going. */

type Result = { ok: true } | { ok: false; error: string; signin?: boolean };

async function run(fn: (userId: string) => Promise<unknown>): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first.", signin: true };
  try {
    await fn(user.id);
    revalidatePath("/tools/sidekick");
    return { ok: true };
  } catch (error) {
    if (error instanceof SidekickError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, error: "Something in there doesn't look right." };
    console.error("Sidekick action failed", error);
    return { ok: false, error: "Something went wrong. Try again?" };
  }
}

const id = z.string().min(1).max(64);

export async function checkItem(query: string) {
  return run((userId) => startCheck(userId, z.string().max(500).parse(query)));
}

export async function markBought(checkId: string, bought: boolean) {
  return run((userId) => setBought(userId, id.parse(checkId), bought));
}

export async function forgetCheck(checkId: string) {
  return run((userId) => removeCheck(userId, id.parse(checkId)));
}

/** "List it": a draft in their first shop, researched from the check's name. */
export async function listFromCheck(checkId: string) {
  const user = await requireUser();
  const check = await getCheck(user.id, id.parse(checkId));
  const [shop] = await listOwnedShops(user.id);
  if (!check || !shop) redirect("/list/new");
  const draft = await createDraft({ shopId: shop.id, prompt: check.name ?? check.query });
  const started = await startResearch(draft.id);
  if (started.started) after(() => runResearch(started.id));
  redirect(`/list/${draft.id}/research`);
}
