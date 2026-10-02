import { EditProfile } from "../../../../components/me/edit-profile";
import { ProfileSettings } from "../../../../components/me/profile-settings";

/* A7 Edit profile. Desktop shows the same Profile and settings page as /me. */
export default function Page() {
  return (
    <>
      <EditProfile className="flex desk:hidden" />
      <ProfileSettings className="hidden desk:flex" />
    </>
  );
}
