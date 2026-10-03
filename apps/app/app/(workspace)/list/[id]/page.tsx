import { redirect } from "next/navigation";
import { requireOwnedListing } from "../../../../lib/server/listings";

// /list/{id} picks up where the seller left off.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { listing } = await requireOwnedListing((await params).id);
  redirect(`/list/${listing.id}/${listing.step}`);
}
