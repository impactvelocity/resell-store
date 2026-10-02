import { Suspense } from "react";
import { SearchScreen } from "../../../components/home/search-screen";

export default function Page() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  );
}
