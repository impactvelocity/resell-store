import { describe, expect, it } from "vitest";
import { NoticeEmail, noticeSubject, render, toPlainText, type NoticeEmailProps } from "@repo/email";

/*
 * The shared after-sale email layout (packages/email/emails/notice.tsx):
 * it shows what it's given, leaves out what it isn't, and the subject is
 * passed straight through.
 */

const props: NoticeEmailProps = {
  subject: "Did the lamp arrive?",
  preview: "Say it's all good and Maya gets paid.",
  tag: { label: "Check it", tone: "lemon" },
  title: "Did it arrive?",
  lead: "Maya's Closet shipped your lamp a week ago.",
  listing: { title: "Brass desk lamp", meta: "From Maya's Closet, $29 with shipping" },
  note: { label: "Your money is safe", body: "It's held until you say it's all good.", tone: "agent" },
  receipt: { lines: [{ label: "Sale with shipping", amount: 29 }, { label: "resell.store fee", amount: -2 }], total: { label: "You get", amount: 27 } },
  actions: [
    { label: "It's all good", href: "https://resell.store/account#orders" },
    { label: "Report a problem", href: "https://resell.store/account/orders/123" },
  ],
  small: "Report a problem within 3 days of it arriving.",
  reason: "an order needs you",
};

describe("NoticeEmail", () => {
  it("renders the title, lead, listing, note, receipt and every action", async () => {
    const html = await render(<NoticeEmail {...props} />);
    const text = toPlainText(html);

    for (const words of [
      "Check it",
      "Did it arrive?",
      "shipped your lamp a week ago",
      "Brass desk lamp",
      "From Maya",
      "Your money is safe",
      "held until you say",
      "Sale with shipping",
      "You get",
      "It's all good",
      "Report a problem",
      "within 3 days",
      "an order needs you",
    ])
      expect(text).toContain(words);
    expect(html).toContain('href="https://resell.store/account#orders"');
    expect(html).toContain('href="https://resell.store/account/orders/123"');
    expect(html).toContain("Say it&#x27;s all good and Maya gets paid.");
  });

  it("leaves out the parts it isn't given", async () => {
    const text = toPlainText(
      await render(
        <NoticeEmail subject="x" preview="p" tag={{ label: "Escalated" }} title="A problem needs a decision" lead="Decide it." actions={[]} reason="a problem is escalated" />,
      ),
    );
    expect(text).toContain("A problem needs a decision");
    expect(text).not.toContain("Your money is safe");
    expect(text).not.toContain("You get");
  });

  it("uses the subject it's given", () => {
    expect(noticeSubject(props)).toBe("Did the lamp arrive?");
  });
});
