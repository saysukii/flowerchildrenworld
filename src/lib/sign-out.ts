import { supabase } from "@/integrations/supabase/client";
import { clearGoogleAccessToken } from "@/lib/google";

const SESSION_ENDED_KEY = "fcw-session-ended";

const SENSITIVE_KEYS = [
  "fcw-community",
  "fcw-messages",
  "fcw-team-members",
  "fcw-workspace-dirty",
  "fcw-last-active",
];

/** Drop child, family, and message copies from this browser when a session ends. */
export function clearInsideBrowserCache() {
  if (typeof localStorage === "undefined") return;
  for (const key of SENSITIVE_KEYS) localStorage.removeItem(key);
  const profileKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("fcw-user-profile:")) profileKeys.push(key);
  }
  for (const key of profileKeys) localStorage.removeItem(key);
  clearGoogleAccessToken();
}

export async function endInsideSession() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SESSION_ENDED_KEY, String(Date.now()));
  }
  clearInsideBrowserCache();
  await supabase.auth.signOut();
}

export function sessionWasEnded() {
  return typeof localStorage !== "undefined" && Boolean(localStorage.getItem(SESSION_ENDED_KEY));
}

export function clearSessionEndedFlag() {
  localStorage.removeItem(SESSION_ENDED_KEY);
}
