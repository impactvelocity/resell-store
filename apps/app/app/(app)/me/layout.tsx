import { ProfileProvider, type ProfileData } from "../../../components/me/profile-context";
import { notifyRows } from "../../../lib/mock-inbox";
import { requireUser } from "../../../lib/server/session";
import { listOwnedShops } from "../../../lib/server/shops";
import { storeUrl } from "../../../lib/urls";

/* A6 Me and A7 Edit profile share the saved profile. */
export default async function MeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const shops = await listOwnedShops(user.id);
  const prefs = user.notifyPrefs ?? {};
  const reach = Object.keys(prefs)
    .filter((key) => key.startsWith("reach:") && prefs[key])
    .map((key) => key.slice("reach:".length));

  const initial: ProfileData = {
    name: user.name,
    about: user.about ?? "",
    location: user.location ?? "",
    interests: user.interests,
    // The rows are the product's list of alerts; unset ones keep their default
    notify: Object.fromEntries(notifyRows.map((r) => [r.key, prefs[r.key] ?? r.on])),
    reach: user.notifyPrefs ? reach : ["Email"],
  };
  const year = user.createdAt.getFullYear();

  return (
    <ProfileProvider
      initial={initial}
      account={{
        live: true,
        email: user.email,
        since: shops.length ? `Selling since ${year}.` : `Here since ${year}.`,
        image: user.image,
        publicHref: shops[0] ? storeUrl(shops[0].slug) : null,
      }}
    >
      {children}
    </ProfileProvider>
  );
}
