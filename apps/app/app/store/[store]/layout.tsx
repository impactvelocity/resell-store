import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LikesProvider } from "../../../components/market/likes";
import { StoreZone } from "../../../components/market/links";
import { MarketFooter } from "../../../components/market/site-footer";
import { MarketHeader } from "../../../components/market/site-header";
import { likedListingIds } from "../../../lib/server/likes";
import { getPublicStore, publicViewer } from "../../../lib/server/market";
import { countUnread } from "../../../lib/server/messages";

/*
 * Everything on {store}.resell.store. proxy.ts rewrites the subdomain onto this
 * segment, so URLs in the browser never show /store/.
 */

type Props = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const viewer = await publicViewer();
  const found = await getPublicStore((await params).store, viewer?.id);
  return { title: found ? `${found.store.name} · resell.store` : "resell.store" };
}

export default async function StoreLayout({
  params,
  children,
}: Props & { children: React.ReactNode }) {
  const { store: slug } = await params;
  const viewer = await publicViewer();
  // Private stores are only there for their owner
  const found = await getPublicStore(slug, viewer?.id);
  if (!found) notFound();
  const unread = viewer ? await countUnread(viewer.id, "buyer") : 0;
  const liked = viewer ? await likedListingIds(viewer.id) : [];

  return (
    <StoreZone store={found.store.slug}>
      <LikesProvider liked={liked}>
        <div className="flex min-h-dvh flex-col bg-public-background">
          <MarketHeader signedIn={!!viewer} initial={viewer?.initial} unread={unread} />
          <div className="flex-1">{children}</div>
          <MarketFooter />
        </div>
      </LikesProvider>
    </StoreZone>
  );
}
