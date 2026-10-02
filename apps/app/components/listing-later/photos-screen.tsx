"use client";

import Link from "next/link";
import { Button } from "@repo/ui/button";
import { AgentMessage, Thread } from "../agent-chat/agent-chat";
import { CanvasHeader } from "../workspace/listing-panel";
import { ListingWorkspace, stepHref } from "../workspace/listing-workspace";
import { draftListing } from "../../lib/mock";
import { listingShop, replies } from "../../lib/mock-listing-later";
import { EarlierCards } from "./earlier-cards";
import { PhotoGrid, ShotList } from "./photo-grid";
import { useListing } from "./store";
import { useAgentChat } from "./use-agent-chat";

/* C5 Listing / Photos */

const id = draftListing.id;

function NextButtons({ phone = false }: { phone?: boolean }) {
  const next = (
    <Button
      render={<Link href={stepHref(id, "words")} />}
      nativeButton={false}
      className={phone ? "w-full" : undefined}
    >
      Next, the words
    </Button>
  );
  const skip = (
    <Button
      variant="ghost"
      render={<Link href={stepHref(id, "words")} />}
      nativeButton={false}
      className={phone ? "h-auto px-0 hover:bg-transparent hover:underline" : undefined}
    >
      Skip for now
    </Button>
  );
  return phone ? (
    <div className="flex flex-col items-center gap-3.5 pt-1">
      {next}
      {skip}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {skip}
      {next}
    </div>
  );
}

export function PhotosScreen() {
  const listing = useListing();
  const chat = useAgentChat(replies.photos);

  return (
    <ListingWorkspace
      listingId={id}
      step="photos"
      shopName={listingShop.name}
      filled={10}
      total={12}
      busy={chat.busy}
      onSend={(text) => chat.send(text)}
      saveKey={listing.photos}
      chat={
        <Thread>
          <AgentMessage>
            You&apos;ve got one good photo. Listings with four or more sell
            faster, so I found two from the maker to fill in. They carry a
            label, so buyers know which
            <span className="hidden desk:inline"> ones</span> are yours.
          </AgentMessage>

          {/* Desktop: the shot list sits in the chat, the grid on the canvas */}
          <ShotList className="hidden desk:flex" onAdded={chat.system} />

          {/* Phone: everything sits in the chat */}
          <div className="flex flex-col gap-4 desk:hidden">
            <PhotoGrid onAdded={chat.system} onRemoved={chat.system} />
            <p className="text-sm text-text-muted">
              Hold and drag to reorder. Photos from the web always show where
              they came from.
            </p>
            <ShotList onAdded={chat.system} />
            <NextButtons phone />
          </div>

          {chat.thread}
        </Thread>
      }
      canvas={
        <>
          <CanvasHeader
            title="Photos"
            description="Drag to reorder. The first one is the cover."
            filled={10}
          />
          <PhotoGrid onAdded={chat.system} onRemoved={chat.system} />
          <div className="mt-5 flex flex-col gap-4 desk:flex-row desk:items-center desk:justify-between">
            <p className="max-w-[360px] text-sm text-text-muted">
              Photos from the web always show where they came from. You can
              remove them any time.
            </p>
            <div className="hidden desk:block">
              <NextButtons />
            </div>
          </div>
          <EarlierCards />
        </>
      }
    />
  );
}
