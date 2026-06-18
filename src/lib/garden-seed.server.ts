import type { GardenTag } from "@/lib/garden";

export const GARDEN_ADMIN_EMAIL = "info@flowerchildren.world";

type SeedNote = {
  title: string;
  tag: GardenTag;
  pinned: boolean;
  body: string;
};

export const GARDEN_STARTER_NOTES: SeedNote[] = [
  {
    title: "Summer 2026 — Programming Ideas",
    tag: "Programming",
    pinned: true,
    body: `What are we building this summer?

Themes to explore:
— 

Events to plan:
— Sunday Funday series
— 

Partner activations:
— 

Venues we love:
— 

Age group considerations:
Ages 5–9:
Ages 10–15:

Notes:`,
  },
  {
    title: "Fall 2026 — Partner Outreach",
    tag: "Community",
    pinned: false,
    body: `Organizations to reconnect with:
— 

New partners to approach:
— 

What we're looking for:
— Venue support
— Funding
— Skill-based volunteers
— Co-programming

Follow-up tracker:
— 
— 
— `,
  },
  {
    title: "Grant Language — Working Copy",
    tag: "Fundraising",
    pinned: false,
    body: `Who we are (one paragraph):
Children are the seeds of the future. Rooted in 
values of love and creative freedom, we empower 
the flower children to become the greatest 
versions of themselves — with belief in endless 
possibilities for growth and development.

What we do:
FCW provides youth programming for children ages 
4–16 built around the C.A.L.M. framework — 
Community, Arts, Life Skills, and Mindfulness.

Impact to date:
— Active since 2019
— Programming across Boston + South Florida
— 

Funding needs:
— 

Notes:`,
  },
];

export async function seedGardenNotesIfEmpty() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { count, error: countError } = await supabaseAdmin
    .from("garden_notes")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.error("[Garden] Failed to check notes:", countError.message);
    return { seeded: false as const, reason: "count_failed" as const };
  }

  if (count && count > 0) {
    return { seeded: false as const, reason: "not_empty" as const };
  }

  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    console.error("[Garden] Failed to list users:", listError.message);
    return { seeded: false as const, reason: "admin_lookup_failed" as const };
  }

  const admin = listData.users.find(
    (u) => u.email?.toLowerCase() === GARDEN_ADMIN_EMAIL.toLowerCase(),
  );

  if (!admin?.id) {
    console.error(`[Garden] Admin user not found: ${GARDEN_ADMIN_EMAIL}`);
    return { seeded: false as const, reason: "admin_not_found" as const };
  }

  const rows = GARDEN_STARTER_NOTES.map((note) => ({
    title: note.title,
    body: note.body,
    tag: note.tag,
    pinned: note.pinned,
    created_by: admin.id,
  }));

  const { error: insertError } = await supabaseAdmin.from("garden_notes").insert(rows);

  if (insertError) {
    console.error("[Garden] Failed to seed notes:", insertError.message);
    return { seeded: false as const, reason: "insert_failed" as const };
  }

  return { seeded: true as const };
}
