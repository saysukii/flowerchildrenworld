import type { User } from "@supabase/supabase-js";
import { supabase } from "./client";

/** Fast client-side session read (local storage). Prefer over getUser() for route guards. */
export async function getClientSessionUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.user ?? null;
}
