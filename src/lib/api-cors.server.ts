export function getPublicApiOrigins(): string[] {
  const origins = new Set<string>();

  for (const value of [
    process.env.DONATION_WIDGET_ORIGIN,
    process.env.VITE_PUBLIC_SITE_ORIGIN,
    "https://flowerchildren.world",
    "https://www.flowerchildren.world",
  ]) {
    const trimmed = value?.trim().replace(/\/$/, "");
    if (trimmed) origins.add(trimmed);
  }

  return [...origins];
}

export function resolveCorsOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin")?.trim();
  if (!origin) return null;
  return getPublicApiOrigins().includes(origin) ? origin : null;
}

export function corsHeadersFor(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleApiPreflight(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;

  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api/")) return null;

  const origin = resolveCorsOrigin(request);
  if (!origin) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, { status: 204, headers: corsHeadersFor(origin) });
}

export function applyCors(request: Request, response: Response): Response {
  const origin = resolveCorsOrigin(request);
  if (!origin) return response;

  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeadersFor(origin))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
