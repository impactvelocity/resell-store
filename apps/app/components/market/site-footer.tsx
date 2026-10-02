import { ShieldCheckIcon } from "@repo/ui/icons";
import { SiteLink } from "./links";

const links = [
  { label: "How it works", href: "/discover" },
  { label: "Buyer protection", href: "/discover" },
  { label: "Connect your agent", href: "/agent" },
  { label: "Help", href: "/discover" },
];

export function MarketFooter() {
  return (
    <footer className="border-t border-public-border">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-7 desk:flex-row desk:items-center desk:justify-between desk:px-16">
        <p className="flex items-center gap-2.5 text-sm font-medium">
          <ShieldCheckIcon size={18} strokeWidth={2.2} className="shrink-0 text-leaf-600" />
          Every order is paid through PayPal and held until it arrives.
        </p>
        <nav className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-public-text-muted">
          {links.map((l) => (
            <SiteLink key={l.label} href={l.href} className="hover:text-text">
              {l.label}
            </SiteLink>
          ))}
        </nav>
      </div>
    </footer>
  );
}
