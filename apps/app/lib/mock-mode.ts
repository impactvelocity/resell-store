/*
 * The front-end prototype lives on under app/mock so each live screen can be
 * compared with its design. In mock mode the proxy serves these paths from there.
 */

export const MOCK_COOKIE = "rs_view";

const mockPaths = [
  /^\/home$/,
  /^\/inbox(\/.*)?$/,
  /^\/listings\/[^/]+$/,
  /^\/me(\/edit)?$/,
  /^\/offers\/[^/]+$/,
  /^\/sales$/,
  /^\/search$/,
  /^\/shops\/[^/]+(\/settings)?$/,
  /^\/stats$/,
  /^\/tools\/(connections|agent|api|sidekick)$/,
  /^\/welcome(\/start)?$/,
  /^\/list\/[^/]+(\/(research|details|photos|words|publish))?$/,
  /^\/(discover|stores|agent|account|messages)$/,
  /^\/(checkout|offer)\/[^/]+$/,
];

export function isMockPath(pathname: string) {
  return mockPaths.some((re) => re.test(pathname));
}
