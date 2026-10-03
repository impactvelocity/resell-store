"use client";

import { ModeSwitch } from "../home/parts";
import { SellingPhone } from "../home/selling";
import { MobileTopBar } from "../shell/page";

/*
 * The real A3 Home (selling) screen, frozen inside a phone for the L1 hero.
 * `inert` keeps its links and buttons out of the tab order and unclickable.
 */

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-8 pt-[21px] pb-[19px] font-[system-ui,sans-serif] text-[17px] leading-[22px] font-semibold text-black">
      <span className="w-[54px] text-center">9:41</span>
      <svg width="82" height="22" viewBox="0 0 82 22" fill="#000">
        <path d="M3.7 13H2.5a1 1 0 0 0-1 1v2.5a1 1 0 0 0 1 1h1.2a1 1 0 0 0 1-1V14a1 1 0 0 0-1-1m5.2-2.5H7.7a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.2a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1M14.1 8h-1.2a1 1 0 0 0-1 1v7.5a1 1 0 0 0 1 1h1.2a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1m5.2-2.5h-1.2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1.2a1 1 0 0 0 1-1v-10a1 1 0 0 0-1-1" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M36.57 7.8c2.49 0 4.88.92 6.68 2.58.14.13.36.12.49 0l1.3-1.27a.34.34 0 0 0 0-.5 12.55 12.55 0 0 0-16.93 0 .34.34 0 0 0 0 .5l1.3 1.26c.13.13.34.14.48 0a10 10 0 0 1 6.68-2.57m0 4.22a5.4 5.4 0 0 1 3.67 1.44c.14.13.35.13.48 0l1.3-1.33a.37.37 0 0 0-.01-.52 7.9 7.9 0 0 0-10.88 0 .37.37 0 0 0 0 .52l1.29 1.32c.13.14.34.14.48 0 1-.92 2.31-1.43 3.67-1.43m2.52 2.8q0 .15-.1.28l-2.18 2.45a.3.3 0 0 1-.24.11.3.3 0 0 1-.24-.1l-2.18-2.46a.43.43 0 0 1 .01-.56 3.44 3.44 0 0 1 4.82 0 .4.4 0 0 1 .11.28"
        />
        <rect
          x="52.5"
          y="5.5"
          width="24"
          height="12"
          rx="3.8"
          fill="none"
          stroke="#000"
          strokeOpacity="0.35"
        />
        <rect x="54" y="7" width="21" height="9" rx="2.5" />
        <path
          d="M78 9.5v4.08a2.2 2.2 0 0 0 1.33-2.04A2.2 2.2 0 0 0 78 9.5"
          fillOpacity="0.35"
        />
      </svg>
    </div>
  );
}

export function HeroPhone({ className }: { className?: string }) {
  return (
    <div inert aria-hidden className={className}>
      <div className="h-full w-[390px] overflow-hidden bg-background">
        <StatusBar />
        <MobileTopBar className="pt-1 desk:flex" />
        <div className="px-4 pt-5">
          <ModeSwitch
            mode="selling"
            onModeChange={() => {}}
            className="w-full"
            tabClassName="h-11"
          />
        </div>
        <SellingPhone offerAccepted={false} onAcceptOffer={() => {}} />
      </div>
    </div>
  );
}
