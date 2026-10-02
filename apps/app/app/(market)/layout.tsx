import { MarketHeader } from "../../components/market/site-header";

/** resell.store marketplace pages: white ground, the public header. */
export default function MarketLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-public-background">
      <MarketHeader />
      {children}
    </div>
  );
}
