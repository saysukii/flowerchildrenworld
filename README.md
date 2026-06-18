# Inside — Flower Children World

An internal, branded home base where you and your team operate with intention — separate from the public website at [flowerchildren.world](https://flowerchildren.world).

Flower Children World has been showing up for its community since 2019. Seven years of programming, relationships, and real impact. This portal is the infrastructure to match: one place to see who's in the village, represent the brand consistently, track growth, and keep the weekly rhythm steady.

The public site tells the world who you are. **Inside is how the organization actually runs.**

---

## Who this is for

**Organization:** Flower Children World  
**Founder:** Sukii  
**Built by:** [TAĪSTU](https://taistu.com)

Inside is designed for full team transparency and operational efficiency. Everyone you invite sees the same workspace — community records, brand assets, analytics, and planning tools. 

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

The sidebar is your map. Each section serves a specific purpose for how FCW operates day to day.

### Home (`/dashboard`)

The first thing you see when you log in. A greeting, today's date, and a snapshot of what's happening now — plus a link into your **Routine Pulse** for the week. Over time this will surface live calendar events (Luma) and upcoming programming so nothing falls through.

### Community (`/community`)

Your full village directory — enrolled children and guardians, volunteers, and community and corporate partners. Searchable, organized by tab, all in one place. Volunteer and partner submissions from the public forms are designed to flow directly into this section.

### Brand Essence (`/brand-essence`)

The team's single source of truth for showing up as Flower Children World. Logos, the full color palette, typography (Nohemi + Adigiana Toybox), flyer and social templates, mission copy, C.A.L.M. framework definitions, outreach language, and brand guidelines — accessible to anyone on the team, any time, on any device.

If someone needs to make a flyer, write a caption, or send an email on behalf of FCW, they come here first. The brand stays consistent because the tools are always available.

### Forms (`/forms`)

Three intake forms live at their own URLs and link from your public website:

| Form | URL | Purpose |
|------|-----|---------|
| Join the Village | `/join` | Volunteer intake |
| Partner with Us | `/partner` | Partner inquiries |
| Enroll a Child | `/enroll` | Child enrollment |

When someone submits, their record is designed to flow straight into **Community** — clean and automatic, with no extra steps for you.

### Analytics (`/analytics`)

One dashboard showing how FCW is growing — community numbers, events, donations, and engagement. The layout is built for:

- **Community** — enrolled children, active volunteers, partners, new contacts
- **Events** — upcoming programming and RSVPs (Luma integration)
- **Donations** — monthly and all-time totals (Stripe integration)
- **Engagement** — form submissions by type, growth over time

Open Analytics and the picture is complete — no digging through spreadsheets or logging into three different platforms.

### The Garden (`/garden`)

A private thinking space for the team. **Notes** for ideas, programming plans, grant language, and partner outreach — tagged, searchable, and pinnable. **Whiteboard** for sketches and freeform planning on a shared canvas. A place to plant something before it becomes programming.

### Routine Pulse (`/routine-pulse`)

Your weekly rhythm, made visible. Set reminders for the rituals that keep FCW running — post flyers, check volunteer signups, follow up with partners, prep for the weekend. The portal tells you what needs to happen so consistency doesn't depend on memory alone.

### Settings (`/settings`)

Account, team invites, and integrations (Luma, Google Calendar, Stripe). This is where you manage who has access and connect the tools that power Home and Analytics.

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

1. **One home for operations** — community, brand, forms, and growth metrics in a single branded space your team can trust.
2. **Brand consistency by design** — Brand Essence means anyone on the team can represent FCW correctly without hunting for files.
3. **Automatic intake** — public forms connect to Community so new volunteers, partners, and families don't get lost.
4. **Rhythm over chaos** — Home and Routine Pulse keep the weekly cadence visible so programming, outreach, and follow-ups stay on track.
5. **Room to think** — The Garden gives the team a dedicated space for planning, grant drafts, and summer programming ideas before they become events.
6. **Built to grow** — the foundation is complete today; integrations and new features layer on without rebuilding from scratch.

---

## What's live today vs. what's coming

**Live now**

- Full portal structure and navigation
- Sign-in (magic link, password, Google)
- Community directory (ready for records)
- Brand Essence (colors, C.A.L.M., mission, asset structure)
- Public intake forms (`/join`, `/partner`, `/enroll`)
- Analytics dashboard layout
- The Garden (notes + whiteboard)
- Routine Pulse (weekly ritual reminders)
- Team settings and invite flow

---

## For developers

This repository powers the Inside portal. Stack: React, TanStack Start, Supabase (auth + data), deployed on Railway.

```bash
npm install
cp .env.example .env   # add Supabase keys
npm run dev            # http://localhost:8080
npm run build          # production build
npm start              # run production server locally
```

See `.env.example` for required environment variables. Database migrations live in `supabase/migrations/`.

---

*Inside · Flower Children World × TAĪSTU · June 2026*
