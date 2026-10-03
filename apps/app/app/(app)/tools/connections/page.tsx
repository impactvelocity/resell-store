import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronRightIcon, CodeIcon, SparkleIcon } from "@repo/ui/icons";
import { ComingSoon, LetterTile, SoonCard } from "../../../../components/empty/coming-soon";
import { PayPalConnect } from "../../../../components/tools/paypal-connect";
import {
  CONNECTING_COOKIE,
  getPayPalAccount,
  paypalEnabled,
  paypalSandbox,
  readiness,
  sandboxLogin,
  syncPayPalAccount,
} from "../../../../lib/server/paypal-sellers";
import { demoSellerId } from "../../../../lib/server/paypal";
import { requireUser } from "../../../../lib/server/session";

export const metadata: Metadata = { title: "Connections · resell.store" };

/*
 * D1 Connections, live. PayPal is real (when the server has PayPal keys): it's
 * how sellers get paid. Next to it, the ways to connect your own AI or code.
 * Copying listings to other sites and sharing to social apps are later, and
 * left off rather than shown as Soon.
 */

function ToolLink({
  href,
  tile,
  title,
  description,
}: {
  href: string;
  tile: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex w-full items-center gap-3.5 border-b border-border py-4 outline-none last:border-b-0 focus-visible:outline-2 focus-visible:outline-secondary"
    >
      {tile}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-bold group-hover:underline">{title}</span>
        <span className="text-sm text-text-muted">{description}</span>
      </span>
      <ChevronRightIcon
        size={20}
        strokeWidth={2.2}
        className="text-text-muted transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ paypal?: string }> }) {
  const user = await requireUser();
  let account = await getPayPalAccount(user.id);
  // Back from PayPal by some other route than its return link: ask PayPal
  if (!account && paypalEnabled() && (await cookies()).has(CONNECTING_COOKIE))
    account = await syncPayPalAccount(user.id).catch(() => null);
  const result = (await searchParams).paypal ?? null;
  return (
    <ComingSoon
      mobileTitle="Connections"
      tone="pink"
      art="items"
      eyebrow="Connections"
      title="Link the accounts you already use"
      description="Get paid through PayPal, and let your own AI app or code work on your shop. Unlink any of them whenever you like."
      {...(paypalEnabled() && {
        // PayPal works, so no "Soon"; once it's connected the cards say it all
        soon: false,
        hero: readiness(account) !== "ready",
        preview: "Copying listings to other places to sell, and posting to your social accounts, come later.",
      })}
    >
      <div className="flex flex-col gap-4 desk:flex-row desk:items-start desk:gap-6">
        <div className="flex flex-col gap-4 desk:flex-1 desk:gap-6">
          <SoonCard title="Getting paid">
            <div className="flex flex-col">
              <PayPalConnect
                enabled={paypalEnabled()}
                state={readiness(account)}
                merchantId={account?.merchantId ?? null}
                result={result}
                demo={account?.demo ?? false}
                sandbox={paypalSandbox() ? { demoSeller: !!demoSellerId(), seller: sandboxLogin("seller") } : null}
              />
            </div>
          </SoonCard>
        </div>
        <div className="flex flex-col gap-4 desk:flex-1 desk:gap-6">
          <SoonCard title="Your own AI and code">
            <div className="flex flex-col">
              <ToolLink
                href="/tools/agent"
                tile={
                  <LetterTile tone="pink">
                    <SparkleIcon size={20} />
                  </LetterTile>
                }
                title="Your own AI"
                description="Let Claude, ChatGPT or another AI app run the shop."
              />
              <ToolLink
                href="/tools/api"
                tile={
                  <LetterTile>
                    <CodeIcon size={20} />
                  </LetterTile>
                }
                title="API"
                description="For developers building on your shop."
              />
            </div>
          </SoonCard>
        </div>
      </div>
    </ComingSoon>
  );
}
