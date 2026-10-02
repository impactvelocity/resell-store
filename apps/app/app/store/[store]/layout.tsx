import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreZone } from "../../../components/market/links";
import { MarketFooter } from "../../../components/market/site-footer";
import { MarketHeader } from "../../../components/market/site-header";
import { getStore } from "../../../lib/mock-market";

/*
 * Everything on {store}.resell.store. proxy.ts rewrites the subdomain onto this
 * segment, so URLs in the browser never show /store/.
 */

type Props = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = getStore((await params).store);
  return { title: store ? `${store.name} · resell.store` : "resell.store" };
}

export default async function StoreLayout({
  params,
  children,
}: Props & { children: React.ReactNode }) {
  const { store: slug } = await params;
  const store = getStore(slug);
  if (!store) notFound();

  return (
    <StoreZone store={store.slug}>
      <div className="flex min-h-dvh flex-col bg-public-background">
        <MarketHeader />
        <div className="flex-1">{children}</div>
        <MarketFooter />
      </div>
    </StoreZone>
  );
}
