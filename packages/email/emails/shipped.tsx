import { Column, Row, Section, Text } from "react-email";
import {
  Actions,
  Button,
  EmailLayout,
  Lead,
  ListingRow,
  NotifyFooter,
  Small,
  Tag,
  Title,
} from "../src/components";
import { asset } from "../src/config";
import { color, font, radius } from "../src/theme";

/* To the buyer: the seller dropped it off. */

export type ShippedEmailProps = {
  shop: string;
  listing: { title: string; imageUrl?: string | null };
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  /** "Tuesday" */
  eta?: string | null;
  orderUrl: string;
};

export const shippedSubject = ({ listing }: ShippedEmailProps) => `${listing.title} is on its way`;

export default function ShippedEmail({
  shop,
  listing,
  carrier,
  trackingNumber,
  trackingUrl,
  eta,
  orderUrl,
}: ShippedEmailProps) {
  return (
    <EmailLayout
      preview={`${shop} shipped it with ${carrier}.${eta ? ` It should be with you ${eta}.` : ""}`}
      footer={<NotifyFooter reason="an order ships" />}
    >
      <Tag tone="leaf">Shipped</Tag>
      <Title>It's on its way</Title>
      <Lead>
        {shop} dropped it off with {carrier}.{eta ? ` It should be with you ${eta}.` : ""}
      </Lead>

      <Progress done={2} steps={["Paid", "Shipped", "Delivered"]} />

      <ListingRow title={listing.title} imageUrl={listing.imageUrl} meta={`From ${shop}`} />

      <Section style={tracking}>
        <Text style={trackingLabel}>{carrier} tracking</Text>
        <Text style={trackingNumberStyle}>{trackingNumber}</Text>
      </Section>

      <Actions>
        <Button href={trackingUrl}>Track it</Button>
        <Button href={orderUrl} variant="secondary">
          See your order
        </Button>
      </Actions>
      <Small>
        Something wrong when it arrives? Tell us within 3 days and the seller doesn't get paid until
        it's sorted.
      </Small>
    </EmailLayout>
  );
}

ShippedEmail.PreviewProps = {
  shop: "Maya's Closet",
  listing: { title: "Linen wrap dress", imageUrl: asset("dress.png") },
  carrier: "USPS",
  trackingNumber: "9400 1112 0206 2240 5938 21",
  trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111202062240593821",
  eta: "on Tuesday",
  orderUrl: "https://resell.store/account",
} satisfies ShippedEmailProps;

/** Dots and labels: ● Paid ● Shipped ○ Delivered */
function Progress({ steps, done }: { steps: string[]; done: number }) {
  return (
    <Section style={{ marginTop: 24 }}>
      <Row>
        {steps.map((step, i) => {
          const isDone = i < done;
          return (
            <Column key={step} style={{ width: `${100 / steps.length}%`, verticalAlign: "top" }}>
              <div
                style={{
                  height: 6,
                  marginRight: i === steps.length - 1 ? 0 : 4,
                  borderRadius: radius.full,
                  background: isDone ? color.leaf600 : color.border,
                }}
              />
              <Text
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  lineHeight: "18px",
                  fontWeight: 700,
                  color: isDone ? color.leaf600 : color.textMuted,
                }}
              >
                {isDone ? "✓ " : ""}
                {step}
              </Text>
            </Column>
          );
        })}
      </Row>
    </Section>
  );
}

const tracking = {
  marginTop: 16,
  padding: "14px 16px",
  background: color.surfaceMuted,
  borderRadius: radius.md,
};

const trackingLabel = {
  margin: 0,
  fontSize: 13,
  lineHeight: "18px",
  fontWeight: 500,
  color: color.textMuted,
};

const trackingNumberStyle = {
  margin: "2px 0 0",
  fontFamily: font.mono,
  fontSize: 16,
  lineHeight: "24px",
  color: color.text,
};
