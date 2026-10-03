import { redirect } from "next/navigation";

// One way in for everyone: A1 signs people up and logs them back in.
export default function Page() {
  redirect("/welcome");
}
