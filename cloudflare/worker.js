/**
 * flowerchildren.world path router
 *
 * Sends backend paths to Railway (Inside app) and everything else to Framer.
 *
 * Proxied paths:
 *   /api/*           donations, form submissions, Stripe webhooks
 *   /join            volunteer intake
 *   /partner         partner intake
 *   /enroll          child enrollment
 *   /donate          donation page (+ /donate/thank-you)
 *
 * Env vars (Cloudflare Worker → Settings → Variables):
 *   RAILWAY_ORIGIN   default: https://inside.flowerchildren.world
 *   FRAMER_ORIGIN    default: https://sites.framer.app
 *   PUBLIC_HOST      default: flowerchildren.world
 */

const DEFAULT_RAILWAY_ORIGIN = "https://inside.flowerchildren.world";
const DEFAULT_FRAMER_ORIGIN = "https://sites.framer.app";
const DEFAULT_PUBLIC_HOST = "flowerchildren.world";

const RAILWAY_EXACT_PATHS = new Set([
  "/join",
  "/partner",
  "/enroll",
  "/donate",
  "/donate/thank-you",
]);

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function shouldProxyToRailway(pathname) {
  const path = normalizePath(pathname);
  if (path.startsWith("/api/")) return true;
  return RAILWAY_EXACT_PATHS.has(path);
}

function buildBackendRequest(request, origin) {
  const url = new URL(request.url);
  const backendUrl = new URL(url.pathname + url.search, origin);

  const headers = new Headers(request.headers);
  headers.set("Host", new URL(origin).host);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

  return new Request(backendUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
}

function buildFramerRequest(request, framerOrigin, publicHost) {
  const url = new URL(request.url);
  const framerUrl = new URL(url.pathname + url.search, framerOrigin);

  const headers = new Headers(request.headers);
  headers.set("Host", publicHost);

  return new Request(framerUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const railwayOrigin = env.RAILWAY_ORIGIN?.trim() || DEFAULT_RAILWAY_ORIGIN;
    const framerOrigin = env.FRAMER_ORIGIN?.trim() || DEFAULT_FRAMER_ORIGIN;
    const publicHost = env.PUBLIC_HOST?.trim() || DEFAULT_PUBLIC_HOST;

    if (shouldProxyToRailway(url.pathname)) {
      return fetch(buildBackendRequest(request, railwayOrigin));
    }

    return fetch(buildFramerRequest(request, framerOrigin, publicHost));
  },
};
