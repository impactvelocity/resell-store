import { Section, Text } from "react-email";
import { Actions, Button, EmailLayout, ListingRow, NotifyFooter, Receipt, Small, Tag, styles } from "../src/components";
import { asset, money } from "../src/config";
import { color, font, radius } from "../src/theme";

/* To the seller: the held money went to their PayPal. */

export type PaidOutEmailProps = {
  buyer: string;
  listing: { title: string; imageUrl?: string | null };
  /** What the buyer paid, with shipping. */
  sale: number;
  /** "resell.store fee", "PayPal fee", "Refunded to the buyer", as negative amounts. */
  deductions: { label: string; amount: number }[];
  payout: number;
  /** Why it was released: "Jess said it's all good" or "The check window closed". */
  why: string;
  /** A test checkout: no money moved. */
  test?: boolean;
  salesUrl: string;
};

export const paidOutSubject = ({ listing, test }: PaidOutEmailProps) =>
  `You've been paid for ${listing.title}${test ? " (test)" : ""}`;

export default function PaidOutEmail({ buyer, listing, sale, deductions, payout, why, test, salesUrl }: PaidOutEmailProps) {
  return (
    <EmailLayout
      preview={`${why}, so ${money(payout)} went to your PayPal.${test ? " (Test: no money moved.)" : ""}`}
      footer={<NotifyFooter reason="you're paid" />}
    >
      <Section style={hero}>
        <Tag tone="leaf">{test ? "Paid out (test)" : "Paid"}</Tag>
        <Text style={heroAmount}>{money(payout)}</Text>
        <Text style={{ ...styles.lead, margin: "6px 0 0" }}>
          {why}, so it's {test ? "marked as paid out" : "in your PayPal"}.
        </Text>
      </Section>

      <ListingRow title={listing.title} imageUrl={listing.imageUrl} meta={`Bought by ${buyer}`} />

      <Receipt lines={[{ label: "Sale with shipping", amount: sale }, ...deductions]} total={{ label: "You get", amount: payout }} />
      <Small>
        {test
          ? "This was a test checkout, so no money moved."
          : "PayPal usually shows it straight away. Moving it to your bank is up to you, in PayPal."}
      </Small>

      <Actions>
        <Button href={salesUrl}>See your sales</Button>
      </Actions>
    </EmailLayout>
  );
}

PaidOutEmail.PreviewProps = {
  buyer: "Jess",
  listing: { title: "Linen wrap dress", imageUrl: asset("dress.png") },
  sale: 29,
  deductions: [
    { label: "resell.store fee", amount: -2 },
    { label: "PayPal fee", amount: -1.5 },
  ],
  payout: 25.5,
  why: "Jess said it's all good",
  salesUrl: "https://resell.store/sales",
} satisfies PaidOutEmailProps;

const hero = {
  padding: "24px 24px 22px",
  background: color.leaf100,
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
