# Inside — Flower Children World

An internal, branded home base where you and your team operate with intention — separate from the public website at [flowerchildren.world](https://flowerchildren.world).

Flower Children World has been showing up for its community since 2019. Seven years of programming, relationships, and real impact. This portal is the infrastructure to match: one place to see who's in the village, message the team, represent the brand consistently, track growth, and keep the weekly rhythm steady.

The public site tells the world who you are. **Inside is how the organization actually runs.**

**Portal:** [inside.flowerchildren.world](https://inside.flowerchildren.world)

---

## Who this is for

**Organization:** Flower Children World  
**Founder:** Sukii  
**Built by:** [TAĪSTU](https://taistu.com)

Inside is designed for full team transparency and operational efficiency. Everyone you invite sees the same workspace — messages, community records, brand assets, analytics, and planning tools. Admins can control which pages each member can open from **Settings**.

---

## How your team gets in

You control who has access. Invite team members from **Settings** — they receive a magic link, set a password, and land inside.

Three ways to sign in on every return visit:

| Method | How it works |
|--------|----------------|
| **Magic link** | Enter email → click the link in your inbox. No password needed. |
| **Password** | Email + password. |
| **Google** | Sign in with your Google account. |

---

## What's inside

The menu is your map. Each section serves a specific purpose for how Flower Children World operates day to day.

### Home (`/dashboard`)

The first thing you see when you log in. A greeting, today's date, and a snapshot of what's happening now — plus a link into your **Routine Pulse** for the week. Over time this will surface live calendar events (Luma) and upcoming programming so nothing falls through.

### Messages (`/messages`)

Internal team messaging — start a direct conversation, use `@` to mention someone, and keep coordination in one place instead of scattered texts. Unread counts show in the conversation list and on the Messages nav item. A notification bell (mobile header and desktop sidebar) surfaces new messages and mentions; opening a thread or tapping a notification marks them read.

### Community (`/community`)

Your full village directory — enrolled children and guardians, volunteers, and community and corporate partners. Searchable, organized by tab, all in one place. Volunteer and partner submissions from the public forms are designed to flow directly into this section.

### Brand Essence (`/brand-essence`)

The team's single source of truth for showing up as Flower Children World. Logos, the full color palette, typography (Nohemi + Adigiana Toybox), flyer and social templates, mission copy, C.A.L.M. framework definitions, outreach language, and brand guidelines — accessible to anyone on the team, any time, on any device.

If someone needs to make a flyer, write a caption, or send an email on behalf of FCW, they come here first. The brand stays consistent because the tools are always available.

### Forms (`/forms`)

Public pages live on the main website (not the Inside subdomain), served by this app via Cloudflare → Railway:

| Page | URL | Purpose |
|------|-----|---------|
| Join the Village | `https://flowerchildren.world/join` | Volunteer intake |
| Partner with Us | `https://flowerchildren.world/partner` | Partner inquiries |
| Enroll a Child | `https://flowerchildren.world/enroll` | Child enrollment |
| Donate | `https://flowerchildren.world/donate` | Donation → Stripe Checkout |

Route `/enroll`, `/partner`, `/join`, and `/donate` on `flowerchildren.world` to this app's Railway deployment (same paths). Inside stays at `inside.flowerchildren.world`.

When someone submits an intake form, their record is designed to flow straight into **Community**. Donations redirect to Stripe Checkout and return to `/donate/thank-you`.

### Analytics (`/analytics`)

One dashboard showing how FCW is growing — community numbers, events, donations, and engagement. The layout is built for:

- **Community** — enrolled children, active volunteers, partners, new contacts
- **Events** — upcoming programming and RSVPs (Luma integration)
- **Donations** — monthly and all-time totals (Stripe Connect)
- **Engagement** — form submissions by type, growth over time

Connect Stripe in **Settings** so donation totals pull from the connected account. Open Analytics and the picture is complete — no digging through spreadsheets or logging into three different platforms.

### The Garden (`/garden`)

A private thinking space for the team. **Notes** for ideas, programming plans, grant language, and partner outreach — tagged, searchable, and pinnable. **Whiteboard** for sketches and freeform planning on a shared canvas. A place to plant something before it becomes programming.

### Routine Pulse (`/routine-pulse`)

Your weekly rhythm, made visible. Set reminders for the rituals that keep FCW running — post flyers, check volunteer signups, follow up with partners, prep for the weekend. The portal tells you what needs to happen so consistency doesn't depend on memory alone.

### Settings (`/settings`)

Account, team invites, page access, and integrations (Google, Stripe Connect). This is where you manage who has access, which pages they can see, and the tools that power donations and Analytics.

---

## The brand at a glance

**Mission**  
Children are the seeds of the future. Rooted in values of love and creative freedom, we empower the flower children to become the greatest versions of themselves — with belief in endless possibilities for growth and development.

**C.A.L.M. framework**

| | |
|---|---|
| **C** — Community | **A** — Arts |
| **L** — Life Skills | **M** — Mindfulness |

**Color palette**

| Color | Hex | Role |
|-------|-----|------|
| White | `#FCFCFC` | Backgrounds |
| Black | `#020202` | Primary text |
| Brown | `#59341E` | Earth · warmth |
| Green | `#3AB819` | Nature · growth |
| Blue | `#15AAD2` | Sky · calm |
| Purple | `#776BD9` | Creativity |
| Yellow | `#EFB003` | Joy · warmth |
| Orange | `#D9580D` | Energy |
| Red | `#C53D3D` | Passion |

**Typography**  
Nohemi Regular for headers · Nohemi Light for body · Adigiana Toybox for labels and playful accents

**Tone**  
Color as energy. Calm as a feeling before it's a framework. Rooted in nature and growth. Warm enough for caregivers, joyful enough for children. Black and white hold the foundation — color shows up where it's called.

---

## How this supports your organization

Inside is built around how FCW actually works — not generic software adapted later.

1. **One home for operations** — messages, community, brand, forms, and growth metrics in a single branded space your team can trust.
2. **Brand consistency by design** — Brand Essence means anyone on the team can represent FCW correctly without hunting for files.
3. **Automatic intake** — public forms connect to Community so new volunteers, partners, and families don't get lost.
4. **Rhythm over chaos** — Home and Routine Pulse keep the weekly cadence visible so programming, outreach, and follow-ups stay on track.
5. **Room to think** — The Garden gives the team a dedicated space for planning, grant drafts, and summer programming ideas before they become events.
6. **Built to grow** — the foundation is complete today; integrations and new features layer on without rebuilding from scratch.

---

## What's live today vs. what's coming

**Live now**

- Full portal structure and navigation (with per-member page access)
- Sign-in (magic link, password, Google)
- Team messages with @mentions and in-app notifications
- Community directory (ready for records)
- Brand Essence (colors, C.A.L.M., mission, asset structure)
- Public intake forms (`/join`, `/partner`, `/enroll`) with branded confirmation emails
- Branded email templates (preview + test send on `/forms`)
- Analytics dashboard layout + Stripe donation totals when Connect is linked
- Public donate page (`/donate`) + Stripe Checkout (`/api/donations/checkout`)
- The Garden (notes + whiteboard)
- Routine Pulse (weekly ritual reminders)
- Team settings, invites, and Stripe Connect / Google integrations
- Cloudflare Worker routing for `flowerchildren.world` → Framer + Railway

---

## Where things live

| Service | What it’s for |
|---------|----------------|
| **[GitHub](https://github.com)** | Source of truth for the code. All app changes live in this repo — history, pull requests, and deploys start here. |
| **[Railway](https://railway.app)** | Hosts the running app (`inside.flowerchildren.world`) and the API used by public forms, donations, and Stripe webhooks. Environment variables (Stripe, Resend, Supabase keys, etc.) are set here for production. |
| **[Supabase](https://supabase.com)** | Auth and database — team sign-in (magic link, password, Google), user sessions, and persisted data (community, Garden, Stripe connection state, migrations under `supabase/migrations/`). |

Related (already in use for the public site):

| Service | What it’s for |
|---------|----------------|
| **Framer** | Public marketing site at `flowerchildren.world` (homepage, about, etc.). |
| **Cloudflare** | Worker in front of `flowerchildren.world` that routes marketing pages to Framer and `/join`, `/partner`, `/enroll`, `/donate`, `/api/*` to Railway. See [`cloudflare/README.md`](cloudflare/README.md). |
| **Resend** | Branded transactional email (team invites + form confirmations). |
| **Stripe** | Donations (Checkout) and Connect for Analytics totals. |

---

## For developers

This repository powers the Inside portal at `inside.flowerchildren.world`. Stack: React, TanStack Start, **Supabase** (auth + data), deployed on **Railway**, with code on **GitHub**.

```bash
npm install
cp .env.example .env   # add Supabase keys
npm run dev            # http://localhost:8080
npm run build          # production build
npm start              # run production server locally
```

See `.env.example` for required environment variables. Database migrations live in `supabase/migrations/` and are applied in Supabase. Production env vars are configured on Railway (not committed to GitHub).

### Public site routing (`flowerchildren.world`)

The public marketing site lives on **Framer**. Forms, donations, and webhooks run on **Railway** (this app). To keep one public URL (`flowerchildren.world`) for everything, put a **Cloudflare Worker** in front of the domain.

See [`cloudflare/README.md`](cloudflare/README.md) for the worker script and setup steps. After it’s live:

- `flowerchildren.world/donate`, `/donate/thank-you` → Railway donation page
- `flowerchildren.world/join`, `/partner`, `/enroll` → Railway forms
- `flowerchildren.world/api/*` → Railway API (donations, form submit, Stripe webhook)
- `inside.flowerchildren.world` → team portal only
- Everything else on `flowerchildren.world` → Framer

### Stripe Connect (donations + Analytics)

Donations use Stripe Checkout on a **connected account** (sellers collect directly). Platform keys live on Railway; the org account is linked from **Settings → Connect Stripe**.

1. Enable Stripe Connect (Standard / Dashboard accounts + OAuth).
2. Set `STRIPE_SECRET_KEY`, `STRIPE_CLIENT_ID`, and `STRIPE_WEBHOOK_SECRET` on Railway.
3. Register OAuth redirect: `https://inside.flowerchildren.world/api/stripe/callback`
4. Register webhook: `https://inside.flowerchildren.world/api/stripe/webhook`  
   Listen to **Connected accounts** for `checkout.session.completed` and `invoice.paid`.
5. Set `DONATION_WIDGET_ORIGIN` to the public donate page origin (e.g. `https://flowerchildren.world`).
6. Apply the Stripe Supabase migration, then connect from Settings and smoke-test a donation.

### Email (Resend)

Team invites and form confirmation emails use [Resend](https://resend.com) with HTML templates in `src/emails/templates/`. The black wordmark from Brand Essence (`/brand/fcw-logo-black.png`) is injected as an absolute URL via `APP_ORIGIN`.

1. Create a Resend account and verify your sending domain (e.g. `flowerchildren.world`).
2. Set `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_ORIGIN` in Railway (and `.env` locally).
3. Open **Forms** inside the app to preview each template and **Send test to me** before going live.
4. Team invites from **Settings** use the custom invite template (Supabase generates the link; Resend sends the email).
5. Public form submissions POST to `/api/forms/submit` and send the matching confirmation to the address on the form.

In Supabase → Authentication → Email Templates, you can disable or simplify the default invite/magic-link templates if you only want the branded Resend emails for team onboarding.

---

*Inside · Flower Children World × TAĪSTU · July 2026*
