"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { markRead, MessageError, sendMessage, startConversation } from "../../lib/server/messages";
import { getCurrentUser, type CurrentUser } from "../../lib/server/session";
import { assertDemoMayTrade, DemoBlockedError } from "../../lib/server/demo";

/* Messages between buyers and shops, from either side. */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; signin?: boolean };

async function run<T extends object>(fn: (userId: string, user: CurrentUser) => Promise<T>): Promise<Result<T>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first.", signin: true };
  try {
    const out = await fn(user.id, user);
    // Badges and lists on both sides: the inbox, messages, headers
    revalidatePath("/", "layout");
    return { ok: true, ...out };
  } catch (error) {
    if (error instanceof MessageError || error instanceof DemoBlockedError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, error: "Something in there doesn't look right." };
    console.error("Message action failed", error);
    return { ok: false, error: "That didn't send. Try again?" };
  }
}

const id = z.string().min(1).max(64);
const body = z.string().min(1).max(4000);

/** A buyer's first message to a shop, optionally about a listing. */
export async function startThread(input: { shopSlug: string; listingId?: string | null; body: string }) {
  return run(async (buyerId, user) => {
    const parsed = z.object({ shopSlug: z.string().min(1).max(80), listingId: id.nullish(), body }).parse(input);
    await assertDemoMayTrade(user, { shopSlug: parsed.shopSlug });
    const t = await startConversation({ buyerId, ...parsed });
    return { threadId: t.id };
  });
}

export async function reply(input: { threadId: string; body: string }) {
  return run(async (userId) => {
    const parsed = z.object({ threadId: id, body }).parse(input);
    const m = await sendMessage({ userId, ...parsed });
    return { messageId: m.id };
  });
}

/** Opening a conversation reads it. */
export async function readThread(input: { threadId: string }) {
  return run(async (userId) => {
    await markRead({ threadId: id.parse(input.threadId), userId });
    return {};
  });
}
