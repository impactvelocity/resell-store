/*
 * Where the app sends its requests, and the middleware every request goes
 * through: the secret key as a Bearer token, `resell-client: Zapier` so the
 * activity log on resell.store says who did it, and the API's own error
 * message when something goes wrong.
 */

/** Set RESELL_API_BASE with `zapier env:set` to point a version at staging or a tunnel. */
const base = () => (process.env.RESELL_API_BASE || "https://api.resell.store/v1").replace(/\/$/, "");

const includeKey = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.apiKey) {
    request.headers.Authorization = `Bearer ${bundle.authData.apiKey}`;
  }
  request.headers["resell-client"] = "Zapier";
  return request;
};

/** The API answers errors as { error: { type, message } }; show that message in Zapier. */
const handleErrors = (response, z) => {
  if (response.status < 400 || (response.request && response.request.skipThrowForStatus)) return response;
  let message = `resell.store answered ${response.status}.`;
  try {
    const body = response.data || JSON.parse(response.content);
    if (body && body.error && body.error.message) message = body.error.message;
  } catch {
    // Not JSON: keep the plain message
  }
  if (response.status === 401) throw new z.errors.Error(message, "AuthenticationError", 401);
  throw new z.errors.Error(message, "ApiError", response.status);
};

module.exports = { base, includeKey, handleErrors };
