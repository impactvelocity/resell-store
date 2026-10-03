import { LivePhotosScreen } from "../../../../../components/listing-live/photos-screen";
import {
  filledCount,
  listPhotos,
  reachStep,
  requireOwnedListing,
  toWorkspaceListing,
  webSuggestions,
} from "../../../../../lib/server/listings";

/* C5 Listing / Photos */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { listing, shop } = await requireOwnedListing((await params).id);
  await reachStep(listing, "photos");
  const photos = await listPhotos(listing.id);
  const { filled, total } = filledCount(listing, 0);
  return (
    <LivePhotosScreen
      listing={toWorkspaceListing(listing, shop)}
      initialPhotos={photos}
      suggestions={webSuggestions(listing)}
      filledWithoutPhotos={filled}
      total={total}
    />
  );
}
