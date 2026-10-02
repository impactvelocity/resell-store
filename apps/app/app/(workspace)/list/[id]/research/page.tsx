import { Suspense } from "react";
import { ResearchFlow } from "../../../../../components/listing/research-flow";

// C2 Research and C3 Findings and questions (?view=findings). The prototype
// always shows the dutch oven, whatever the id.
export default function Page() {
  return (
    <Suspense>
      <ResearchFlow />
    </Suspense>
  );
}
