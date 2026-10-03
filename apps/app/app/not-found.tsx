import type { Metadata } from "next";
import { Button } from "@repo/ui/button";
import { Wordmark } from "@repo/ui/logo";
import { SearchField } from "@repo/ui/search-field";
import { BerriesMark, FlowerMark, SliceMark } from "@repo/ui/whimsy";
import { Float, Pop } from "../components/landing/motion";
import { SwingTag } from "../components/not-found/swing-tag";
import { siteUrl } from "../lib/urls";

export const metadata: Metadata = { title: "Page not found · resell.store" };

/*
 * The 404 for every zone: the marketplace, stores and the app. Links are
 * absolute to the marketplace, so they work from a store subdomain too.
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <header className="mx-auto flex w-full max-w-[1440px] items-center px-4 py-5 md:px-12 md:py-7">
        <a href={siteUrl("/")} aria-label="resell.store home">
          <Wordmark />
        </a>
      </header>

      <main className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center gap-12 px-4 pt-4 pb-20 md:flex-row md:gap-20 md:px-12 md:pt-10">
        <div className="flex shrink-0 justify-center md:w-[300px]">
          <SwingTag />
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-6 text-center md:items-start md:text-left">
          <h1 className="font-display text-[44px] leading-[46px] font-extrabold tracking-[-0.035em] md:text-[64px] md:leading-[64px]">
            We couldn&apos;t find that page
          </h1>
          <p className="max-w-[480px] text-lg text-text-muted md:text-xl md:leading-8">
            It might have sold, moved shops, or the link has a typo. Try a search,
            or head back to the marketplace.
          </p>
          <form action={siteUrl("/discover")} method="get" role="search" className="w-full max-w-[480px]">
            <SearchField name="q" placeholder="Search things, shops and sellers" aria-label="Search the marketplace" />
          </form>
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Button className="h-12 px-6" render={<a href={siteUrl("/discover")} />} nativeButton={false}>
              Go to the marketplace
            </Button>
            <Button
              variant="soft"
              className="h-12 border px-6"
              render={<a href={siteUrl("/")} />}
              nativeButton={false}
            >
              Back to the start
            </Button>
          </div>
        </div>

        <Pop immediate className="pointer-events-none absolute top-0 right-6 hidden md:block" rotate={-120} delay={0.6}>
          <Float tilt={16} duration={5}>
            <FlowerMark size={56} />
          </Float>
        </Pop>
        <Pop immediate className="pointer-events-none absolute bottom-10 left-2 hidden md:block" rotate={90} delay={0.8}>
          <Float tilt={-14} duration={6} delay={0.4}>
            <SliceMark size={72} />
          </Float>
        </Pop>
        <Pop immediate className="pointer-events-none absolute right-24 bottom-4 hidden md:block" rotate={30} delay={1}>
          <Float distance={10} duration={4} delay={0.8}>
            <BerriesMark size={64} />
          </Float>
        </Pop>
      </main>
    </div>
  );
}
