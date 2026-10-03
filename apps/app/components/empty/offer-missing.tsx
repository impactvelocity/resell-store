import { MobileBackHeader, Page } from "../shell/page";
import { EmptyState } from "../empty-state";
import { ActionLink } from "./parts";
import { things, type SellerSummary } from "./summary";

/* C10 Offer, live, when the link doesn't match an offer (none are stored yet). */
export function OfferMissing({ seller }: { seller: SellerSummary }) {
  return (
    <>
      <MobileBackHeader title="Offer" backHref="/inbox" className="h-[52px] pt-0" />
      <Page className="desk:pt-8">
        <div className="rounded-xl desk:border desk:border-border desk:bg-surface">
          <EmptyState
            size="lg"
            art="messages"
            tone="pink"
            sticker="Hmm"
            stickerTone="primary"
            title="This offer isn't here"
            actions={
              <>
                <ActionLink href="/inbox">Go to your inbox</ActionLink>
                {seller.shopHref && (
                  <ActionLink href={seller.shopHref} variant="soft">
                    See your shop
                  </ActionLink>
                )}
              </>
            }
          >
            {seller.live > 0
              ? `It may have been withdrawn, or the link is off. You have ${things(seller.live)} live, and every offer on them shows up in your inbox.`
              : "It may have been withdrawn, or the link is off. When someone makes an offer on your things, it shows up in your inbox."}
          </EmptyState>
        </div>
      </Page>
    </>
  );
}
