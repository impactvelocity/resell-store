const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
// What `zapier validate` runs: compile the app, swap functions for markers, check the schema
const { compileApp, validateApp } = require("zapier-platform-core/src/tools/schema");
const App = require("../index");
const { handleErrors, includeKey } = require("../lib/api");
const { events } = require("../lib/events");

/*
 * The app definition passes Zapier's schema, and each trigger subscribes,
 * unsubscribes, unwraps events and lists samples the way the API expects.
 * z.request is faked, so nothing leaves the machine.
 */

class ZapierError extends Error {
  constructor(message, type, status) {
    super(message);
    this.type = type;
    this.status = status;
  }
}

/** A stand-in for Zapier's z: records requests and answers with `answer`. */
function fakeZ(answer = () => ({ status: 200, data: {} })) {
  const requests = [];
  return {
    requests,
    errors: { Error: ZapierError },
    request: async (req) => {
      requests.push(req);
      const res = answer(req);
      return { throwForStatus() {}, ...res };
    },
  };
}

const sold = App.triggers.new_sale;
const event = {
  id: "evt_1",
  object: "event",
  type: "listing.sold",
  created_at: "2026-10-02T18:30:00.000Z",
  data: { object: { object: "order", id: "ord_1", total: 188, shop: { slug: "maya", name: "Maya's closet" } } },
};

describe("the app definition", () => {
  it("passes Zapier's schema", () => {
    assert.deepEqual(validateApp(compileApp(App)).map((e) => e.stack), []);
  });

  it("has a hook trigger per event and a hidden shop list", () => {
    const hooks = Object.values(App.triggers).filter((t) => t.operation.type === "hook");
    assert.equal(hooks.length, events.length);
    assert.equal(App.triggers.shop.display.hidden, true);
  });
});

describe("a trigger", () => {
  it("subscribes the Zap's address to its one event", async () => {
    const z = fakeZ(() => ({ status: 201, data: { id: "sub_1" } }));
    const out = await sold.operation.performSubscribe(z, { targetUrl: "https://hooks.zapier.com/x", meta: { zap: { id: 42 } }, inputData: {} });
    assert.deepEqual(out, { id: "sub_1" });
    assert.equal(z.requests[0].method, "POST");
    assert.match(z.requests[0].url, /\/webhooks\/subscriptions$/);
    assert.deepEqual(z.requests[0].body, { url: "https://hooks.zapier.com/x", events: ["listing.sold"], name: "Zapier: New Sale (Zap 42)" });
  });

  it("unsubscribes, and doesn't mind if it's already gone", async () => {
    const z = fakeZ(() => ({ status: 404, data: { error: { message: "gone" } } }));
    const out = await sold.operation.performUnsubscribe(z, { subscribeData: { id: "sub_1" } });
    assert.deepEqual(out, { id: "sub_1", deleted: true });
    assert.equal(z.requests[0].method, "DELETE");
    assert.match(z.requests[0].url, /\/webhooks\/subscriptions\/sub_1$/);
  });

  it("turns an event into one flat record, kept to the chosen shop", () => {
    const [record] = sold.operation.perform(fakeZ(), { cleanedRequest: event, inputData: {} });
    assert.deepEqual(record, { ...event.data.object, event_type: "listing.sold", event_id: "evt_1", event_created_at: event.created_at, test: false });
    assert.deepEqual(sold.operation.perform(fakeZ(), { cleanedRequest: event, inputData: { shop: "other" } }), []);
  });

  it("lists samples for testing, falling back to one when the chosen shop has none", async () => {
    const z = fakeZ(() => ({ status: 200, data: { object: "list", data: [{ ...event, test: true }] } }));
    const all = await sold.operation.performList(z, { inputData: {} });
    assert.equal(all[0].id, "ord_1");
    assert.equal(all[0].test, true);
    assert.match(z.requests[0].url, /\/webhooks\/samples\/listing\.sold$/);
    assert.equal((await sold.operation.performList(z, { inputData: { shop: "other" } })).length, 1);
  });
});

describe("requests", () => {
  it("send the key as a Bearer token and say they're from Zapier", () => {
    const req = includeKey({ headers: {} }, fakeZ(), { authData: { apiKey: "rs_live_abc" } });
    assert.equal(req.headers.Authorization, "Bearer rs_live_abc");
    assert.equal(req.headers["resell-client"], "Zapier");
  });

  it("show the API's own error message, as an auth error for a bad key", () => {
    const z = fakeZ();
    assert.throws(
      () => handleErrors({ status: 401, data: { error: { type: "unauthorized", message: "That key isn't valid." } }, request: {} }, z),
      (e) => e.message === "That key isn't valid." && e.type === "AuthenticationError",
    );
    assert.throws(() => handleErrors({ status: 400, content: "nope", request: {} }, z), /resell.store answered 400/);
    const ok = { status: 404, request: { skipThrowForStatus: true } };
    assert.equal(handleErrors(ok, z), ok);
  });
});
