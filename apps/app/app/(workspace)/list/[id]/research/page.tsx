import { LiveResearch } from "../../../../../components/listing/live-research";
import { loadMessages } from "../../../../../lib/server/listing-chat";
import { listPhotos, reachStep, requireOwnedListing } from "../../../../../lib/server/listings";
import { latestRun } from "../../../../../lib/server/research";

// C2 Research and C3 Findings and questions, on the real listing.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { listing, shop } = await requireOwnedListing((await params).id);
  await reachStep(listing, "research");
  const [run, photos, messages] = await Promise.all([
    latestRun(listing.id),
    listPhotos(listing.id),
    loadMessages(listing.id, "research"),
  ]);

  return (
    <LiveResearch
      listingId={listing.id}
      prompt={listing.prompt}
      shopName={shop.name}
      closeHref={`/shops/${shop.slug}`}
      photos={photos.filter((p) => !p.isVideo).map((p) => p.url)}
      initial={{
        run: run && { id: run.id, status: run.status, steps: run.steps },
        listing: {
          name: listing.name,
          fields: listing.fields,
          findings: listing.findings,
          priceCents: listing.priceCents,
          lowestCents: listing.lowestCents,
        },
      }}
      initialMessages={messages}
    />
  );
}
