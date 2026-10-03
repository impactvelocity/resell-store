import { cn } from "@repo/ui/lib/utils";

/*
 * What a page shows while its data loads (Next's loading.tsx). Locally the
 * database answers instantly so these flash by, but on a real server a tap
 * gets a shape on screen right away instead of nothing happening.
 * Shapes only, no words: they mirror the usual layout of each zone.
 */

/** One pulsing block. `tone` picks the app's cream greys or the marketplace's white greys. */
export function Bone({ className, tone = "app" }: { className?: string; tone?: "app" | "public" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md motion-reduce:animate-none",
        tone === "app" ? "bg-surface-muted" : "bg-public-photo",
        className,
      )}
    />
  );
}

function Busy({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className={className}>
      {children}
    </div>
  );
}

/** Inside the app shell (home, inbox, sales, shops, tools…): a title and a few cards. */
export function AppPageSkeleton() {
  return (
    <Busy className="flex w-full flex-col gap-6 px-4 pt-6 desk:gap-8 desk:px-12 desk:pt-10">
      <Bone className="h-9 w-56 desk:h-11 desk:w-72" />
      <div className="flex flex-col gap-4 desk:flex-row desk:gap-6">
        <Bone className="h-48 rounded-xl desk:w-[400px] desk:shrink-0" />
        <div className="flex flex-1 flex-col gap-3">
          <Bone className="h-20 rounded-lg" />
          <Bone className="h-20 rounded-lg" />
          <Bone className="h-20 rounded-lg" />
        </div>
      </div>
    </Busy>
  );
}

/** Marketplace pages under the public header: a heading and a grid of items. */
export function MarketPageSkeleton() {
  return (
    <Busy className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-16 desk:gap-8 desk:px-16 desk:pt-12">
      <Bone tone="public" className="h-10 w-64 desk:h-12 desk:w-96" />
      <ItemGrid />
    </Busy>
  );
}

/** A store's page: its banner, then its items. */
export function StorePageSkeleton() {
  return (
    <Busy className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-16 desk:gap-10 desk:px-16 desk:pt-10">
      <div className="flex items-center gap-4">
        <Bone tone="public" className="size-16 rounded-full desk:size-24" />
        <div className="flex flex-1 flex-col gap-2">
          <Bone tone="public" className="h-8 w-48 desk:w-72" />
          <Bone tone="public" className="h-4 w-64 desk:w-96" />
        </div>
      </div>
      <ItemGrid />
    </Busy>
  );
}

function ItemGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 desk:grid-cols-4 desk:gap-x-6">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <Bone tone="public" className="aspect-[4/5] rounded-lg" />
          <Bone tone="public" className="h-4 w-3/4" />
          <Bone tone="public" className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Checkout and offers: a form on the left, the order summary on the right. */
export function CheckoutSkeleton() {
  return (
    <Busy className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-16 desk:flex-row desk:gap-12 desk:px-16 desk:pt-28 xl:gap-24">
      <div className="flex flex-1 flex-col gap-5">
        <Bone tone="public" className="h-11 w-48" />
        <Bone tone="public" className="h-24 rounded-lg" />
        <Bone tone="public" className="h-20 rounded-lg" />
        <Bone tone="public" className="h-36 rounded-lg" />
        <Bone tone="public" className="h-14 rounded-full" />
      </div>
      <Bone tone="public" className="hidden h-[420px] rounded-xl desk:block desk:w-[380px] xl:w-[440px]" />
    </Busy>
  );
}

/** The listing workspace: the agent column and the canvas. */
export function WorkspaceSkeleton() {
  return (
    <Busy className="flex min-h-dvh w-full gap-6 bg-background p-4 desk:p-8">
      <div className="flex flex-1 flex-col gap-4">
        <Bone className="h-10 w-48" />
        <Bone className="h-24 rounded-lg" />
        <Bone className="h-24 rounded-lg" />
      </div>
      <Bone className="hidden h-[70dvh] rounded-xl desk:block desk:w-[45%]" />
    </Busy>
  );
}
