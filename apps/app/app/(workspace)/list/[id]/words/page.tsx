import { LiveWordsScreen } from "../../../../../components/listing-live/words-screen";
import { aiConfigured } from "../../../../../lib/server/ai";
import {
  filledCount,
  listCopies,
  listPhotos,
  reachStep,
  requireOwnedListing,
  toWorkspaceListing,
} from "../../../../../lib/server/listings";

/* C6 Listing / Words */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user, listing, shop } = await requireOwnedListing((await params).id);
  await reachStep(listing, "words");
  const [photos, copies] = await Promise.all([listPhotos(listing.id), listCopies(listing.id)]);
  const { filled, total } = filledCount(listing, photos.length);
  return (
    <LiveWordsScreen
      listing={toWorkspaceListing(listing, shop)}
      initialCopies={copies.map((c) => ({
        id: c.id,
        tone: c.tone,
        title: c.title,
        oneLiner: c.oneLiner,
        description: c.description,
        teaser: c.teaser,
      }))}
      photos={photos}
      aiReady={aiConfigured}
      writingStyle={user.writingStyle}
      filled={filled}
      total={total}
    />
  );
}
