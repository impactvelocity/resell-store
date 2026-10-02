import { MeMenu } from "../../../components/me/me-menu";
import { ProfileSettings } from "../../../components/me/profile-settings";

/* A6 Me. Phone: the Me tab menu. Desktop: Profile and settings. */
export default function Page() {
  return (
    <>
      <MeMenu className="flex desk:hidden" />
      <ProfileSettings className="hidden desk:flex" />
    </>
  );
}
