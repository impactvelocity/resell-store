import { SiteLink } from "./links";

/*
 * The seller looking at their own store or listing on the marketplace: a slim
 * line of how it's doing, only for them, with a way into the full stats.
 */
export function OwnerStats({
  stats,
  href,
  hrefLabel,
}: {
  stats: { label: string; value: number }[];
  /** Into the app: the listing's manage page or the shop's stats. */
  href: string;
  hrefLabel: string;
}) {
  return (
    <aside
      aria-label="Your stats, only you see this"
      className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-4 desk:px-16"
    >
      <span className="rounded-full bg-lemon-100 px-2.5 py-1 text-xs font-bold">Only you see this</span>
      {stats.map((s) => (
        <span key={s.label} className="text-sm text-public-text-muted">
          <span className="font-bold text-text">{s.value.toLocaleString("en-US")}</span> {s.label}
        </span>
      ))}
      <SiteLink href={href} className="text-sm font-semibold text-leaf-600 hover:underline">
        {hrefLabel}
      </SiteLink>
    </aside>
  );
}
