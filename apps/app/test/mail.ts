/** What sendEmail was asked to send in this test file (to real-looking addresses; @example.com is only logged). */
export const sentEmails: { to: string; subject: string }[] = [];

export function clearEmails() {
  sentEmails.length = 0;
}

export function emailsTo(to: string) {
  return sentEmails.filter((m) => m.to === to).map((m) => m.subject);
}
