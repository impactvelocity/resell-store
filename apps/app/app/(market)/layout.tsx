import { LikesProvider } from "../../components/market/likes";
import { MarketHeader } from "../../components/market/site-header";
import { likedListingIds } from "../../lib/server/likes";
import { publicViewer } from "../../lib/server/market";
import { countUnread } from "../../lib/server/messages";

/** resell.store marketplace pages: white ground, the public header. */
export default async function MarketLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await publicViewer();
  const unread = viewer ? await countUnread(viewer.id, "buyer") : 0;
  const liked = viewer ? await likedListingIds(viewer.id) : [];
  return (
    <LikesProvider liked={liked}>
      <div className="flex min-h-dvh flex-col bg-public-background">
        <MarketHeader signedIn={!!viewer} initial={viewer?.initial} unread={unread} />
        {children}
      </div>
    </LikesProvider>
  );
}
