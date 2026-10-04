const s = require("./samples");

/*
 * One trigger per resell.store webhook event. apps/app checks this list has
 * every event (webhook-subscriptions.test.ts), so a new event needs a line here.
 */

const events = [
  {
    event: "listing.sold",
    key: "new_sale",
    noun: "Sale",
    label: "New Sale",
    description: "Triggers when something sells in one of your shops.",
    sample: s.order,
    fields: s.fields.order,
  },
  {
    event: "offer.received",
    key: "new_offer",
    noun: "Offer",
    label: "New Offer",
    description: "Triggers when a buyer makes an offer on one of your listings.",
    sample: s.offer,
    fields: s.fields.offer,
  },
  {
    event: "offer.updated",
    key: "updated_offer",
    noun: "Offer",
    label: "Updated Offer",
    description: "Triggers when a buyer takes your counter, turns it down or withdraws their offer.",
    sample: { ...s.offer, status: "accepted", counter: 160, agreed: 160, responded_at: "2026-10-02T19:00:00.000Z" },
    fields: s.fields.offer,
  },
  {
    event: "question.asked",
    key: "new_message",
    noun: "Message",
    label: "New Buyer Message",
    description: "Triggers when a buyer sends one of your shops a message.",
    sample: s.message,
    fields: s.fields.message,
  },
  {
    event: "order.completed",
    key: "order_completed",
    noun: "Order",
    label: "Order Completed",
    description: "Triggers when a buyer says their order arrived and it's all good.",
    sample: s.completed,
    fields: s.fields.order,
  },
  {
    event: "order.problem",
    key: "order_problem",
    noun: "Order",
    label: "Problem Reported",
    description: "Triggers when a buyer reports a problem with an order.",
    sample: { ...s.order, status: "shipped" },
    fields: s.fields.order,
  },
  {
    event: "order.refunded",
    key: "order_refunded",
    noun: "Order",
    label: "Order Refunded",
    description: "Triggers when an order is cancelled or refunded.",
    sample: { ...s.order, status: "refunded" },
    fields: s.fields.order,
  },
  {
    event: "payout.sent",
    key: "new_payout",
    noun: "Payout",
    label: "Payout Sent",
    description: "Triggers when the money for a sale goes to your PayPal.",
    sample: s.completed,
    fields: s.fields.order,
  },
  {
    event: "review.created",
    key: "new_review",
    noun: "Review",
    label: "New Review",
    description: "Triggers when a buyer leaves a review.",
    sample: s.review,
    fields: s.fields.review,
  },
];

module.exports = { events };
