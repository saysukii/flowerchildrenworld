import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type WorkspaceStripeConnection = {
  stripeUserId: string;
  accessToken: string;
  refreshToken: string | null;
  accountName: string;
};

function createAdminClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function mapConnection(row: {
  stripe_user_id: string;
  access_token: string;
  refresh_token: string | null;
  account_name: string;
}): WorkspaceStripeConnection {
  return {
    stripeUserId: row.stripe_user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    accountName: row.account_name,
  };
}

export async function loadWorkspaceStripeConnection(): Promise<WorkspaceStripeConnection | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("workspace_stripe_connection")
    .select("stripe_user_id, access_token, refresh_token, account_name")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.error("[Stripe] Failed to load workspace connection", error);
    return null;
  }

  return data ? mapConnection(data) : null;
}

export async function saveWorkspaceStripeConnection(input: {
  stripeUserId: string;
  accessToken: string;
  refreshToken: string | null;
  accountName: string;
  connectedBy: string;
}) {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to save the Stripe connection.");
  }

  const { error } = await supabase.from("workspace_stripe_connection").upsert(
    {
      id: "default",
      stripe_user_id: input.stripeUserId,
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
      account_name: input.accountName,
      connected_by: input.connectedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Failed to save Stripe connection: ${error.message}`);
  }
}

export async function clearWorkspaceStripeConnection() {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to disconnect Stripe.");
  }

  const { error } = await supabase.from("workspace_stripe_connection").delete().eq("id", "default");

  if (error) {
    throw new Error(`Failed to clear Stripe connection: ${error.message}`);
  }
}

export async function createStripeOAuthState(input: {
  state: string;
  userId: string;
  redirectUri: string;
}) {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to start Stripe OAuth.");
  }

  const { error } = await supabase.from("stripe_oauth_states").insert({
    state: input.state,
    user_id: input.userId,
    redirect_uri: input.redirectUri,
  });

  if (error) {
    throw new Error(
      error.message.includes("does not exist")
        ? "Stripe tables are missing. Apply supabase/migrations/20260618140000_stripe_integration.sql."
        : `Failed to create Stripe OAuth state: ${error.message}`,
    );
  }
}

export async function consumeStripeOAuthState(state: string) {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("stripe_oauth_states")
    .select("user_id, redirect_uri, expires_at")
    .eq("state", state)
    .maybeSingle();

  await supabase.from("stripe_oauth_states").delete().eq("state", state);

  if (error || !data) {
    return null;
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }

  return {
    userId: data.user_id,
    redirectUri: data.redirect_uri,
  };
}

export async function purgeExpiredStripeOAuthStates() {
  const supabase = createAdminClient();
  if (!supabase) return;

  await supabase.from("stripe_oauth_states").delete().lt("expires_at", new Date().toISOString());
}
