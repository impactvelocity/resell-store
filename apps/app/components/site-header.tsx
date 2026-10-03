import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Wordmark } from "@repo/ui/logo";
import { getSession } from "../lib/server/session";

const links = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Your seller agent", href: "/#seller-agent" },
  { label: "Shopping sidekick", href: "/#sidekick" },
  { label: "Marketplace", href: "/discover" },
];

/** L1 nav: wordmark, section links, log in and the lemon CTA. */
export async function SiteHeader() {
  const session = await getSession();
  return (
    <header>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 py-5 md:px-12 md:py-7 xl:px-24">
        <Link href="/" aria-label="resell.store home" className="rounded-full">
          <Wordmark size="md" className="max-sm:text-xl" />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-base font-semibold hover:text-secondary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <Button
              className="h-12 px-6"
              render={<Link href="/home" />}
              nativeButton={false}
            >
              Your shop
            </Button>
          ) : (
            <>
              <Link
                href="/welcome"
                className="hidden px-3 text-base font-semibold hover:text-secondary sm:block"
              >
                Log in
              </Link>
              <Button
                className="h-12 px-6"
                render={<Link href="/welcome" />}
                nativeButton={false}
              >
                Open your shop
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
