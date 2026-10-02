"use client";

import Link from "next/link";
import { Button } from "@repo/ui/button";
import {
  AgentMessage,
  ChangeChip,
  Thread,
  UserMessage,
} from "../agent-chat/agent-chat";
import { CanvasHeader } from "../workspace/listing-panel";
import { ListingWorkspace, stepHref } from "../workspace/listing-workspace";
import { draftListing } from "../../lib/mock";
import { listingShop, replies, type Tone } from "../../lib/mock-listing-later";
import { BuyerPreview, DraftCard, rewrite, TonePicker } from "./draft-card";
import { EarlierCards } from "./earlier-cards";
import { useListing } from "./store";
import { useIsDesk } from "./use-is-desk";
import { useAgentChat } from "./use-agent-chat";

/* C6 Listing / Words */

const id = draftListing.id;

const toneWord: Record<Tone, string> = {
  Friendly: "friendly",
  Playful: "playful",
  "Straight to the point": "no-nonsense",
  "A bit luxe": "slightly luxe",
};

function UseTheseWords({ className }: { className?: string }) {
  return (
    <Button
      render={<Link href={stepHref(id, "publish")} />}
      nativeButton={false}
      className={className}
    >
      Use these words
    </Button>
  );
}

export function WordsScreen() {
  const listing = useListing();
  const chat = useAgentChat(replies.words);
  const isDesk = useIsDesk();

  return (
    <ListingWorkspace
      listingId={id}
      step="words"
      shopName={listingShop.name}
      filled={12}
      total={12}
      busy={chat.busy || Boolean(listing.rewriting)}
      // Anything typed in this step is a writing instruction
      onSend={(text) => {
        chat.send(text, {
          ...replies.words[0],
          after: (
            <>
              <ChangeChip field="title">Title rewritten</ChangeChip>
              <ChangeChip field="description">Description rewritten</ChangeChip>
            </>
          ),
        });
        rewrite("take", { delay: 1100 });
      }}
      saveKey={`${listing.versionIndex}-${listing.versions.length}-${listing.tone}`}
      chat={
        <Thread>
          <AgentMessage>Now the words. How should it sound?</AgentMessage>
          <TonePicker
            onPick={(tone) =>
              chat.reply(
                {
                  thinking: `Writing it ${toneWord[tone]}`,
                  text: `Here's a ${toneWord[tone]} version. Change anything, or ask me for another take.`,
                },
                1300,
              )
            }
          />
          <UserMessage>Mention it was a wedding gift</UserMessage>
          <AgentMessage>
            Here&apos;s a friendly version with the gift in.{" "}
            <span className="hidden desk:inline">
              Change anything on the right, or ask me for another take.
            </span>
            <span className="desk:hidden">
              Tap any part to change it, or ask me for another take.
            </span>
          </AgentMessage>

          {/* Phone: the draft sits in the chat */}
          <div className="flex flex-col gap-4 desk:hidden">
            <DraftCard fields={!isDesk} />
            <UseTheseWords className="w-full" />
          </div>

          {chat.thread}
        </Thread>
      }
      canvas={
        <>
          <CanvasHeader
            title="The words"
            description="Click any part to edit it yourself."
            filled={12}
          />
          <div className="flex flex-col items-start gap-4 xl:flex-row">
            <div className="w-full xl:flex-[1.6]">
              <DraftCard fields={isDesk} />
            </div>
            <div className="flex w-full flex-col gap-4 xl:flex-1">
              <BuyerPreview />
              <UseTheseWords className="hidden w-full desk:flex" />
            </div>
          </div>
          <EarlierCards showPhotos />
        </>
      }
    />
  );
}
