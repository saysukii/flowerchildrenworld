import type { SupabaseClient } from "@supabase/supabase-js";

import { isAdmin } from "@/lib/user-role";

export async function assertAdminUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== userId) {
    throw new Error("Unauthorized");
  }
  if (!isAdmin(data.user)) {
    throw new Error("Forbidden");
  }
}
