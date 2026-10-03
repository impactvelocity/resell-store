import "server-only";
import type { ReactElement } from "react";
import { render, toPlainText } from "@repo/email";

/**
 * Renders a template from @repo/email and sends it through Resend when
 * RESEND_API_KEY is set. Without it (local dev) the plain-text version is
 * logged instead, and sign-in links show on the page.
 */
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}) {
  const html = await render(react);
  const text = toPlainText(html);

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`\n[email] to ${to}: ${subject}\n${text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "resell.store <hello@resell.store>",
      to,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Email failed: ${res.status} ${await res.text()}`);
}
