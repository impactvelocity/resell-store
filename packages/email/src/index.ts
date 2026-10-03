/*
 * Every email the app sends. Each template comes with a subject builder that
 * takes the same props. Preview them with `pnpm email` from the repo root.
 */

export { render, toPlainText } from "react-email";

export { default as SignInEmail, signInSubject, type SignInEmailProps } from "../emails/sign-in";
export {
  default as OfferReceivedEmail,
  offerReceivedSubject,
  type OfferReceivedEmailProps,
} from "../emails/offer-received";
export {
  default as OfferUpdateEmail,
  offerUpdateSubject,
  type OfferUpdateEmailProps,
} from "../emails/offer-update";
export { default as SoldEmail, soldSubject, type SoldEmailProps } from "../emails/sold";
export { default as ShippedEmail, shippedSubject, type ShippedEmailProps } from "../emails/shipped";
export {
  default as NewFromShopEmail,
  newFromShopSubject,
  type NewFromShopEmailProps,
} from "../emails/new-from-shop";
export {
  default as AgentSummaryEmail,
  agentSummarySubject,
  type AgentSummaryEmailProps,
} from "../emails/agent-summary";
export { default as NoticeEmail, noticeSubject, type NoticeEmailProps } from "../emails/notice";
export {
  default as OrderPlacedEmail,
  orderPlacedSubject,
  type OrderPlacedEmailProps,
} from "../emails/order-placed";
export { default as PaidOutEmail, paidOutSubject, type PaidOutEmailProps } from "../emails/paid-out";
