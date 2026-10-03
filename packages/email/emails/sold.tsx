import { Section, Text } from "react-email";
import {
  Actions,
  Button,
  Divider,
  EmailLayout,
  ListingRow,
  NotifyFooter,
  Receipt,
  Small,
  Steps,
  Tag,
  styles,
} from "../src/components";
import { asset, money } from "../src/config";
import { color, font, radius } from "../src/theme";

/* To the seller: something sold. What they made and how to ship it. */

export type SoldEmailProps = {
  buyer: string;
  listing: { title: string; imageUrl?: string | null };
  price: number;
  /** "Shipping label", "resell.store fee"… as negative amounts. */
  deductions: { label: string; amount: number }[];
  payout: number;
  /** "Friday" */
  shipBy: string;
  /** "Brooklyn, NY". The full address is on the label. */
  shipTo: string;
  labelUrl: string;
  saleUrl: string;
};

export const soldSubject = ({ listing, price }: SoldEmailProps) =>
  `Sold! ${listing.title} for ${money(price)}`;

export default function SoldEmail({
  buyer,
  listing,
  price,
  deductions,
  payout,
  shipBy,
  shipTo,
  labelUrl,
  saleUrl,
}: SoldEmailProps) {
  return (
    <EmailLayout
      preview={`${buyer} bought it. Your label is ready. Ship it by ${shipBy}.`}
      footer={<NotifyFooter reason="something sells" />}
    >
      <Section style={hero}>
        <Tag tone="lemon">Sold</Tag>
        <Text style={heroAmount}>{money(price)}</Text>
        <Text style={{ ...styles.lead, margin: "6px 0 0" }}>
          {buyer} bought it. Nice one.
        </Text>
      </Section>

      <ListingRow title={listing.title} imageUrl={listing.imageUrl} meta={`Going to ${shipTo}`} />

      <Receipt
        lines={[{ label: "Sale price", amount: price }, ...deductions]}
        total={{ label: "You get", amount: payout }}
      />
      <Small>You get paid when {buyer} gets it. It lands in your PayPal 3 days after delivery.</Small>

      <Divider />

      <Text style={{ ...styles.listingTitle, fontSize: 20, fontFamily: font.display, fontWeight: 800 }}>
        Ship it by {shipBy}
      </Text>
      <Steps
        steps={[
          { title: "Print the label", body: "It's paid for and has the address on it." },
          { title: "Pack it", body: "Something soft around anything that could break." },
          { title: `Drop it off by ${shipBy}`, body: "Any post office. We'll send tracking to the buyer." },
        ]}
      />

      <Actions>
        <Button href={labelUrl}>Print label</Button>
        <Button href={saleUrl} variant="secondary">
          See the sale
        </Button>
      </Actions>
    </EmailLayout>
  );
}

SoldEmail.PreviewProps = {
  buyer: "Priya",
  listing: { title: "Ceramic bud vase", imageUrl: asset("vase.png") },
  price: 18,
  deductions: [{ label: "resell.store fee", amount: -1.44 }],
  payout: 16.56,
  shipBy: "Friday",
  shipTo: "Brooklyn, NY",
  labelUrl: "https://resell.store/sales/bud-vase/label",
  saleUrl: "https://resell.store/sales",
} satisfies SoldEmailProps;

const hero = {
  padding: "24px 24px 22px",
  background: color.lemon100,
  borderRadius: radius.md,
  textAlign: "center" as const,
};

const heroAmount = {
  margin: 0,
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: 64,
  lineHeight: "64px",
  letterSpacing: "-0.03em",
  color: color.text,
};
