import { cn } from "@repo/ui/lib/utils";
import { EmptyState } from "../../empty-state";
import { signInHref } from "../../../lib/safe-next";
import { SiteLink } from "../links";
import { pillLink } from "../parts";
import { SignOutButton } from "./account";

/*
 * P6 Messages and P8 Account for real people: a sign-in prompt when signed
 * out, and honest empty states when there's nothing there yet.
 */

/** Signed out on a page that's only about you. */
export function SignInPrompt({ what }: { what: "messages" | "account" }) {
  return (
    <EmptyState
      surface="public"
      size="lg"
      art={what === "messages" ? "messages" : "garden"}
      tone={what === "messages" ? "pink" : "lemon"}
      title={what === "messages" ? "Sign in to see your messages" : "Sign in to see your account"}
      actions={
        <>
          <SiteLink href={signInHref(`/${what}`)} className={pillLink.primary}>
            Sign in
          </SiteLink>
          <SiteLink href="/discover" className={pillLink.outline}>
            Keep browsing
          </SiteLink>
        </>
      }
      footnote="No password. We email you a link."
    >
      {what === "messages"
        ? "Your questions to sellers, and their answers, live here once you're signed in."
        : "Your orders, offers and the shops you follow live here once you're signed in."}
    </EmptyState>
  );
}

const upcoming = [
  {
    title: "Orders",
    body: "What you buy, with tracking, and where it's at until it's in your hands.",
    when: "Open now, as a test checkout",
  },
  {
    title: "Offers",
    body: "Offers you make under asking, and what sellers say back.",
    when: "Open now",
  },
  {
    title: "Follows",
    body: "Stores you follow, with what they list next. Favourites come later.",
    when: "Open now",
  },
];

/** For people who sell too: the way back to their shops, near the top of the account. */
export function AlsoSelling() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-public-border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-bold">You also sell on resell.store</h2>
        <p className="text-sm text-public-text-muted">
          Listings, offers to answer and sales to ship are on your Home.
        </p>
      </div>
      <SiteLink href="/home?mode=selling" className={pillLink.outline}>
        Manage your shops
      </SiteLink>
    </div>
  );
}

/** P8 with nothing in it yet. */
export function EmptyAccount({ firstName, sells }: { firstName: string; sells?: boolean }) {
  return (
    <main className="mx-auto flex max-w-[1080px] flex-col gap-10 px-4 pt-8 pb-16 desk:px-16 desk:pt-14 desk:pb-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Hi {firstName}.</h1>
          <p className="text-lg text-public-text-muted">
            Nothing needs you today. Your orders, offers and the shops you follow will gather here.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!sells && (
            <SiteLink href="/home?mode=selling" className={pillLink.outline}>
              Start selling
            </SiteLink>
          )}
          <SignOutButton className={cn(pillLink.outline, "cursor-pointer disabled:opacity-60")} />
        </div>
      </div>

      {sells && <AlsoSelling />}

      <EmptyState
        surface="public"
        art="items"
        sticker="Fresh start"
        title="Nothing bought yet"
        actions={
          <>
            <SiteLink href="/discover" className={pillLink.primary}>
              Browse things
            </SiteLink>
            <SiteLink href="/stores" className={pillLink.outline}>
              See the stores
            </SiteLink>
          </>
        }
        className="rounded-xl border border-public-border"
      >
        When you buy something, make an offer or follow a store, it shows up here with what
        happens next.
      </EmptyState>

      <ul className="grid gap-4 md:grid-cols-3">
        {upcoming.map((u) => (
          <li key={u.title} className="flex flex-col gap-1.5 rounded-lg bg-public-photo p-5">
            <h2 className="font-display text-xl font-extrabold tracking-tight">{u.title}</h2>
            <p className="text-sm text-public-text-muted">{u.body}</p>
            <p className="pt-1.5 text-sm font-semibold text-leaf-600">{u.when}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
