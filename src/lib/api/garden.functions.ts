import { createServerFn } from "@tanstack/react-start";

/** Seeds starter notes only when the table is completely empty (new environments). */
export const ensureGardenStarterNotes = createServerFn({ method: "POST" }).handler(async () => {
  const { seedGardenNotesIfEmpty } = await import("@/lib/garden-seed.server");
  return seedGardenNotesIfEmpty();
});
