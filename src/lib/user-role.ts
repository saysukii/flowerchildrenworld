import type { User } from "@supabase/supabase-js";

export function getDisplayName(user: User | null | undefined) {
  if (!user) return "Member";
  const meta = user.user_metadata ?? {};
  return (meta.display_name as string) || (meta.full_name as string) || user.email?.split("@")[0] || "Member";
}

export function isAdmin(user: User | null | undefined) {
  if (!user) return false;
  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (role === "admin") return true;
  return user.email === "info@flowerchildren.world";
}

export function getRoleLabel(user: User | null | undefined) {
  return isAdmin(user) ? "Admin" : "Member";
}
