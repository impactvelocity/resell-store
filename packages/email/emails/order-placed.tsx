import { Section, Text } from "react-email";
import {
  Actions,
  Button,
  EmailLayout,
  ListingRow,
  Note,
  NotifyFooter,
  Receipt,
  Small,
  Steps,
  Tag,
  styles,
} from "../src/components";
import { asset, money } from "../src/config";
import { color, font, radius } from "../src/theme";

/* To the buyer: their receipt. What they paid, where it's going, and how their money is kept safe. */

export type OrderPlacedEmailProps = {
  shop: string;
  listing: { title: string; imageUrl?: string | null };
  item: number;
  shipping: number;
  total: number;
  /** "Jess Park, United States" */
  shipTo: string;
  /** "Friday" */
  shipBy: string;
  /** A test checkout: no money moved. */
  test?: boolean;
  orderUrl: string;
};

export const orderPlacedSubject = ({ listing }: OrderPlacedEmailProps) => `Your receipt: ${listing.title}`;

export default function OrderPlacedEmail({
  shop,
  listing,
  item,
  shipping,
  total,
  shipTo,
  shipBy,
  test,
  orderUrl,
}: OrderPlacedEmailProps) {
  return (
    <EmailLayout
      preview={`You paid ${money(total)}. ${shop} ships it by ${shipBy}.`}
      footer={<NotifyFooter reason="you buy something" />}
    >
      <Section style={hero}>
        <Tag tone="leaf">It's yours</Tag>
        <Text style={heroTitle}>{listing.title}</Text>
        <Text style={{ ...styles.lead, margin: "6px 0 0" }}>
          From {shop}. They'll ship it by {shipBy}.
        </Text>
      </Section>

      <ListingRow title={listing.title} imageUrl={listing.imageUrl} meta={`Going to ${shipTo}`} />

      <Receipt
        lines={[
          { label: "Item", amount: item },
          { label: "Shipping", amount: shipping },
        ]}
        total={{ label: test ? "You paid (test, no money moved)" : "You paid", amount: total }}
      />

      <Note tone="agent" label="Your money is safe">
        PayPal holds it until it arrives. Check it when it lands, then say it's all good and {shop} gets paid. Something
        wrong? Tell us within 3 days of it arriving and they aren't paid until it's sorted.
      </Note>

      <Steps
        steps={[
          { title: `${shop} ships it`, body: `By ${shipBy}. We'll email you the tracking.` },
          { title: "You check it", body: "When it arrives, have a good look." },
          { title: "Say it's all good", body: "That's when the seller gets paid." },
        ]}
      />

      <Actions>
        <Button href={orderUrl}>See your order</Button>
      </Actions>
      <Small>If it hasn't shipped by {shipBy}, you can cancel for a full refund.</Small>
    </EmailLayout>
  );
}

OrderPlacedEmail.PreviewProps = {
  shop: "Maya's Closet",
  listing: { title: "Linen wrap dress", imageUrl: asset("dress.png") },
  item: 20,
  shipping: 9,
  total: 29,
  shipTo: "Jess Park, United States",
  shipBy: "Friday",
  orderUrl: "https://resell.store/account/orders/123",
} satisfies OrderPlacedEmailProps;

const hero = {
  padding: "24px 24px 22px",
  background: color.leaf100,
  borderRadius: radius.md,
  textAlign: "center" as const,
};

const heroTitle = {
  margin: 0,
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: 32,
  lineHeight: "36px",
  letterSpacing: "-0.02em",
  color: color.text,
};
