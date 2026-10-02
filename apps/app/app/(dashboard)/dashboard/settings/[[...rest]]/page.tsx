import { UserProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function SettingsPage() {
  await auth.protect();

  return <UserProfile path="/dashboard/settings" />;
}
