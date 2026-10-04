import "server-only";
import { createElement } from "react";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink, oneTimeToken } from "better-auth/plugins";
import { db, schema } from "@repo/db";
import { SignInEmail, signInSubject } from "@repo/email";
import { rootDomain } from "../urls";
import { sendEmail } from "./email";
import { captureDemoLink } from "./demo";
import { isDevTestAddress, rememberDevLink } from "./dev-links";

const rootHostname = rootDomain.split(":")[0]!;
const isLocal = rootHostname === "localhost";
const protocol = isLocal ? "http" : "https";

/**
 * "Continue with PayPal" (Log in with PayPal) reuses the platform app's keys. The
 * app needs Log in with PayPal turned on, with email and name, and
 * {BETTER_AUTH_URL}/api/auth/callback/paypal as its return URL.
 */
export const paypalSignInEnabled = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  // Stores live on subdomains; they read the same session
  trustedOrigins: [`${protocol}://${rootDomain}`, `${protocol}://*.${rootDomain}`],
  // In prod the session cookie is set on .resell.store, so every store reads it. Browsers
  // won't send a Domain=localhost cookie to *.localhost, so in dev each store gets its own
  // host-only copy of the same session through a one-time-token handoff instead (proxy.ts,
  // app/api/session/*). A dotted dev root (e.g. lvh.me:5689) shares the cookie like prod.
  advanced: isLocal
    ? {}
    : { crossSubDomainCookies: { enabled: true, domain: `.${rootHostname}` } },
  socialProviders: paypalSignInEnabled
    ? {
        paypal: {
          clientId: process.env.PAYPAL_CLIENT_ID!,
          clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
          environment: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
        },
      }
    : {},
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  databaseHooks: {
    user: {
      create: {
        // Email-link sign-ups arrive without a name: start from the address
        before: async (user) => ({
          data: { ...user, name: user.name?.trim() || nameFromEmail(user.email) },
        }),
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url, token }) => {
        // A demo sign-in (app/api/demo/sign-in) uses the token straight away
        if (captureDemoLink(token)) return;
        rememberDevLink(email, url);
        if (isDevTestAddress(email)) return;
        await sendEmail({
          to: email,
          subject: signInSubject(),
          react: createElement(SignInEmail, { url, email, expiresIn: 15 }),
        });
      },
    }),
    // Dev session handoff to store subdomains (see needsSessionHandoff in lib/urls.ts).
    // Tokens are minted server-side only, used once, and last a minute. Verifying one
    // copies the *same* session (session.session.token) onto the store host, so signing
    // out anywhere deletes the DB row and both cookies stop working, once the 5-minute
    // cookieCache on the other host runs out.
    oneTimeToken({ expiresIn: 1, disableClientRequest: true }),
    nextCookies(),
  ],
});

/** "maya.rivera@example.com" → "Maya Rivera" */
function nameFromEmail(email: string) {
  return email
    .split("@")[0]!
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}
