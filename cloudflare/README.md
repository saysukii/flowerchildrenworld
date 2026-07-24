# flowerchildren.world → Framer + Railway router

One public domain for everything visitors see. This Cloudflare Worker sits in front of `flowerchildren.world` and routes traffic:

| Path | Goes to |
|------|---------|
| `/api/*` | Railway (`inside.flowerchildren.world`) |
| `/join`, `/partner`, `/enroll` | Railway (intake forms) |
| Everything else (`/`, `/donate`, etc.) | Framer |

After this is live:

- Donation widget: `https://flowerchildren.world/api/donations/checkout`
- Form pages: `https://flowerchildren.world/join`, `/partner`, `/enroll`
- Team portal (unchanged): `https://inside.flowerchildren.world`

---

## Prerequisites

1. **Cloudflare** manages DNS for `flowerchildren.world` (nameservers pointed to Cloudflare).
2. **Framer** custom domain is connected (Site settings → Domains).
3. **Railway** app is live at `inside.flowerchildren.world`.

---

## Setup (Cloudflare Dashboard — recommended)

### 1. Move DNS to Cloudflare

If the domain isn’t on Cloudflare yet, add the site and update nameservers at your registrar.

Keep Framer’s DNS records (usually a CNAME to `sites.framer.app`). You can leave them — the Worker intercepts traffic before it reaches Framer for matched paths.

### 2. Create the Worker

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Create Worker**
2. Name it `flowerchildren-router`
3. Replace the default script with the contents of `cloudflare/worker.js` from this repo
4. **Save and deploy**

### 3. Add environment variables

Worker → **Settings** → **Variables**:

| Name | Value |
|------|-------|
| `RAILWAY_ORIGIN` | `https://inside.flowerchildren.world` |
| `FRAMER_ORIGIN` | `https://sites.framer.app` |
| `PUBLIC_HOST` | `flowerchildren.world` |

`FRAMER_ORIGIN` is almost always `https://sites.framer.app`. If Framer support gave you a different origin, use that instead.

### 4. Attach the route

Worker → **Triggers** → **Routes** → **Add route**:

```
flowerchildren.world/*
```

Optional (if you use www):

```
www.flowerchildren.world/*
```

Zone: `flowerchildren.world`

### 5. Update the donation widget

In your Framer embed, set:

```javascript
const CHECKOUT_API = 'https://flowerchildren.world/api/donations/checkout';
```

Same-origin — no CORS workarounds needed.

### 6. Verify

```bash
# Should hit Railway (not 404 from Framer)
curl -I https://flowerchildren.world/api/donations/checkout

# Should return 204 with CORS headers on preflight
curl -I -X OPTIONS https://flowerchildren.world/api/donations/checkout \
  -H "Origin: https://flowerchildren.world" \
  -H "Access-Control-Request-Method: POST"

# Should serve the volunteer form from Railway
curl -I https://flowerchildren.world/join

# Should still serve Framer (200, Framer headers)
curl -I https://flowerchildren.world/donate
curl -I https://flowerchildren.world/
```

---

## Setup (Wrangler CLI — optional)

```bash
npm install -g wrangler
cd cloudflare
wrangler login
wrangler deploy
```

Edit `wrangler.toml` if your zone name or routes differ.

---

## Troubleshooting

**Framer pages return 403 or wrong site**  
Check `PUBLIC_HOST` matches your Framer custom domain exactly (`flowerchildren.world`).

**`/api/*` still 404**  
Confirm the Worker route `flowerchildren.world/*` is active and listed above any Page Rules that might override it.

**Forms work but donations 503**  
Railway issue — add `STRIPE_SECRET_KEY` and connect Stripe in Inside → Settings.

**`www` doesn’t work**  
Add a `www.flowerchildren.world/*` route and set `PUBLIC_HOST` to match whichever host you redirect to.
