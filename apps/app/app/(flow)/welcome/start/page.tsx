import { ChooseModeScreen } from "../../../../components/welcome/choose-mode";
import { completeOnboarding } from "../../../actions/account";
import { requireUser } from "../../../../lib/server/session";

// A2. Buying or selling, saved on the account.
export default async function Page() {
  await requireUser({ onboarded: false });
  return <ChooseModeScreen onChoose={completeOnboarding} />;
}
