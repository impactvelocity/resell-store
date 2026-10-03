"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@repo/ui/toast";
import { jessOffer, type BuyerOffer, type HomeMode } from "../../lib/mock-home";
import type { FollowedShop as LiveFollowedShop } from "../../lib/server/follows";
import { BellButton, MobileTopBar, Page } from "../shell/page";
import { useViewer } from "../viewer";
import { BuyingDesktop, BuyingPhone } from "./buying";
import { homeHref, parseMode, readStoredMode, storeMode } from "./mode";
import { ModeSwitch } from "./parts";
import { SellingDesktop, SellingPhone, type SellingLive } from "./selling";

export type HomeLive = SellingLive & {
  /** From A2, used until the person picks on this device. */
  defaultMode: HomeMode;
  /** Buying mode: the shops they follow, with their newest listings. */
  followed?: LiveFollowedShop[];
};

function greeting(hour: number) {
  if (hour < 5) return "Evening";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

/**
 * A3/A4 Home. One route, `?mode=selling|buying`.
 * The switch swaps content in place, rewrites the query without a scroll and
 * remembers the choice on this device. No query and nothing stored = selling.
 */
export function HomeScreen({ live }: { live?: HomeLive } = {}) {
  const router = useRouter();
  const { firstName } = useViewer();
  const fallbackMode = live?.defaultMode ?? "selling";
  const searchParams = useSearchParams();
  const queryMode = parseMode(searchParams.get("mode"));

  // The tap shows straight away; the URL catches up a moment later.
  const [picked, setPicked] = useState<{
    mode: HomeMode;
    from: HomeMode | null;
  } | null>(null);
  const mode: HomeMode =
    picked && picked.from === queryMode ? picked.mode : (queryMode ?? fallbackMode);

  useEffect(() => {
    if (queryMode) {
      storeMode(queryMode);
    } else {
      router.replace(homeHref(readStoredMode() ?? fallbackMode), { scroll: false });
    }
  }, [queryMode, router, fallbackMode]);

  function changeMode(next: HomeMode) {
    if (next === mode) return;
    setPicked({ mode: next, from: queryMode });
    storeMode(next);
    router.replace(homeHref(next), { scroll: false });
  }

  // Prototype state: accepting the offer or paying only lives on this page.
  const toast = useToast();
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [paid, setPaid] = useState<Record<string, boolean>>({});

  const selling = {
    live,
    offerAccepted,
    onAcceptOffer: () => {
      setOfferAccepted(true);
      toast.add({
        title: `You accepted $${jessOffer.amount}. ${jessOffer.buyer} pays the rest next.`,
      });
    },
  };
  const buying = {
    live: !!live,
    followed: live?.followed,
    paid,
    onPay: (offer: BuyerOffer) => {
      setPaid((current) => ({ ...current, [offer.id]: true }));
      toast.add({ title: `Paid $${offer.amount}. It's yours.` });
    },
  };

  return (
    <>
      {/* Phone */}
      <div className="flex flex-col desk:hidden">
        <MobileTopBar />
        <div className="px-4 pt-5">
          <ModeSwitch
            mode={mode}
            onModeChange={changeMode}
            className="w-full"
            tabClassName="h-11"
          />
        </div>
        {mode === "selling" ? <SellingPhone {...selling} /> : <BuyingPhone {...buying} />}
      </div>

      {/* Desktop */}
      <Page className="hidden desk:flex">
        <div className="flex items-center justify-between gap-6">
          {/* The server's clock may not be the reader's; the client's greeting wins */}
          <h1
            className="font-display text-3xl font-extrabold tracking-tight"
            suppressHydrationWarning
          >
            {live ? greeting(new Date().getHours()) : "Evening"}, {firstName}.
          </h1>
          <div className="flex items-center gap-3">
            <ModeSwitch
              mode={mode}
              onModeChange={changeMode}
              className="w-[240px]"
              tabClassName="h-10"
            />
            <BellButton size="lg" />
          </div>
        </div>
        {mode === "selling" ? <SellingDesktop {...selling} /> : <BuyingDesktop {...buying} />}
      </Page>
    </>
  );
}
