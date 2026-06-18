export type OAuthIntegration = {
  connected: boolean;
  accountName: string;
};

export type IntegrationsConfig = {
  notion: OAuthIntegration;
  luma: OAuthIntegration;
  google: OAuthIntegration;
  stripe: OAuthIntegration;
};

const STORAGE_KEY = "fcw-integrations";

const EMPTY: IntegrationsConfig = {
  notion: { connected: false, accountName: "" },
  luma: { connected: false, accountName: "" },
  google: { connected: false, accountName: "" },
  stripe: { connected: false, accountName: "" },
};

function parseIntegration(value: unknown): OAuthIntegration {
  if (value && typeof value === "object" && "connected" in value) {
    const v = value as OAuthIntegration;
    return { connected: Boolean(v.connected), accountName: v.accountName ?? "" };
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
      notion: parseIntegration(parsed.notion),
      luma: parseIntegration(parsed.luma),
      google: parseIntegration(parsed.google),
      stripe: parseIntegration(parsed.stripe),
    };
  } catch {
    return EMPTY;
  }
}

export function saveIntegrations(config: IntegrationsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
