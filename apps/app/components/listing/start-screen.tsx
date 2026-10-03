"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckIcon, ChevronDownIcon, CloseIcon } from "@repo/ui/icons";
import { DotMark } from "@repo/ui/logo";
import { cn } from "@repo/ui/lib/utils";
import { shops } from "../../lib/mock";
import { listingHref, startSuggestion, startTryChips } from "../../lib/mock-listing";
import { steps } from "../workspace/listing-workspace";
import { PotIllustration } from "./pot-illustration";

/*
 * C1 Listing / Start. Its own layout, not the workspace: a photo, a name, or
 * both. Adding a photo or sending the name starts the research (C2).
 * With `live`, the photo really uploads and the form creates a draft in the
 * chosen shop. Without it (the mock), tapping the photo area "adds" the dutch oven.
 */

export type StartLive = {
  shops: { slug: string; name: string }[];
  defaultShop: string;
  action: (prev: { error?: string } | null, form: FormData) => Promise<{ error?: string } | null>;
};

function SparkleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden>
      <path
        d="M32 4c2 17 11 26 28 28-17 2-26 11-28 28-2-17-11-26-28-28 17-2 26-11 28-28Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CameraGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** "For Home and kitchen finds" pill that opens a short list of shops. */
function ShopPicker({
  className,
  options = shops,
  value,
  onChange,
}: {
  className?: string;
  options?: { slug: string; name: string }[];
  value?: string;
  onChange?: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ownSlug, setOwnSlug] = useState("home-and-kitchen");
  const slug = value ?? ownSlug;
  const setSlug = onChange ?? setOwnSlug;
  const ref = useRef<HTMLDivElement>(null);
  const shop = options.find((s) => s.slug === slug) ?? options[0]!;

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface pr-3.5 pl-4 text-sm transition-colors hover:bg-surface-muted desk:h-11 desk:pl-[18px]"
      >
        <span className="font-medium text-text-muted">For</span>
        <span className="font-bold">{shop.name}</span>
        <ChevronDownIcon size={16} strokeWidth={2.4} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Shop"
          className="absolute top-full left-1/2 z-20 mt-2 w-[260px] -translate-x-1/2 rounded-md border border-border bg-surface p-1.5 shadow-[0_16px_32px_-12px_rgb(20_38_29/0.2)]"
        >
          {options.map((s) => (
            <li key={s.slug}>
              <button
                type="button"
                role="option"
                aria-selected={s.slug === slug}
                onClick={() => {
                  setSlug(s.slug);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-muted"
              >
                {s.name}
                {s.slug === slug && <CheckIcon size={16} className="text-secondary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepsPreview() {
  return (
    <>
      {/* Phone: five columns */}
      <div className="flex w-full items-start justify-between desk:hidden">
        {steps.map((step, i) => (
          <div key={step.key} className="flex w-[66px] shrink-0 flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full font-display text-base font-extrabold",
                i === 0 ? "bg-primary text-on-primary" : "bg-surface-muted text-text",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                i === 0 ? "font-semibold text-text" : "font-medium text-text-muted",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
      {/* Desktop: a row with connectors */}
      <div className="hidden items-center gap-2.5 desk:flex">
        {steps.map((step, i) => (
          <Fragment key={step.key}>
            {i > 0 && <span className="h-0.5 w-6 shrink-0 rounded-full bg-border" />}
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full font-display text-sm font-extrabold",
                  i === 0 ? "bg-primary text-on-primary" : "bg-surface-muted text-text-muted",
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  i === 0 ? "font-bold text-text" : "font-medium text-text-muted",
                )}
              >
                {step.label}
              </span>
            </span>
          </Fragment>
        ))}
      </div>
    </>
  );
}

export function StartScreen({ live }: { live?: StartLive } = {}) {
  const router = useRouter();
  const [text, setText] = useState(live ? "" : startSuggestion);
  const [photo, setPhoto] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [going, setGoing] = useState(false);
  const [shop, setShop] = useState(live?.defaultShop ?? "");
  const [state, formAction, submitting] = useActionState(
    live?.action ?? (async () => null),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const research = listingHref("research");

  useEffect(() => {
    if (!live) router.prefetch(research);
  }, [router, research, live]);

  // A photo is enough to start: show it for a beat, then go
  useEffect(() => {
    if (!photo) return;
    const t = setTimeout(() => {
      if (live) formRef.current?.requestSubmit();
      else router.push(research);
    }, 900);
    return () => clearTimeout(t);
  }, [photo, router, research, live]);

  // The form errored (e.g. the photo was too big): let them try again
  useEffect(() => {
    if (state?.error) {
      setGoing(false);
      setPhoto(false);
    }
  }, [state]);

  function pickFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (fileRef.current && fileRef.current.files?.[0] !== file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileRef.current.files = dt.files;
    }
    setPreview(URL.createObjectURL(file));
    setPhoto(true);
  }

  function start(e?: FormEvent) {
    if (live) {
      // The server action runs from the form itself
      if (!text.trim() && !photo) e?.preventDefault();
      else setGoing(true);
      return;
    }
    e?.preventDefault();
    if (!text.trim() && !photo) return;
    setGoing(true);
    router.push(research);
  }

  const canStart = Boolean(text.trim()) || photo;

  const dropZone = (
    <button
      type="button"
      onClick={() => (live ? fileRef.current?.click() : setPhoto(true))}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (live) pickFile(e.dataTransfer.files[0]);
        else setPhoto(true);
      }}
      className={cn(
        "flex h-[188px] w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-lemon-300 bg-primary-soft transition-colors hover:border-lemon-400 desk:h-[240px] desk:gap-3.5",
        dragging && "border-dashed border-secondary",
      )}
    >
      {photo ? (
        <>
          <span className="flex size-28 items-center justify-center overflow-hidden rounded-lg bg-leaf-100">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local object URL
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <PotIllustration />
            )}
          </span>
          <span className="text-sm font-semibold">Got it. Looking it up…</span>
        </>
      ) : (
        <>
          <span className="flex size-[60px] items-center justify-center rounded-full bg-primary text-on-primary desk:size-16">
            <span className="desk:hidden">
              <CameraGlyph size={28} />
            </span>
            <span className="hidden desk:block">
              <CameraGlyph size={30} />
            </span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span className="text-lg leading-6 font-bold">
              <span className="desk:hidden">Take a photo</span>
              <span className="hidden desk:inline">Drop a photo here</span>
            </span>
            <span className="text-sm font-medium text-text-muted">
              <span className="desk:hidden">or pick one from your library</span>
              <span className="hidden desk:inline">or choose one from your computer</span>
            </span>
          </span>
        </>
      )}
    </button>
  );

  const chips = startTryChips.map((chip) => (
    <button
      key={chip}
      type="button"
      onClick={() => setText(chip)}
      className="flex h-9 cursor-pointer items-center rounded-full border-[1.5px] border-border bg-surface px-3.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
    >
      {chip}
    </button>
  ));

  const lookItUp = (
    <button
      type="submit"
      disabled={!canStart || going || submitting}
      className="flex h-[60px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-[30px] text-base font-bold text-on-primary transition-colors hover:bg-lemon-300 disabled:cursor-default disabled:opacity-60 desk:h-16 desk:w-auto"
    >
      <SparkleGlyph />
      Look it up for me
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Desktop top bar */}
      <header className="hidden h-[72px] shrink-0 items-center justify-between border-b border-border bg-surface px-6 desk:flex">
        <div className="flex flex-1 items-center gap-3.5">
          <Link href="/home" aria-label="Home">
            <DotMark />
          </Link>
          <span className="text-sm font-bold">New listing</span>
        </div>
        <ShopPicker options={live?.shops} value={live ? shop : undefined} onChange={live ? setShop : undefined} />
        <div className="flex flex-1 justify-end">
          <Link
            href="/home"
            className="flex h-11 items-center rounded-full border-[1.5px] border-border bg-surface px-5 text-sm font-bold transition-colors hover:bg-surface-muted"
          >
            Close
          </Link>
        </div>
      </header>

      {/* Phone top bar */}
      <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] desk:hidden">
        <Link
          href="/home"
          aria-label="Close"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-surface"
        >
          <CloseIcon size={18} strokeWidth={2.2} />
        </Link>
        <ShopPicker options={live?.shops} value={live ? shop : undefined} onChange={live ? setShop : undefined} />
        <span className="size-10 shrink-0" />
      </div>

      <form
        ref={formRef}
        action={live ? formAction : undefined}
        onSubmit={start}
        className="flex flex-1 flex-col desk:items-center desk:px-6 desk:pt-16 desk:pb-[72px]"
      >
        {live && (
          <>
            <input type="hidden" name="shop" value={shop} />
            <input
              ref={fileRef}
              type="file"
              name="photo"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.currentTarget.files?.[0])}
            />
          </>
        )}
        <div className="flex w-full flex-1 flex-col desk:w-[720px] desk:flex-none desk:gap-7">
          <div className="flex flex-col gap-2 px-5 pt-7 desk:items-center desk:gap-2.5 desk:px-0 desk:pt-0 desk:text-center">
            <h1 className="font-display text-3xl font-extrabold tracking-tight desk:text-5xl">
              What are you selling?
            </h1>
            <p className="text-base text-text-muted desk:text-lg desk:leading-7">
              A photo, a name, or both. I&apos;ll take it from there.
            </p>
          </div>

          <div className="flex flex-col gap-3 px-4 pt-6 desk:gap-7 desk:px-0 desk:pt-0">
            {dropZone}

            <div className="flex w-full items-center gap-3">
              <input
                name="prompt"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="What are you selling?"
                placeholder={live ? startSuggestion : "Or type what it is"}
                className="h-[60px] min-w-0 flex-1 rounded-full border-2 border-secondary bg-surface px-[22px] text-base font-medium text-text outline-none placeholder:text-text-muted desk:h-16 desk:px-[26px] desk:text-lg"
              />
              <div className="hidden desk:block">{lookItUp}</div>
            </div>

            {state?.error && (
              <p role="alert" className="px-1 text-sm font-semibold text-accent-text desk:text-center">
                {state.error}
              </p>
            )}

            <div className="flex w-full flex-wrap gap-2 desk:items-center desk:justify-center">
              <span className="hidden text-sm font-medium text-text-muted desk:inline">Try</span>
              {chips}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 px-4 pt-8 desk:items-center desk:gap-4 desk:border-t desk:border-border desk:px-0 desk:pt-7">
            <div className="px-1 text-sm font-semibold tracking-wide text-text-muted uppercase desk:px-0">
              Five steps, about five minutes
            </div>
            <StepsPreview />
          </div>

          <div className="mt-auto px-4 pt-8 pb-[max(36px,env(safe-area-inset-bottom))] desk:hidden">
            {lookItUp}
          </div>
        </div>
      </form>
    </div>
  );
}
