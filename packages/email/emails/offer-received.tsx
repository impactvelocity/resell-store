import {
  Actions,
  Button,
  EmailLayout,
  ListingRow,
  Note,
  NotifyFooter,
  Small,
  Stats,
  Tag,
  Title,
} from "../src/components";
import { asset, money } from "../src/config";

/* To the seller: a buyer made an offer their agent couldn't settle alone. */

export type OfferReceivedEmailProps = {
  buyer: string;
  amount: number;
  asking: number;
  /** The seller's lowest price, when they set one. */
  lowest?: number | null;
  /** Money the buyer put down with the offer. */
  hold?: number | null;
  listing: { title: string; imageUrl?: string | null };
  /** What the seller's agent would do. */
  agentTake?: { title: string; body: string } | null;
  /** "tomorrow, 2:11 pm" */
  expires: string;
  offerUrl: string;
};

export const offerReceivedSubject = ({ buyer, amount, listing }: OfferReceivedEmailProps) =>
  `${buyer} offered ${money(amount)} for “${listing.title}”`;

export default function OfferReceivedEmail({
  buyer,
  amount,
  asking,
  lowest,
  hold,
  listing,
  agentTake,
  expires,
  offerUrl,
}: OfferReceivedEmailProps) {
  return (
    <EmailLayout
      preview={
        agentTake
          ? `Your agent says: ${agentTake.title} ${agentTake.body}`
          : `It's waiting on you until ${expires}.`
      }
      footer={<NotifyFooter reason="someone makes an offer" />}
    >
      <Tag tone="pink">New offer</Tag>
      <Title>
        {buyer} offered {money(amount)}
      </Title>

      <ListingRow
        title={listing.title}
        imageUrl={listing.imageUrl}
        meta={`Listed at ${money(asking)}`}
      />

      <Stats
        items={[
          { label: "Offer", value: money(amount), highlight: true },
          { label: "Your price", value: money(asking) },
          ...(lowest != null ? [{ label: "Your lowest", value: money(lowest) }] : []),
        ]}
      />

      {hold ? (
        <Note tone="lemon" label="Money down">
          {buyer} put {money(hold)} on hold. It comes off the price if you accept and goes back if
          you decline. {buyer} loses it by backing out.
        </Note>
      ) : null}

      {agentTake && (
        <Note tone="agent" label="Your agent" title={agentTake.title}>
          {agentTake.body}
        </Note>
      )}

      <Actions>
        <Button href={offerUrl}>Accept {money(amount)}</Button>
        <Button href={offerUrl} variant="secondary">
          Counter or decline
        </Button>
      </Actions>
      <Small>The offer is open until {expires}. After that it lapses on its own.</Small>
    </EmailLayout>
  );
}

OfferReceivedEmail.PreviewProps = {
  buyer: "Jess",
  amount: 20,
  asking: 24,
  lowest: 20,
  hold: 5,
  listing: { title: "Linen wrap dress", imageUrl: asset("dress.png") },
  agentTake: {
    title: "I'd take it.",
    body: "It's right at your lowest price and Jess put money down, so she's serious. The dress has been up 2 days.",
  },
  expires: "tomorrow, 2:11 pm",
  offerUrl: "https://resell.store/offers/jess-linen-dress",
} satisfies OfferReceivedEmailProps;
