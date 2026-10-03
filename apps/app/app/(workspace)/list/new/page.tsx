import Link from "next/link";
import { Button } from "@repo/ui/button";
import { EmptyState } from "../../../../components/empty-state";
import { StartScreen } from "../../../../components/listing/start-screen";
import { startListing } from "../../../actions/listings";
import { requireUser } from "../../../../lib/server/session";
import { listOwnedShops } from "../../../../lib/server/shops";

// C1. A listing always lives in a shop, so a first-timer opens one first.
export default async function Page({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const user = await requireUser();
  const shops = await listOwnedShops(user.id);
  const { shop } = await searchParams;

  if (shops.length === 0) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <EmptyState
          size="lg"
          art="items"
          sticker="Step one"
          title="First, a shop to put it in"
          actions={
            <>
              <Button render={<Link href="/shops/new" />} nativeButton={false}>
                Open my shop
              </Button>
              <Button variant="soft" render={<Link href="/home" />} nativeButton={false}>
                Not now
              </Button>
            </>
          }
        >
          Every listing lives in one of your shops. It takes a minute: a name, a link, a colour.
        </EmptyState>
      </main>
    );
  }

  const defaultShop = shops.find((s) => s.slug === shop)?.slug ?? shops[0]!.slug;
  return (
    <StartScreen
      live={{
        shops: shops.map((s) => ({ slug: s.slug, name: s.name })),
        defaultShop,
        action: startListing,
      }}
    />
  );
}
