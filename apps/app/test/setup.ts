import { afterAll, vi } from "vitest";

/*
 * Every test file: email never leaves the process (sendEmail is a spy, see
 * test/mail.ts), and the database pool closes at the end so Vitest can exit.
 */

vi.mock("../lib/server/email", async () => {
  const { sentEmails } = await import("./mail");
  return {
    sendEmail: vi.fn(async (msg: { to: string; subject: string }) => {
      sentEmails.push({ to: msg.to, subject: msg.subject });
    }),
  };
});

afterAll(async () => {
  const g = globalThis as unknown as { pool?: { end(): Promise<void>; ended?: boolean } };
  const pool = g.pool;
  delete g.pool;
  if (pool && !pool.ended) await pool.end().catch(() => {});
});
