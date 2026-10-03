import { LiveElsewhereScreen } from "../../../../../components/listing-live/elsewhere-screen";
import { LivePublishScreen } from "../../../../../components/listing-live/publish-screen";
import {
  filledCount,
  listPhotos,
  reachStep,
  requireOwnedListing,
  toWorkspaceListing,
} from "../../../../../lib/server/listings";

/* C7 Listing / Publish and share, and C8 List elsewhere (?view=elsewhere) */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ id }, { view }] = await Promise.all([params, searchParams]);
  const { listing, shop } = await requireOwnedListing(id);
  await reachStep(listing, "publish");
  const photos = await listPhotos(listing.id);
  const { filled, total } = filledCount(listing, photos.length);
  const props = { listing: toWorkspaceListing(listing, shop), photos, filled, total };
  return view === "elsewhere" ? <LiveElsewhereScreen {...props} /> : <LivePublishScreen {...props} />;
}
