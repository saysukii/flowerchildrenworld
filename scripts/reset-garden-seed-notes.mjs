/**
 * Deletes and re-inserts the three Garden starter notes.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (or DATABASE_URL to run the SQL migration instead).
 *
 * Usage: npm run db:garden-seed
 */
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SEED_TITLES = [
  "Summer 2026 — Programming Ideas",
  "Fall 2026 — Partner Outreach",
  "Grant Language — Working Copy",
];

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const databaseUrl = process.env.DATABASE_URL;
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL ?? "info@flowerchildren.world";

async function runSqlMigration() {
  const sqlPath = resolve(process.cwd(), "supabase/migrations/20260618120000_garden_seed_notes.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("SQL migration applied — 3 starter notes reset.");
}

async function runServiceRoleReset() {
  const seedPath = resolve(process.cwd(), "supabase/garden-seed-notes.json");
  const seedNotes = JSON.parse(readFileSync(seedPath, "utf8"));

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: deleteError } = await admin.from("garden_notes").delete().in("title", SEED_TITLES);
  if (deleteError) {
    throw new Error(`Delete failed: ${deleteError.message}`);
  }
  console.log(`Deleted existing rows for: ${SEED_TITLES.join(", ")}`);

  const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(`User lookup failed: ${listError.message}`);

  const user = listData.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
  if (!user?.id) {
    throw new Error(`Admin user not found: ${adminEmail}`);
  }

  const rows = seedNotes.map((note) => ({
    title: note.title,
    body: note.body,
    tag: note.tag,
    pinned: note.pinned,
    created_by: user.id,
  }));

  const { error: insertError } = await admin.from("garden_notes").insert(rows);
  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

  console.log(`Inserted ${rows.length} starter notes for ${adminEmail}.`);
}

try {
  if (databaseUrl) {
    await runSqlMigration();
  } else if (url && serviceKey) {
    await runServiceRoleReset();
  } else {
    console.error("Missing credentials. Add one of these to .env:");
    console.error("  SUPABASE_SERVICE_ROLE_KEY  (Supabase → Project Settings → API)");
    console.error("  DATABASE_URL               (Supabase → Project Settings → Database → URI)");
    process.exit(1);
  }
} catch (err) {
  console.error("Reset failed:", err.message);
  process.exit(1);
}
