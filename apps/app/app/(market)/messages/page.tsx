import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";
import { EmptyState } from "../../../components/empty-state";
import { SiteLink } from "../../../components/market/links";
import { pillLink } from "../../../components/market/parts";
import { Conversation } from "../../../components/messages/conversation";
import { ThreadRow } from "../../../components/messages/thread-list";
import { aiConfigured } from "../../../lib/server/ai";
import { publicViewer } from "../../../lib/server/market";
import { findThread, listBuyerThreads, loadThread, resolveRecipient } from "../../../lib/server/messages";
import { signInHref } from "../../../lib/safe-next";
import { storeUrl } from "../../../lib/urls";

export const metadata: Metadata = { title: "Messages · resell.store" };

type Search = { t?: string; to?: string; about?: string };

/*
 * P6 Messages: the buyer's conversations with shops. ?t=<thread> opens one;
 * ?to=<shop slug>&about=<listing id> (from "Ask a question" and "Message the
 * seller") opens the existing thread with that shop about that thing, or a
 * fresh one that's created when the first message is sent.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const viewer = await publicViewer();
  if (!viewer) return <SignedOut search={search} />;

  const threads = await listBuyerThreads(viewer.id);

  // Writing to a shop: their thread about this, if there is one, else a draft
  let draft: Awaited<ReturnType<typeof resolveRecipient>> = null;
  if (search.to) {
    draft = await resolveRecipient({ buyerId: viewer.id, shopSlug: search.to, listingId: search.about });
    if (draft) {
      const existing = await findThread({ buyerId: viewer.id, shopId: draft.shop.id, listingId: draft.about?.id ?? null });
      if (existing) redirect(`/messages?t=${existing.id}`);
    }
  }

  const open = search.t ? await loadThread(search.t, viewer.id) : null;
  if (search.t && (!open || open.side !== "buyer")) redirect("/messages");

  const active = !!(open || draft);
  if (!threads.length && !draft) return <NoMessages firstName={viewer.firstName} />;

  let pane: React.ReactNode;
  if (open) {
    const { summary } = open;
    pane = (
      <Conversation
        key={summary.id}
        tone="public"
        threadId={summary.id}
        messages={open.messages}
        title={summary.listing?.title ?? summary.shop.name}
        subtitle={summary.listing ? summary.shop.name : "Message the shop"}
        href={storeUrl(summary.shop.slug, summary.listing?.slug ? `/${summary.listing.slug}` : "/")}
        photo={summary.listing?.photo}
        initial={summary.initial}
        otherName={summary.shop.name}
        backHref="/messages"
        agent={{ on: open.agentOn, name: `${open.owner}'s assistant`, owner: open.owner }}
      />
    );
  } else if (draft) {
    pane = (
      <Conversation
        key={`draft-${draft.shop.id}-${draft.about?.id ?? ""}`}
        tone="public"
        threadId={null}
        draft={{ shopSlug: draft.shop.slug, listingId: draft.about?.id ?? null }}
        messages={[]}
        title={draft.about?.title ?? draft.shop.name}
        subtitle={draft.about ? draft.shop.name : `Write to ${draft.owner}`}
        href={storeUrl(draft.shop.slug, draft.about?.slug ? `/${draft.about.slug}` : "/")}
        photo={draft.about?.photo}
        initial={draft.shop.name[0]!.toUpperCase()}
        otherName={draft.owner}
        backHref="/messages"
        placeholder={draft.about ? `Ask ${draft.owner} about it` : `Message ${draft.owner}`}
        agent={{ on: draft.shop.answerQuestions && aiConfigured, name: `${draft.owner}'s assistant`, owner: draft.owner }}
      />
    );
  } else {
    pane = (
      <div className="m-auto max-w-[360px] px-6 text-center text-public-text-muted">
        Pick a conversation to read it. New ones start from &ldquo;Ask a question&rdquo; on anything for sale.
      </div>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-69px)] w-full max-w-[1440px] desk:h-[calc(100dvh-77px)] desk:gap-6 desk:px-16 desk:py-6">
      <nav
        aria-label="Conversations"
        className={cn(
          "w-full flex-col gap-1 overflow-y-auto px-3 py-4 desk:flex desk:w-[340px] desk:shrink-0 desk:rounded-xl desk:border desk:border-public-border xl:w-[380px]",
          active ? "hidden" : "flex",
        )}
      >
        <h1 className="px-3 pb-2 font-display text-2xl font-extrabold tracking-tight">Messages</h1>
        {draft && !open && (
          <div className="rounded-lg bg-public-photo p-3 text-sm">
            <span className="font-bold">New message</span> to {draft.shop.name}
          </div>
        )}
        {threads.map((t) => (
          <ThreadRow key={t.id} item={t} href={`/messages?t=${t.id}`} active={t.id === open?.summary.id} tone="public" />
        ))}
      </nav>
      <div
        className={cn(
          "min-w-0 flex-1 flex-col overflow-hidden desk:flex desk:rounded-xl desk:border desk:border-public-border",
          active ? "flex" : "hidden",
        )}
      >
        {pane}
      </div>
    </main>
  );
}

function SignedOut({ search }: { search: Search }) {
  // Back to the same place after signing in, shop and listing included
  const qs = new URLSearchParams(Object.entries(search).filter(([, v]) => typeof v === "string") as [string, string][]);
  const back = qs.size ? `/messages?${qs}` : "/messages";
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-4 desk:px-16">
      <EmptyState
        surface="public"
        size="lg"
        art="messages"
        tone="pink"
        title={search.to ? "Sign in to send a message" : "Sign in to see your messages"}
        actions={
          <>
            <SiteLink href={signInHref(back)} className={pillLink.primary}>
              Sign in
            </SiteLink>
            <SiteLink href="/discover" className={pillLink.outline}>
              Keep browsing
            </SiteLink>
          </>
        }
        footnote="No password. We email you a link."
      >
        Your questions to sellers, and their answers, live here once you&apos;re signed in.
      </EmptyState>
    </main>
  );
}

function NoMessages({ firstName }: { firstName: string }) {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-4 desk:px-16">
      <EmptyState
        surface="public"
        size="lg"
        art="messages"
        tone="pink"
        sticker="Say hi"
        title={`No messages yet, ${firstName}`}
        actions={
          <SiteLink href="/discover" className={pillLink.primary}>
            Find something
          </SiteLink>
        }
        footnote="Offers you make show up in your account."
      >
        Tap &ldquo;Ask a question&rdquo; on anything for sale, or message a shop from its page. The conversation
        lives here.
      </EmptyState>
    </main>
  );
}
