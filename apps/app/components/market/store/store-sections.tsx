import { cn } from "@repo/ui/lib/utils";
import type { Review, SoldItem } from "../../../lib/mock-market";
import { formatPrice } from "../../../lib/mock-market";
import { ListingImage } from "../parts";

/** Section title with a muted aside and a green "see all" action on the right. */
export function SectionHeader({
  title,
  aside,
  action,
  onAction,
}: {
  title: string;
  aside: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1 desk:flex-row desk:items-baseline desk:gap-3.5">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          {title}
        </h2>
        <p className="text-base text-public-text-muted">{aside}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 cursor-pointer rounded-sm text-sm font-semibold whitespace-nowrap text-leaf-600 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          {action}
        </button>
      )}
    </div>
  );
}

/** A thing that already sold: photo with a green Sold sticker, what it went for and when. */
function SoldCard({ item }: { item: SoldItem }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative flex aspect-[243/210] w-full items-center justify-center overflow-hidden rounded-2xl bg-public-photo">
        <ListingImage
          photo={item.photo}
          art={item.art}
          artSize={110}
          artClassName="h-auto max-w-[50%]"
        />
        <span
          className="absolute bottom-3 left-2.5 origin-top-left rounded-full bg-leaf-600 px-3 py-[3px] font-display text-sm font-extrabold text-white"
          style={{ rotate: "-4deg" }}
        >
          Sold
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-base font-semibold">{item.title}</p>
        <p className="text-sm text-public-text-muted">
          {formatPrice(item.price)}, {item.when}
        </p>
      </div>
    </div>
  );
}

export function SoldGrid({ items, className }: { items: SoldItem[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 desk:grid-cols-5 desk:gap-6",
        className,
      )}
    >
      {items.map((item, i) => (
        <SoldCard key={`${i}-${item.title}`} item={item} />
      ))}
    </div>
  );
}

export function ReviewList({ reviews, className }: { reviews: Review[]; className?: string }) {
  return (
    <div className={cn("grid gap-8 desk:grid-cols-3 desk:gap-12", className)}>
      {reviews.map((r) => (
        <figure key={r.by} className="flex flex-col gap-3.5">
          <blockquote className="text-lg font-medium">{r.quote}</blockquote>
          <figcaption className="text-sm text-public-text-muted">{r.by}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/** What a tab shows when the mock catalog has nothing for this store yet. */
export function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-public-photo px-6 py-10 text-center text-base text-public-text-muted">
      {children}
    </p>
  );
}
