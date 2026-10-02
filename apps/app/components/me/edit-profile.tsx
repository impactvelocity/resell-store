"use client";

import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { ChevronLeftIcon, PhotoCameraIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import { IconLink } from "../shell/page";
import { useProfileDraft } from "./profile-context";
import {
  AboutField,
  InterestChips,
  LocationField,
  NameField,
  NotifyRows,
  ProfileAvatar,
} from "./profile-fields";

/* A7 Edit profile, phone only. Save shows a toast and goes back to Me. */

export function EditProfile({ className }: { className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { draft, set, save } = useProfileDraft();

  return (
    <div className={cn("w-full flex-col", className)}>
      <div className="flex w-full items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
        <IconLink href="/me" aria-label="Back">
          <ChevronLeftIcon strokeWidth={2.2} />
        </IconLink>
        <h1 className="text-base font-bold text-text">Edit profile</h1>
        <Button
          size="md"
          className="h-10 px-[18px]"
          onClick={() => {
            save();
            toast.add({ title: "Profile saved" });
            router.push("/me");
          }}
        >
          Save
        </Button>
      </div>

      <div className="flex w-full flex-col items-center gap-[10px] px-4 pt-6">
        <div className="relative size-24 shrink-0">
          <ProfileAvatar name={draft.name} className="size-24 text-4xl" />
          <button
            type="button"
            aria-label="Change photo"
            onClick={() => toast.add({ title: "Photo picker opens here" })}
            className="absolute -right-1 bottom-[-2px] flex size-9 cursor-pointer items-center justify-center rounded-full border-[3px] border-background bg-text text-background"
          >
            <PhotoCameraIcon size={16} strokeWidth={2.2} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => toast.add({ title: "Photo picker opens here" })}
          className="cursor-pointer text-sm font-bold text-secondary"
        >
          Change photo
        </button>
      </div>

      <div className="flex w-full flex-col gap-[18px] px-4 pt-6">
        <NameField value={draft.name} onChange={(v) => set("name", v)} />
        <AboutField value={draft.about} onChange={(v) => set("about", v)} />
        <LocationField
          value={draft.location}
          onChange={(v) => set("location", v)}
          hint="City only"
        />
      </div>

      <section className="flex w-full flex-col gap-[10px] px-4 pt-[28px]">
        <div className="flex flex-col gap-0.5 px-1">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-text">
            What you&apos;re into
          </h2>
          <p className="text-sm text-text-muted">
            Shapes what you see when you&apos;re buying.
          </p>
        </div>
        <InterestChips
          value={draft.interests}
          onChange={(v) => set("interests", v)}
        />
      </section>

      <section
        id="notifications"
        className="flex w-full scroll-mt-4 flex-col gap-[10px] px-4 pt-[28px] pb-9"
      >
        <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em] text-text">
          Tell me when
        </h2>
        <div className="flex w-full flex-col rounded-lg border border-border bg-surface px-4 py-0.5">
          <NotifyRows value={draft.notify} onChange={(v) => set("notify", v)} />
        </div>
      </section>
    </div>
  );
}
