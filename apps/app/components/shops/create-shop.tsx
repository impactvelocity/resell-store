"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Chip, ChipGroup } from "@repo/ui/chip";
import { CheckIcon, ChevronLeftIcon, CloseIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import type { ShopVisibility } from "../../lib/mock";
import { takenLinks } from "../../lib/mock-shops";
import { createShop } from "../../app/actions/shops";
import {
  CameraOutlineIcon,
  VisibilityPicker,
  roundButton,
  useLinkCheck,
  type LinkCheck,
} from "./parts";

/*
 * B1 Create shop. With `live`, "Open my shop" saves the shop (link checked
 * as you type) and goes to it. Without it (the mock), it shows a toast and
 * lands on Maya's closet.
 */

/** The picker colours; `key` is what the shop keeps (shop.tone). */
const colours = [
  { key: "lemon", name: "Lemon", bg: "bg-lemon-400", fg: "text-text" },
  { key: "mint", name: "Mint", bg: "bg-leaf-300", fg: "text-text" },
  { key: "pink", name: "Pink", bg: "bg-pink-400", fg: "text-text" },
  { key: "leaf", name: "Leaf", bg: "bg-leaf-600", fg: "text-on-secondary" },
  { key: "blush", name: "Blush", bg: "bg-pink-100", fg: "text-text" },
] as const;

const categories = [
  "Clothes",
  "Home",
  "Collectibles",
  "Books and records",
  "Kids' things",
  "A bit of everything",
];

const previewNote: Record<ShopVisibility, string> = {
  private: "With “Only me”, nobody else can open the shop until you change it.",
  link: "With “Anyone with the link”, only people you send this link to will find the shop.",
  public: "With “Everyone”, the shop also shows up on the resell.store marketplace.",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export type CreateShopLive = {
  /** Starting name, e.g. "Dylan's shop" for a first shop; "" otherwise. */
  suggestedName: string;
  /** No shops yet: the screen says so and welcomes them in. */
  firstShop: boolean;
  /** Where Back and Cancel go. */
  backHref: string;
  /** DEMO=true: no "Everyone" option, so new stores stay off the marketplace. */
  noPublic?: boolean;
};

export function CreateShop({ live }: { live?: CreateShopLive } = {}) {
  const router = useRouter();
  const toast = useToast();
  const initialName = live ? live.suggestedName : "Billy's collectibles";
  const [name, setName] = useState(initialName);
  const [link, setLink] = useState(live ? slugify(initialName) : "billy-collectibles");
  const [linkEdited, setLinkEdited] = useState(false);
  const [colour, setColour] = useState(1);
  const [picture, setPicture] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [category, setCategory] = useState(live ? "" : "Collectibles");
  const [visibility, setVisibility] = useState<ShopVisibility>("link");
  const [opening, startOpening] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const serverLink = useLinkCheck(link, { enabled: !!live });
  const linkState: LinkCheck = live
    ? serverLink
    : !link
      ? "empty"
      : takenLinks.includes(link)
        ? "taken"
        : "free";
  const canOpen = name.trim().length > 0 && linkState === "free";
  const swatch = colours[colour] ?? colours[1];
  const backHref = live?.backHref ?? "/me";
  const closeHref = live?.backHref ?? "/shops/mayas-closet";

  function onName(value: string) {
    setName(value);
    if (!linkEdited) setLink(slugify(value));
  }

  function open() {
    if (!canOpen) {
      toast.add({
        title: !name.trim()
          ? "Give your shop a name first."
          : linkState === "checking"
            ? "One moment, checking that link."
            : "Pick a link that's free.",
      });
      return;
    }
    if (!live) {
      toast.add({ title: `${name.trim()} is open. Time to list something.` });
      router.push("/shops/mayas-closet");
      return;
    }
    const form = new FormData();
    form.set("name", name.trim());
    form.set("slug", link);
    form.set("tone", swatch.key);
    if (category) form.set("category", category);
    form.set("visibility", visibility);
    if (pictureFile) form.set("picture", pictureFile);
    startOpening(async () => {
      // Redirects to the new shop on success
      const result = await createShop(form);
      if (result?.error) toast.add({ title: result.error });
      else toast.add({ title: `${name.trim()} is open. Time to list something.` });
    });
  }

  const heading = live?.firstShop ? "Open your first shop" : "Set up your shop";
  const subheading = live?.firstShop
    ? "Name it, pick a colour, and you're in. You can change all of it later."
    : "Takes a minute. You can change all of it later.";

  const pictureRow = (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label="Add a picture"
        className={cn(
          "flex size-[88px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-cover bg-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
          swatch.bg,
          swatch.fg,
        )}
        style={{ backgroundImage: picture ? `url(${picture})` : undefined }}
      >
        {!picture && <CameraOutlineIcon />}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            setPicture(URL.createObjectURL(file));
            setPictureFile(file);
          }
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <span className="text-sm font-semibold">Add a picture, or pick a colour</span>
        <div role="radiogroup" aria-label="Colour" className="flex items-center gap-2.5">
          {colours.map((c, i) => {
            const selected = i === colour && !picture;
            return (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={c.name}
                onClick={() => {
                  setColour(i);
                  setPicture(null);
                  setPictureFile(null);
                }}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
                  selected ? "size-[38px] border-2 border-text" : "size-8",
                )}
              >
                <span className={cn("rounded-full", c.bg, selected ? "size-7" : "size-8")} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const nameField = (id: string) => (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <label htmlFor={`${id}-name`} className="px-1 text-sm font-semibold">
        Shop name
      </label>
      <input
        id={`${id}-name`}
        value={name}
        onChange={(e) => onName(e.currentTarget.value)}
        placeholder="Like “Billy's collectibles”"
        className="h-[54px] w-full rounded-md border-[1.5px] border-border bg-surface px-[18px] text-base font-medium outline-none placeholder:font-normal placeholder:text-text-muted focus:border-secondary"
      />
    </div>
  );

  const linkField = (id: string) => (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <label htmlFor={`${id}-link`} className="px-1 text-sm font-semibold">
        Shop link
      </label>
      <div
        className={cn(
          "flex h-[54px] items-center gap-0.5 rounded-md bg-surface pr-3.5 pl-[18px]",
          linkState === "free" && "border-2 border-secondary",
          (linkState === "taken" || linkState === "invalid") && "border-2 border-danger",
          (linkState === "empty" || linkState === "checking") &&
            "border-[1.5px] border-border focus-within:border-secondary",
        )}
      >
        <input
          id={`${id}-link`}
          value={link}
          onChange={(e) => {
            setLinkEdited(true);
            setLink(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
          aria-describedby={`${id}-link-note`}
          className="min-w-0 max-w-[70%] bg-transparent text-base font-semibold outline-none [field-sizing:content]"
        />
        <span className="min-w-0 flex-1 truncate text-base text-text-muted">.resell.store</span>
        {linkState === "free" && (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
            <CheckIcon size={14} strokeWidth={3.2} />
          </span>
        )}
      </div>
      <p
        id={`${id}-link-note`}
        aria-live="polite"
        className={cn(
          "px-1 text-sm font-medium",
          linkState === "taken" || linkState === "invalid"
            ? "text-danger"
            : linkState === "checking"
              ? "text-text-muted"
              : "text-secondary",
        )}
      >
        {linkState === "free" && "That link is free. It's yours."}
        {linkState === "taken" && "That link isn't available. Try another."}
        {linkState === "invalid" && "Letters, numbers and dashes. No dash at the start or end."}
        {linkState === "checking" && "Checking that link…"}
        {linkState === "empty" && " "}
      </p>
    </div>
  );

  return (
    <>
      {/* ---------- Phone ---------- */}
      <div className="flex flex-col desk:hidden">
        <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <Link href={backHref} aria-label="Back" className={roundButton}>
            <ChevronLeftIcon />
          </Link>
          <h1 className="text-base font-bold">New shop</h1>
          <Link href={closeHref} aria-label="Close" className={roundButton}>
            <CloseIcon size={18} strokeWidth={2.2} />
          </Link>
        </div>
        <div className="flex flex-col gap-2 px-5 pt-6">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">{heading}</h2>
          <p className="text-base text-text-muted">{subheading}</p>
        </div>
        <div className="px-4 pt-6">{pictureRow}</div>
        <div className="flex flex-col gap-[18px] px-4 pt-6">
          {nameField("phone")}
          {linkField("phone")}
        </div>
        <div className="flex flex-col gap-2.5 px-4 pt-7">
          <h2 className="px-1 font-display text-xl font-extrabold tracking-[-0.02em]">
            Who can see it?
          </h2>
          <VisibilityPicker
            variant="create"
            label="Who can see it?"
            value={visibility}
            onChange={setVisibility}
            noPublic={live?.noPublic}
          />
        </div>
        <div className="px-4 pt-7 pb-9">
          <button
            type="button"
            onClick={open}
            disabled={opening}
            className="flex h-[60px] w-full cursor-pointer items-center justify-center rounded-full bg-primary text-base font-bold text-on-primary transition-colors hover:bg-lemon-300 disabled:cursor-wait disabled:opacity-70"
          >
            {opening ? "Opening…" : "Open my shop"}
          </button>
        </div>
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden w-full flex-col gap-7 px-12 pt-10 pb-14 desk:flex">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{heading}</h1>
          <p className="text-base text-text-muted">{subheading}</p>
        </div>
        <div className="flex flex-col items-start gap-6 xl:flex-row">
          <div className="flex w-full flex-[1.25] flex-col gap-6 rounded-xl border border-border bg-surface p-7">
            <div className="px-4">{pictureRow}</div>
            <div className="flex gap-4">
              {nameField("desk")}
              {linkField("desk")}
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="px-1 text-sm font-semibold">What will you sell here?</span>
              <ChipGroup
                value={category ? [category] : []}
                onValueChange={(value) => {
                  const next = value[0];
                  if (typeof next === "string") setCategory(next);
                }}
                aria-label="What will you sell here?"
              >
                {categories.map((c) => (
                  <Chip key={c} value={c} className="px-4">
                    {c}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="px-1 text-sm font-semibold">Who can see it?</span>
              <VisibilityPicker
                variant="create"
                label="Who can see it?"
                value={visibility}
                onChange={setVisibility}
                noPublic={live?.noPublic}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Link
                href={closeHref}
                className="flex h-14 items-center rounded-full px-5 text-base font-bold text-secondary transition-colors hover:bg-secondary-soft"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={open}
                disabled={opening}
                className="flex h-14 cursor-pointer items-center rounded-full bg-primary px-8 text-base font-bold text-on-primary transition-colors hover:bg-lemon-300 disabled:cursor-wait disabled:opacity-70"
              >
                {opening ? "Opening…" : "Open my shop"}
              </button>
            </div>
          </div>

          <div className="flex w-full flex-1 flex-col gap-3">
            <span className="px-1 text-sm font-semibold tracking-wide text-text-muted uppercase">
              How it will look
            </span>
            <div className="flex w-full flex-col items-center gap-[18px] rounded-xl border border-border bg-surface-muted px-6 pt-5 pb-7">
              <span className="flex h-9 max-w-full items-center truncate rounded-full border-[1.5px] border-border bg-surface px-4 text-sm font-semibold">
                {link || "your-link"}.resell.store
              </span>
              <span
                className={cn(
                  "flex size-[88px] shrink-0 items-center justify-center rounded-full bg-cover bg-center font-display text-4xl font-extrabold tracking-tight",
                  swatch.bg,
                  swatch.fg,
                )}
                style={{ backgroundImage: picture ? `url(${picture})` : undefined }}
              >
                {!picture && (name.trim()[0]?.toUpperCase() ?? "?")}
              </span>
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="font-display text-2xl font-extrabold tracking-tight">
                  {name.trim() || "Your shop"}
                </span>
                <span className="text-sm text-text-muted">
                  Nothing listed yet. Your first thing will show up here.
                </span>
              </div>
              <div className="flex w-full gap-3">
                <div className="h-[132px] flex-1 rounded-lg bg-surface" />
                <div className="h-[132px] flex-1 rounded-lg bg-surface" />
              </div>
            </div>
            <p className="px-1 text-sm text-text-muted">{previewNote[visibility]}</p>
          </div>
        </div>
      </div>
    </>
  );
}
