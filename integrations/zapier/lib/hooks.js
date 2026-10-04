const { base } = require("./api");
const { eventFields } = require("./samples");

/*
 * REST hook triggers. Turning a Zap on subscribes its address to one event
 * (POST /webhooks/subscriptions); turning it off unsubscribes. resell.store
 * POSTs the event to the address, and `perform` turns it into one flat
 * record. Testing the trigger lists samples from the seller's own latest
 * things (GET /webhooks/samples/:event).
 */

/** An event as resell.store sends it → the object, plus which event it was. */
function unwrap(event) {
  const object = (event && event.data && event.data.object) || {};
  return {
    ...object,
    id: object.id || event.id,
    event_type: event.type,
    event_id: event.id,
    event_created_at: event.created_at,
    test: Boolean(event.test),
  };
}

/** Only the chosen shop's, when one is chosen. */
const forShop = (bundle, records) =>
  bundle.inputData && bundle.inputData.shop ? records.filter((r) => r.shop && r.shop.slug === bundle.inputData.shop) : records;

function zapName(bundle, e) {
  const zap = bundle.meta && bundle.meta.zap;
  return (zap && zap.name) || `Zapier: ${e.label}${zap && zap.id ? ` (Zap ${zap.id})` : ""}`;
}

function hookTrigger(e) {
  return {
    key: e.key,
    noun: e.noun,
    display: { label: e.label, description: e.description },
    operation: {
      type: "hook",
      inputFields: [
        {
          key: "shop",
          label: "Shop",
          dynamic: "shop.slug.name",
          required: false,
          helpText: "Only start the Zap for this shop. Leave it empty for all your shops.",
        },
      ],

      performSubscribe: async (z, bundle) => {
        const response = await z.request({
          url: `${base()}/webhooks/subscriptions`,
          method: "POST",
          body: { url: bundle.targetUrl, events: [e.event], name: zapName(bundle, e) },
        });
        return response.data;
      },

      performUnsubscribe: async (z, bundle) => {
        const id = bundle.subscribeData && bundle.subscribeData.id;
        if (!id) return {};
        const response = await z.request({
          url: `${base()}/webhooks/subscriptions/${encodeURIComponent(id)}`,
          method: "DELETE",
          skipThrowForStatus: true,
        });
        // Already gone (removed on resell.store, or after a 410) is fine
        if (response.status === 404) return { id, deleted: true };
        response.throwForStatus();
        return response.data;
      },

      perform: (z, bundle) => forShop(bundle, [unwrap(bundle.cleanedRequest)]),

      performList: async (z, bundle) => {
        const response = await z.request({ url: `${base()}/webhooks/samples/${e.event}`, params: { limit: 3 } });
        const records = response.data.data.map(unwrap);
        const mine = forShop(bundle, records);
        // Still show what the fields look like when the chosen shop has nothing yet
        return mine.length ? mine : records.slice(0, 1);
      },

      sample: unwrap({ id: `evt_sample_${e.key}`, type: e.event, created_at: "2026-10-02T18:30:00.000Z", test: true, data: { object: e.sample } }),
      outputFields: [...e.fields, ...eventFields],
    },
  };
}

module.exports = { hookTrigger, unwrap, forShop };
