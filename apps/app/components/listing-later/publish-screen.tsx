"use client";

import Link from "next/link";
import { Button } from "@repo/ui/button";
import { ArrowUpRightIcon } from "@repo/ui/icons";
import { AgentMessage, Thread } from "../agent-chat/agent-chat";
import { CanvasHeader } from "../workspace/listing-panel";
import { ListingWorkspace } from "../workspace/listing-workspace";
import { draftListing } from "../../lib/mock";
import { listingLink, listingShop, replies } from "../../lib/mock-listing-later";
import { EarlierCards } from "./earlier-cards";
import { LiveWorkspace } from "./live-workspace";
import { PromiseCard, PublishCard, ShareKit } from "./publish-cards";
import { useListing } from "./store";
import { useAgentChat } from "./use-agent-chat";

/* C7 Listing / Publish and share. Publishing waits for the person's tap. */

const id = draftListing.id;
const elsewhereHref = `/list/${id}/publish?view=elsewhere`;

function ElsewhereButton({ className }: { className?: string }) {
  return (
    <Button
      render={<Link href={elsewhereHref} />}
      nativeButton={false}
      className={className}
    >
      List it in more places
    </Button>
  );
}

export function PublishScreen() {
  const listing = useListing();
  const chat = useAgentChat(replies.publish);
  const { published } = listing;

  const onPublished = () =>
    chat.reply(
      {
        thinking: "Putting it live",
        text: `It's live at ${listingLink}. Your share kit is ready: post a picture, print the QR code, or just send the link. Want it in more places too?`,
        after: (
          <Link
            href={elsewhereHref}
            className="flex h-10 items-center gap-1.5 rounded-md bg-primary-soft px-3.5 text-sm font-semibold transition-colors hover:bg-lemon-300"
          >
            List it in more places
            <ArrowUpRightIcon size={16} />
          </Link>
        ),
      },
      600,
    );

  const thread = (
    <Thread>
      <AgentMessage>
        That&apos;s everything. Pick who can see it and I&apos;ll put it live.
      </AgentMessage>

      {/* Desktop: the promise sits in the chat */}
      <PromiseCard className="hidden desk:flex" />

      {/* Phone: everything sits in the chat */}
      <div className="flex flex-col gap-4 desk:hidden">
        <PublishCard onPublished={onPublished} />
        <PromiseCard />
        <ShareKit />
        {published && <ElsewhereButton className="w-full" />}
      </div>

      {chat.thread}
    </Thread>
  );

  const canvas = (
    <>
      <CanvasHeader
        title={published ? "It's live" : "Ready to go live"}
        description="You can change all of this after it's published."
        filled={12}
      />
      <div className="flex flex-col items-start gap-4 xl:flex-row">
        <div className="flex w-full flex-col gap-4 xl:flex-[1.2]">
          <PublishCard onPublished={onPublished} />
          {published && <ElsewhereButton className="w-full" />}
        </div>
        <ShareKit className="xl:flex-1" />
      </div>
      <EarlierCards showPhotos />
    </>
  );

  if (published) {
    return (
      <LiveWorkspace
        listingId={id}
        shopName={listingShop.name}
        chat={thread}
        canvas={canvas}
        busy={chat.busy}
        onSend={(text) => chat.send(text)}
        backHref={`/list/${id}/words`}
      />
    );
  }

  return (
    <ListingWorkspace
      listingId={id}
      step="publish"
      shopName={listingShop.name}
      filled={12}
      total={12}
      busy={chat.busy}
      onSend={(text) => chat.send(text)}
      saveKey={listing.visibility}
      chat={thread}
      canvas={canvas}
    />
  );
}
