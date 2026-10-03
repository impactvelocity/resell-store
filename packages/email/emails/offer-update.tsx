import {
  Actions,
  Button,
  EmailLayout,
  Lead,
  ListingRow,
  Note,
  NotifyFooter,
  Small,
  Tag,
  Title,
} from "../src/components";
import { asset, money } from "../src/config";

/* To the buyer: the shop accepted, countered or declined their offer. */

export type OfferUpdateEmailProps = {
  status: "accepted" | "countered" | "declined";
  shop: string;
  /** What the buyer offered. */
  amount: number;
  /** The shop's counter, when countered. */
  counter?: number | null;
  /** Money the buyer put down. */
  hold?: number | null;
  listing: { title: string; imageUrl?: string | null };
  /** When accepted: "Saturday, 2:11 pm". When countered: how long the counter stands. */
  deadline?: string | null;
  /** Pay, answer the counter, or see the listing. */
  url: string;
};

export const offerUpdateSubject = ({ status, shop, amount, counter }: OfferUpdateEmailProps) =>
  ({
    accepted: `${shop} accepted your ${money(amount)} offer`,
    countered: `${shop} came back with ${money(counter ?? amount)}`,
    declined: `${shop} passed on your ${money(amount)} offer`,
  })[status];

export default function OfferUpdateEmail(props: OfferUpdateEmailProps) {
  const { status, shop, amount, counter, hold, listing, deadline, url } = props;
  const toPay = amount - (hold ?? 0);

  return (
    <EmailLayout
      preview={
        {
          accepted: `It's yours for ${money(amount)}. Pay${deadline ? ` by ${deadline}` : ""} to lock it in.`,
          countered: `You offered ${money(amount)}. They'd take ${money(counter ?? amount)}.`,
          declined: hold ? `Your ${money(hold)} hold is on its way back.` : "It's still listed if you want to try again.",
        }[status]
      }
      footer={<NotifyFooter reason="a shop answers your offer" />}
    >
      {status === "accepted" && (
        <>
          <Tag tone="leaf">Offer accepted</Tag>
          <Title>It's yours for {money(amount)}</Title>
          <Lead>
            {shop} said yes. Pay{deadline ? ` by ${deadline}` : ""} and it ships to you.
          </Lead>
        </>
      )}
      {status === "countered" && (
        <>
          <Tag tone="lemon">Counter offer</Tag>
          <Title>
            {shop} came back with {money(counter ?? amount)}
          </Title>
          <Lead>
            You offered {money(amount)}.
            {deadline ? ` The counter stands until ${deadline}.` : ""}
          </Lead>
        </>
      )}
      {status === "declined" && (
        <>
          <Tag tone="muted">Offer declined</Tag>
          <Title>{shop} passed on {money(amount)}</Title>
          <Lead>It's still listed, so you can try a different number.</Lead>
        </>
      )}

      <ListingRow
        title={listing.title}
        imageUrl={listing.imageUrl}
        meta={
          status === "countered"
            ? `Your offer ${money(amount)} · Their counter ${money(counter ?? amount)}`
            : `${status === "accepted" ? "Agreed" : "You offered"} ${money(amount)}`
        }
      />

      {status === "accepted" && hold ? (
        <Note tone="lemon" label="Your hold">
          The {money(hold)} you put down comes off the price, so you pay {money(toPay)} more.
        </Note>
      ) : null}
      {status === "declined" && hold ? (
        <Note tone="muted" label="Your hold">
          The {money(hold)} you put down is on its way back. PayPal usually takes a day or two.
        </Note>
      ) : null}

      <Actions>
        {status === "accepted" && <Button href={url}>Pay {money(toPay)} with PayPal</Button>}
        {status === "countered" && (
          <>
            <Button href={url}>Accept {money(counter ?? amount)}</Button>
            <Button href={url} variant="secondary">
              Make another offer
            </Button>
          </>
        )}
        {status === "declined" && (
          <Button href={url} variant="secondary">
            See the listing
          </Button>
        )}
      </Actions>
      {status === "accepted" && deadline && (
        <Small>If it isn't paid by {deadline}, it goes back on sale.</Small>
      )}
    </EmailLayout>
  );
}

OfferUpdateEmail.PreviewProps = {
  status: "accepted",
  shop: "Maya's Closet",
  amount: 20,
  counter: 22,
  hold: 5,
  listing: { title: "Linen wrap dress", imageUrl: asset("dress.png") },
  deadline: "Saturday, 2:11 pm",
  url: "https://resell.store/checkout/linen-wrap-dress",
} satisfies OfferUpdateEmailProps;
