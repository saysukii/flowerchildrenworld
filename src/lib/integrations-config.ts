export type OAuthIntegration = {
  connected: boolean;
  accountName: string;
  spreadsheetId?: string;
};

export type IntegrationsConfig = {
  google: OAuthIntegration;
};

const STORAGE_KEY = "fcw-integrations";

const EMPTY: IntegrationsConfig = {
  google: { connected: false, accountName: "" },
};

function parseIntegration(value: unknown): OAuthIntegration {
  if (value && typeof value === "object" && "connected" in value) {
    const v = value as OAuthIntegration;
    return {
      connected: Boolean(v.connected),
      accountName: v.accountName ?? "",
      spreadsheetId: v.spreadsheetId,
    };
  }
  return { connected: false, accountName: "" };
}

export function loadIntegrations(): IntegrationsConfig {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<IntegrationsConfig>;
    return {
      google: parseIntegration(parsed.google),
    };
  } catch {
    return EMPTY;
  }
}

export function saveIntegrations(config: IntegrationsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
