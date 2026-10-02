import { ElsewhereScreen } from "../../../../../components/listing-later/elsewhere-screen";
import { PublishScreen } from "../../../../../components/listing-later/publish-screen";

/* C7 Listing / Publish and share, and C8 List elsewhere (?view=elsewhere) */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return view === "elsewhere" ? <ElsewhereScreen /> : <PublishScreen />;
}
