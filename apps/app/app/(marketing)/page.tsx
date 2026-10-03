import { FinalCta, LandingFooter } from "../../components/landing/closing";
import { ForBuyers } from "../../components/landing/for-buyers";
import { Hero } from "../../components/landing/hero";
import { HowItWorks } from "../../components/landing/how-it-works";
import { LandingMotion } from "../../components/landing/motion";
import { PayPal } from "../../components/landing/paypal";
import { SellerAgent } from "../../components/landing/seller-agent";
import { Sidekick } from "../../components/landing/sidekick";
import { Sponsors } from "../../components/landing/sponsors";
import { VideoDemo } from "../../components/landing/video-demo";
import { WhatYouGet } from "../../components/landing/what-you-get";
import { siteShare, SITE_HEADLINE, SITE_NAME } from "../../lib/og";
import { getSession } from "../../lib/server/session";

export const metadata = siteShare("/", `${SITE_NAME}: ${SITE_HEADLINE.toLowerCase()}`);

/* L1 Landing page. */
export default async function HomePage() {
  const signedIn = Boolean(await getSession());
  return (
    <LandingMotion>
      <main>
        <Hero signedIn={signedIn} />
        <VideoDemo />
        <HowItWorks />
        <SellerAgent />
        <PayPal />
        <Sidekick />
        <WhatYouGet />
        <ForBuyers />
        <Sponsors />
        <FinalCta signedIn={signedIn} />
      </main>
      <LandingFooter />
    </LandingMotion>
  );
}
