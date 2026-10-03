import type { Metadata } from "next";
import { DocsChrome } from "../../components/docs/chrome";
import { docsBase } from "../../lib/docs/base";
import { siteUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: { default: "resell.store docs", template: "%s · resell.store docs" },
  description: "Guides for selling and buying on resell.store, the API, and connecting your own AI.",
};

/* docs.resell.store (rewritten here by proxy.ts), also reachable at /docs. */
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const base = await docsBase();
  return (
    <DocsChrome base={base} appUrl={siteUrl("/")}>
      {children}
    </DocsChrome>
  );
}
