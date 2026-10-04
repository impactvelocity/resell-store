const { version } = require("./package.json");
const { version: platformVersion } = require("zapier-platform-core");
const authentication = require("./authentication");
const { handleErrors, includeKey } = require("./lib/api");
const { events } = require("./lib/events");
const { hookTrigger } = require("./lib/hooks");
const shop = require("./triggers/shop");

/*
 * resell.store on Zapier: a trigger for every webhook event, as REST hooks
 * on the public API (api.resell.store/v1). Sign in with a secret key.
 * See README.md for testing and pushing it to Zapier.
 */

const triggers = [...events.map(hookTrigger), shop];

module.exports = {
  version,
  platformVersion,
  authentication,
  beforeRequest: [includeKey],
  afterResponse: [handleErrors],
  triggers: Object.fromEntries(triggers.map((t) => [t.key, t])),
};
