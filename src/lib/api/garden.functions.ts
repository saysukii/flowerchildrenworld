import { createServerFn } from "@tanstack/react-start";

export const ensureGardenStarterNotes = createServerFn({ method: "POST" }).handler(async () => {
  const { seedGardenNotesIfEmpty } = await import("@/lib/garden-seed.server");
  return seedGardenNotesIfEmpty();
});
