"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { ChevronRightIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { me } from "../../lib/mock";
import { ConfirmDialog } from "../offers/offer-parts";
import { useProfileDraft } from "./profile-context";
import {
  AboutField,
  InterestChips,
  LocationField,
  NameField,
  NotifyRows,
  ProfileAvatar,
  ReachChips,
} from "./profile-fields";

/* A6 + A7 on desktop: one "Profile and settings" page. */

export const publicProfileHref = "/shops/mayas-closet";

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl font-extrabold tracking-tight text-text">
      {children}
    </h2>
  );
}

const card =
  "flex w-full flex-col rounded-xl border border-border bg-surface";

const textLink =
  "shrink-0 cursor-pointer text-sm font-bold text-secondary hover:underline";

/** Log out asks once, then goes to the welcome screen. */
export function useLogOut() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Log out?"
      description="Your agent keeps answering buyers while you're away."
      confirm="Log out"
      onConfirm={() => router.push("/welcome")}
    />
  );
  return { ask: () => setOpen(true), dialog };
}

export function ProfileSettings({ className }: { className?: string }) {
  const toast = useToast();
  const { draft, set, save } = useProfileDraft();
  const logOut = useLogOut();
  const [deleting, setDeleting] = useState(false);

  return (
    <div
      className={cn(
        "w-full flex-col gap-7 px-12 pt-8 pb-14",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between gap-6">
        <h1 className="font-display text-3xl leading-[44px] font-extrabold tracking-tight text-text">
          Profile and settings
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant="soft"
            size="md"
            className="h-12"
            render={<Link href={publicProfileHref} />}
            nativeButton={false}
          >
            See public profile
          </Button>
          <Button
            className="h-12 px-6"
            onClick={() => {
              save();
              toast.add({ title: "Profile saved" });
            }}
          >
            Save changes
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
        {/* Left */}
        <div className="flex w-full flex-1 flex-col gap-6">
          <section className={cn(card, "gap-5 p-7")}>
            <CardTitle>About you</CardTitle>
            <div className="flex items-center gap-4">
              <ProfileAvatar name={draft.name} className="size-20 text-3xl text-text" />
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className={cn(textLink, "w-fit")}
                  onClick={() => toast.add({ title: "Photo picker opens here" })}
                >
                  Change photo
                </button>
                <span className="text-sm text-text-muted">
                  Buyers see this on your shops and messages.
                </span>
              </div>
            </div>
            <NameField value={draft.name} onChange={(v) => set("name", v)} />
            <AboutField value={draft.about} onChange={(v) => set("about", v)} />
            <LocationField
              value={draft.location}
              onChange={(v) => set("location", v)}
              hint="Buyers see the city only"
            />
          </section>

          <section className={cn(card, "gap-[14px] p-7")}>
            <div className="flex flex-col gap-0.5">
              <CardTitle>What you&apos;re into</CardTitle>
              <p className="text-sm text-text-muted">
                Shapes what you see when you&apos;re buying.
              </p>
            </div>
            <InterestChips
              value={draft.interests}
              onChange={(v) => set("interests", v)}
            />
          </section>
        </div>

        {/* Right */}
        <div className="flex w-full flex-1 flex-col gap-6">
          <section className={cn(card, "px-7 pt-6 pb-2")}>
            <div className="pb-2">
              <CardTitle>Tell me when</CardTitle>
            </div>
            <NotifyRows value={draft.notify} onChange={(v) => set("notify", v)} />
            <div className="flex items-center gap-4 py-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="text-base font-bold text-text">How to reach me</div>
                <div className="text-sm text-text-muted">For the ones that are on</div>
              </div>
              <ReachChips value={draft.reach} onChange={(v) => set("reach", v)} />
            </div>
          </section>

          <section className={cn(card, "px-7 pt-6 pb-2")}>
            <div className="pb-2">
              <CardTitle>Account</CardTitle>
            </div>
            <div className="flex items-center gap-4 border-b border-border py-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="text-base font-bold text-text">Email</div>
                <div className="text-sm text-text-muted">{me.email}</div>
              </div>
              <button
                type="button"
                className={textLink}
                onClick={() =>
                  toast.add({ title: `We sent a link to ${me.email}` })
                }
              >
                Change
              </button>
            </div>
            <div className="flex items-center gap-4 border-b border-border py-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="text-base font-bold text-text">You sign in with</div>
                <div className="text-sm text-text-muted">
                  PayPal, or a link sent to your email
                </div>
              </div>
              <Link href="/tools/connections" className={textLink}>
                Manage
              </Link>
            </div>
            <button
              type="button"
              onClick={() => toast.add({ title: "Help opens here" })}
              className="flex cursor-pointer items-center gap-4 border-b border-border py-4 text-left"
            >
              <span className="flex-1 text-base font-bold text-text">Help</span>
              <ChevronRightIcon size={20} strokeWidth={2.2} className="text-text-muted" />
            </button>
            <div className="flex items-center justify-between gap-4 py-4">
              <button
                type="button"
                onClick={logOut.ask}
                className="cursor-pointer text-base font-bold text-danger hover:underline"
              >
                Log out
              </button>
              <button
                type="button"
                onClick={() => setDeleting(true)}
                className="cursor-pointer text-sm font-semibold text-text-muted hover:text-text"
              >
                Delete my account
              </button>
            </div>
          </section>
        </div>
      </div>
      {logOut.dialog}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete your account?"
        description="Your shops and listings come down everywhere. This can't be undone."
        confirm="Delete my account"
        danger
        onConfirm={() =>
          toast.add({ title: "Nothing deleted. This is a prototype." })
        }
      />
    </div>
  );
}
