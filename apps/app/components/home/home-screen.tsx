"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@repo/ui/toast";
import { me } from "../../lib/mock";
import { jessOffer, type BuyerOffer, type HomeMode } from "../../lib/mock-home";
import { BellButton, MobileTopBar, Page } from "../shell/page";
import { BuyingDesktop, BuyingPhone } from "./buying";
import { homeHref, parseMode, readStoredMode, storeMode } from "./mode";
import { ModeSwitch } from "./parts";
import { SellingDesktop, SellingPhone } from "./selling";

/**
 * A3/A4 Home. One route, `?mode=selling|buying`.
 * The switch swaps content in place, rewrites the query without a scroll and
 * remembers the choice on this device. No query and nothing stored = selling.
 */
export function HomeScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryMode = parseMode(searchParams.get("mode"));

  // The tap shows straight away; the URL catches up a moment later.
  const [picked, setPicked] = useState<{
    mode: HomeMode;
    from: HomeMode | null;
  } | null>(null);
  const mode: HomeMode =
    picked && picked.from === queryMode ? picked.mode : (queryMode ?? "selling");

  useEffect(() => {
    if (queryMode) {
      storeMode(queryMode);
    } else {
      router.replace(homeHref(readStoredMode() ?? "selling"), { scroll: false });
    }
  }, [queryMode, router]);

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
    offerAccepted,
    onAcceptOffer: () => {
      setOfferAccepted(true);
      toast.add({
        title: `You accepted $${jessOffer.amount}. ${jessOffer.buyer} pays the rest next.`,
      });
    },
  };
  const buying = {
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
        {mode === "selling" ? (
          <SellingPhone {...selling} />
        ) : (
          <BuyingPhone {...buying} />
        )}
      </div>

      {/* Desktop */}
      <Page className="hidden desk:flex">
        <div className="flex items-center justify-between gap-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Evening, {me.firstName}.
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
        {mode === "selling" ? (
          <SellingDesktop {...selling} />
        ) : (
          <BuyingDesktop {...buying} />
        )}
      </Page>
    </>
  );
}
