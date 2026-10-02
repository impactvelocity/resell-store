"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@repo/ui/dialog";
import { ChevronLeftIcon, ChevronRightIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import type { Shop, ShopVisibility } from "../../lib/mock";
import {
  FlowBar,
  RadioDot,
  ShopTile,
  Switch,
  VisibilityPicker,
  roundButton,
  softPill,
} from "./parts";

/* B3 Shop settings. Everything is local state; Save shows a toast. */

type Settings = {
  name: string;
  link: string;
  about: string;
  visibility: ShopVisibility;
  answerQuestions: boolean;
  haggle: boolean;
  lowest: number;
  askHold: boolean;
  picture: string | null;
};

const about: Record<string, string> = {
  "mayas-closet": "Good things I no longer wear, looking for someone who will.",
  "home-and-kitchen": "Kitchen and home things that deserve another table.",
  "toms-old-records": "Tom's records, finally out of the loft.",
};

const lowestOptions = [5, 10, 15, 20, 25];

function initialSettings(shop: Shop): Settings {
  return {
    name: shop.name,
    link: shop.domain.replace(".resell.store", ""),
    about: about[shop.slug] ?? "",
    visibility: shop.visibility,
    answerQuestions: true,
    haggle: true,
    lowest: 15,
    askHold: true,
    picture: null,
  };
}

function countChanges(a: Settings, b: Settings) {
  return (Object.keys(a) as (keyof Settings)[]).filter((key) => a[key] !== b[key]).length;
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="px-1 text-sm font-semibold">
      {children}
    </label>
  );
}

const fieldBox =
  "rounded-md border-[1.5px] border-border bg-surface transition-colors focus-within:border-secondary focus-within:shadow-[0_0_0_0.5px_var(--color-secondary)]";

export function ShopSettings({ shop }: { shop: Shop }) {
  const toast = useToast();
  const router = useRouter();
  const [saved, setSaved] = useState(() => initialSettings(shop));
  const [s, setS] = useState(saved);
  const [paused, setPaused] = useState(false);
  const [lowestOpen, setLowestOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const changes = countChanges(s, saved);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  function save() {
    setSaved(s);
    toast.add({
      title: changes ? "Saved. Your shop is up to date." : "Nothing new to save.",
    });
  }

  function togglePause() {
    setPaused((p) => !p);
    toast.add({
      title: paused ? "Your shop is open again." : "Shop paused. Everything's kept.",
    });
  }

  function onPicture(file: File | undefined) {
    if (!file) return;
    set("picture", URL.createObjectURL(file));
  }

  const picture = (
    <div className="flex items-center gap-3.5 px-1">
      <ShopTile shop={shop} size={64} art={38} image={s.picture} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer text-sm font-bold text-secondary hover:underline"
      >
        Change picture
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onPicture(event.currentTarget.files?.[0])}
      />
    </div>
  );

  const fields = (idPrefix: string) => (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Shop name</Label>
        <div className={cn(fieldBox, "flex h-[54px] items-center px-[18px]")}>
          <input
            id={`${idPrefix}-name`}
            value={s.name}
            onChange={(e) => set("name", e.currentTarget.value)}
            className="w-full bg-transparent text-base font-medium outline-none"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-link`}>Shop link</Label>
        <div className={cn(fieldBox, "flex h-[54px] items-center gap-0.5 px-[18px]")}>
          <input
            id={`${idPrefix}-link`}
            value={s.link}
            onChange={(e) =>
              set("link", e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            size={Math.max(s.link.length, 1)}
            className="max-w-[60%] bg-transparent text-base font-semibold outline-none [field-sizing:content]"
          />
          <span className="flex-1 text-base text-text-muted">.resell.store</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-about`}>About this shop</Label>
        <div className={cn(fieldBox, "flex px-[18px] py-3.5")}>
          <textarea
            id={`${idPrefix}-about`}
            value={s.about}
            rows={2}
            onChange={(e) => set("about", e.currentTarget.value)}
            className="w-full resize-none bg-transparent text-base outline-none [field-sizing:content]"
          />
        </div>
      </div>
    </>
  );

  const visibility = (
    <VisibilityPicker
      variant="settings"
      label="Who can see it"
      value={s.visibility}
      onChange={(v) => set("visibility", v)}
    />
  );

  const agentRows = (
    <div className="flex flex-col rounded-lg border border-border bg-surface px-4 py-0.5">
      <AgentRow title="Answer buyers' questions" note="Only from what's in your listings">
        <Switch
          label="Answer buyers' questions"
          checked={s.answerQuestions}
          onChange={(v) => set("answerQuestions", v)}
        />
      </AgentRow>
      <AgentRow title="Haggle on offers" note="Counters for you. You still say yes to the sale.">
        <Switch label="Haggle on offers" checked={s.haggle} onChange={(v) => set("haggle", v)} />
      </AgentRow>
      <button
        type="button"
        onClick={() => setLowestOpen(true)}
        className="flex w-full cursor-pointer items-center gap-3 border-b border-border py-3.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-secondary"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-semibold">Lowest it can go</span>
          <span className="text-sm text-text-muted">Unless a listing says otherwise</span>
        </span>
        <span className="text-base font-bold">{s.lowest}% off</span>
        <ChevronRightIcon size={18} strokeWidth={2.2} className="text-text-muted" />
      </button>
      <AgentRow title="Ask for a hold with offers" note="A small deposit, so offers are serious" last>
        <Switch
          label="Ask for a hold with offers"
          checked={s.askHold}
          onChange={(v) => set("askHold", v)}
        />
      </AgentRow>
    </div>
  );

  const agentHeading = (
    <div className="flex flex-col gap-0.5 px-1">
      <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
        What your agent may do
      </h2>
      <p className="text-sm text-text-muted">
        For this shop. You see everything it does in your inbox.
      </p>
    </div>
  );

  return (
    <>
      {/* ---------- Phone ---------- */}
      <div className="flex flex-col desk:hidden">
        <FlowBar
          left={
            <Link href={`/shops/${shop.slug}`} aria-label="Back" className={roundButton}>
              <ChevronLeftIcon />
            </Link>
          }
          title="Shop settings"
          right={
            <button
              type="button"
              onClick={save}
              className="flex h-10 shrink-0 cursor-pointer items-center rounded-full bg-primary px-[18px] text-sm font-bold text-on-primary transition-colors hover:bg-lemon-300"
            >
              Save
            </button>
          }
        />
        <section className="flex flex-col gap-[18px] px-4 pt-6">
          {picture}
          {fields("phone")}
        </section>
        <section className="flex flex-col gap-2.5 px-4 pt-7">
          <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em]">
            Who can see it
          </h2>
          {visibility}
        </section>
        <section className="flex flex-col gap-2.5 px-4 pt-7">
          {agentHeading}
          {agentRows}
        </section>
        <section className="flex flex-col items-center gap-1 px-4 pt-7 pb-9">
          <button type="button" onClick={togglePause} className={cn(softPill, "h-[52px] w-full text-base")}>
            {paused ? "Open this shop again" : "Pause this shop"}
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex h-12 cursor-pointer items-center rounded-full px-5 text-base font-bold text-danger"
          >
            Delete shop
          </button>
        </section>
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden w-full flex-col gap-7 px-12 pt-8 pb-14 desk:flex">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium text-text-muted">
          <Link href="/shops/mayas-closet" className="hover:text-text">
            Shops
          </Link>
          <ChevronRightIcon size={14} strokeWidth={2.4} />
          <Link href={`/shops/${shop.slug}`} className="hover:text-text">
            {shop.name}
          </Link>
          <ChevronRightIcon size={14} strokeWidth={2.4} />
          <span className="font-semibold text-text">Settings</span>
        </nav>
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Shop settings</h1>
          <div className="flex items-center gap-3">
            {changes > 0 && (
              <span className="text-sm font-medium text-text-muted">
                {changes} {changes === 1 ? "change" : "changes"} not saved
              </span>
            )}
            <button
              type="button"
              onClick={save}
              className="flex h-12 cursor-pointer items-center rounded-full bg-primary px-7 text-base font-bold text-on-primary transition-colors hover:bg-lemon-300"
            >
              Save changes
            </button>
          </div>
        </div>
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <div className="flex w-full flex-1 flex-col gap-6">
            <div className="flex flex-col gap-[18px] rounded-lg border border-border bg-surface p-6">
              <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">The basics</h2>
              {picture}
              {fields("desk")}
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-6 py-5">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-semibold">
                  {paused ? "Your shop is paused" : "Taking a break?"}
                </span>
                <span className="text-sm text-text-muted">
                  {paused
                    ? "Nobody can see it. Open it again when you're ready."
                    : "Pausing hides the shop and keeps everything."}
                </span>
              </div>
              <button type="button" onClick={togglePause} className={softPill}>
                {paused ? "Open shop" : "Pause shop"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex h-11 shrink-0 cursor-pointer items-center rounded-full px-3 text-sm font-bold text-danger hover:bg-surface-muted"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="flex w-full flex-1 flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em]">
                Who can see it
              </h2>
              {visibility}
            </div>
            <div className="flex flex-col gap-2.5">
              {agentHeading}
              {agentRows}
            </div>
          </div>
        </div>
      </div>

      {/* Lowest price picker */}
      <Dialog open={lowestOpen} onOpenChange={setLowestOpen}>
        <DialogContent>
          <DialogTitle>Lowest it can go</DialogTitle>
          <DialogDescription>
            Your agent won't agree to less than this off your price, unless a listing says
            otherwise.
          </DialogDescription>
          <div role="radiogroup" aria-label="Lowest it can go" className="mt-5 flex flex-col">
            {lowestOptions.map((option, i) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={s.lowest === option}
                onClick={() => {
                  set("lowest", option);
                  setLowestOpen(false);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between py-3 text-left text-base font-semibold",
                  i < lowestOptions.length - 1 && "border-b border-border",
                )}
              >
                {option}% off
                <RadioDot checked={s.lowest === option} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogTitle>Delete {shop.name}?</DialogTitle>
          <DialogDescription>
            Its listings come down and the link stops working. This can't be undone. Pausing
            keeps everything instead.
          </DialogDescription>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <DialogClose render={<Button variant="soft" size="md" />}>Keep it</DialogClose>
            <Button
              size="md"
              className="bg-danger text-on-secondary hover:bg-danger/90"
              onClick={() => {
                setDeleteOpen(false);
                toast.add({ title: `${shop.name} is deleted.` });
                router.push("/me");
              }}
            >
              Delete shop
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AgentRow({
  title,
  note,
  last,
  children,
}: {
  title: string;
  note: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-3 py-3.5", !last && "border-b border-border")}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-semibold">{title}</span>
        <span className="text-sm text-text-muted">{note}</span>
      </div>
      {children}
    </div>
  );
}
