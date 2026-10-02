import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Button } from "@repo/ui/button";
import { SparkleIcon } from "@repo/ui/icons";
import { Sticker } from "@repo/ui/sticker";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-page flex-col justify-center gap-8 px-4 py-16 md:px-6">
      <Sticker tone="accent" rotate={4}>
        Just listed
      </Sticker>
      <h1 className="max-w-[820px] font-display text-5xl font-extrabold tracking-[-0.04em] md:text-[112px] md:leading-[104px]">
        Your closet, open for business.
      </h1>
      <p className="max-w-md text-lg text-text-muted">
        Snap a photo and your agent writes the listing, sets a fair price, and
        posts it to your shop. You approve, it handles the rest.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Show
          when="signed-in"
          fallback={
            <Button render={<Link href="/welcome" />} nativeButton={false}>
              <SparkleIcon />
              Open your shop
            </Button>
          }
        >
          <Button render={<Link href="/dashboard" />} nativeButton={false}>
            <SparkleIcon />
            Go to your shop
          </Button>
        </Show>
        <Button
          variant="soft"
          render={<Link href="/screens" />}
          nativeButton={false}
        >
          See every screen
        </Button>
        <Button
          variant="ghost"
          render={<Link href="/design-system" />}
          nativeButton={false}
        >
          See the design system
        </Button>
      </div>
    </main>
  );
}
