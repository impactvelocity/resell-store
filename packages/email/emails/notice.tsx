import {
  Actions,
  Button,
  EmailLayout,
  Lead,
  ListingRow,
  Note,
  NotifyFooter,
  Receipt,
  Small,
  Tag,
  Title,
  type Tone,
} from "../src/components";
import { asset } from "../src/config";

/*
 * The after-the-sale emails: reminders (answer an offer, pay for one, ship
 * it, did it arrive?), offers running out, cancellations, refunds, problems
 * and payouts. They share one shape, so the wording lives with the sender
 * (apps/app/lib/server/notify-after-sale.ts) and this lays it out.
 */

export type NoticeEmailProps = {
  subject: string;
  /** The grey line inboxes show after the subject. */
  preview: string;
  tag: { label: string; tone?: Tone };
  title: string;
  lead: string;
  listing?: { title: string; imageUrl?: string | null; meta?: string | null };
  note?: { label?: string; title?: string; body: string; tone?: "agent" | "lemon" | "pink" | "muted" };
  receipt?: { lines: { label: string; amount: number }[]; total: { label: string; amount: number } };
  actions: { label: string; href: string; variant?: "primary" | "secondary" | "dark" }[];
  small?: string;
  /** "an order ships": why they got it. */
  reason: string;
};

export const noticeSubject = ({ subject }: NoticeEmailProps) => subject;

export default function NoticeEmail({
  preview,
  tag,
  title,
  lead,
  listing,
  note,
  receipt,
  actions,
  small,
  reason,
}: NoticeEmailProps) {
  return (
    <EmailLayout preview={preview} footer={<NotifyFooter reason={reason} />}>
      <Tag tone={tag.tone ?? "leaf"}>{tag.label}</Tag>
      <Title>{title}</Title>
      <Lead>{lead}</Lead>

      {listing && <ListingRow title={listing.title} imageUrl={listing.imageUrl} meta={listing.meta ?? undefined} />}

      {note && (
        <Note tone={note.tone ?? "muted"} label={note.label} title={note.title}>
          {note.body}
        </Note>
      )}

      {receipt && <Receipt lines={receipt.lines} total={receipt.total} />}

      {actions.length > 0 && (
        <Actions>
          {actions.map((a, i) => (
            <Button key={a.href + a.label} href={a.href} variant={a.variant ?? (i === 0 ? "primary" : "secondary")}>
              {a.label}
            </Button>
          ))}
        </Actions>
      )}
      {small && <Small>{small}</Small>}
    </EmailLayout>
  );
}

NoticeEmail.PreviewProps = {
  subject: "Did your linen wrap dress arrive?",
  preview: "Tell us it's all good and Maya gets paid, or let us know what's wrong.",
  tag: { label: "Check it", tone: "lemon" },
  title: "Did it arrive?",
  lead: "Maya's Closet shipped your linen wrap dress a week ago. If it's with you and it's as described, say so and Maya gets paid.",
  listing: { title: "Linen wrap dress", imageUrl: asset("dress.png"), meta: "From Maya's Closet, $29 with shipping" },
  note: {
    label: "Your money is safe",
    body: "PayPal is holding your $29. If we don't hear from you by Thursday, it goes to Maya.",
    tone: "agent",
  },
  actions: [
    { label: "It's all good", href: "https://resell.store/account" },
    { label: "Report a problem", href: "https://resell.store/account/orders/123" },
  ],
  small: "Not here yet? Report a problem and the seller doesn't get paid until it's sorted.",
  reason: "an order needs you",
} satisfies NoticeEmailProps;
