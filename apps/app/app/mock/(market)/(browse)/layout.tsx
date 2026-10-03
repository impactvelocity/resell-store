import { MarketFooter } from "../../../../components/market/site-footer";

/** Pages you scroll, as opposed to Messages which fills the window. */
export default function BrowseLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="flex-1">{children}</div>
      <MarketFooter />
    </>
  );
}
