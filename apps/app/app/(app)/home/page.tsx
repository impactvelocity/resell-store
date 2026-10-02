import { Suspense } from "react";
import { HomeScreen } from "../../../components/home/home-screen";

export default function Page() {
  return (
    <Suspense>
      <HomeScreen />
    </Suspense>
  );
}
