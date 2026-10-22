import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Local stand-in used only when Supabase keys are missing in dev.
 * Auth resolves as an admin preview so the sidebar can open every page.
 * Table calls resolve empty instead of throwing.
 */
export function createDevPreviewClient(): SupabaseClient<Database> {
  const user = {
    id: "dev-preview",
    aud: "authenticated",
    email: "info@flowerchildren.world",
    app_metadata: { role: "admin" },
    user_metadata: { full_name: "Sukii", display_name: "Sukii" },
    created_at: "2026-01-01T00:00:00.000Z",
  };

  const session = {
    user,
    access_token: "dev-preview",
    refresh_token: "dev-preview",
    expires_in: 60 * 60,
    token_type: "bearer",
  };

  const empty = Promise.resolve({ data: [], error: null, count: 0 });
  const query: Record<string, unknown> = {
    then: empty.then.bind(empty),
    catch: empty.catch.bind(empty),
    finally: empty.finally.bind(empty),
  };
  for (const method of [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "in",
    "order",
    "limit",
    "single",
    "maybeSingle",
    "match",
    "filter",
    "or",
    "lt",
    "gt",
    "lte",
    "gte",
    "range",
  ]) {
    query[method] = () => query;
  }

  const DEV_SIGNED_OUT = "fcw-dev-signed-out";

  function devSignedOut() {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(DEV_SIGNED_OUT) === "1";
  }

  const auth = {
    getSession: async () => ({ data: { session: devSignedOut() ? null : session }, error: null }),
    getUser: async () => ({ data: { user: devSignedOut() ? null : user }, error: null }),
    getClaims: async () => ({ data: null, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => {
      sessionStorage.setItem(DEV_SIGNED_OUT, "1");
      return { error: null };
    },
    signInWithPassword: async () => {
      sessionStorage.removeItem(DEV_SIGNED_OUT);
      return { data: { session, user }, error: null };
    },
    signInWithOtp: async () => ({
      data: {},
      error: { message: "Magic links need Supabase keys in .env." },
    }),
    signInWithOAuth: async () => ({
      data: {},
      error: { message: "Google sign-in needs Supabase keys in .env." },
    }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: { user }, error: null }),
  };

  return {
    auth,
    from: () => query,
    storage: { from: () => query },
    channel: () => ({ on: () => ({ subscribe() {} }), subscribe() {} }),
    removeChannel: () => {},
  } as unknown as SupabaseClient<Database>;
}
