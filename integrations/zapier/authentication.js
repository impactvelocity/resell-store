const { base } = require("./lib/api");

/*
 * Sign in with the secret key from resell.store/tools/api. The test call is
 * GET /me, which also names the connection after the account.
 */

module.exports = {
  type: "custom",
  fields: [
    {
      key: "apiKey",
      label: "Secret key",
      type: "password",
      required: true,
      helpText:
        "Your secret key from [resell.store/tools/api](https://resell.store/tools/api). It starts with `rs_live_`. Making a new key there disconnects this one, so connect again if you do.",
    },
  ],
  test: async (z) => {
    const response = await z.request({ url: `${base()}/me` });
    return response.data;
  },
  // With a function, bundle.inputData is what the test returned
  connectionLabel: (z, bundle) => {
    const me = bundle.inputData || {};
    const shop = me.shops && me.shops[0];
    return shop ? `${me.name || me.email} (${shop.slug}.resell.store)` : me.name || me.email || "resell.store";
  },
};
