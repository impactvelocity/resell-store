import { ProfileProvider } from "../../../components/me/profile-context";

/* A6 Me and A7 Edit profile share the saved profile. */
export default function MeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ProfileProvider>{children}</ProfileProvider>;
}
