import { CreateShop } from "../../../../components/shops/create-shop";
import { requireUser } from "../../../../lib/server/session";
import { listOwnedShops } from "../../../../lib/server/shops";

/* B1 Create shop. A first shop starts from the person's name. */
export default async function Page() {
  const user = await requireUser();
  const shops = await listOwnedShops(user.id);
  const firstName = user.name?.trim().split(/\s+/)[0] ?? "";
  const firstShop = shops.length === 0;
  return (
    <CreateShop
      live={{
        suggestedName: firstShop && firstName ? `${firstName}'s shop` : "",
        firstShop,
        backHref: shops[0] ? `/shops/${shops[0].slug}` : "/home?mode=selling",
      }}
    />
  );
}
