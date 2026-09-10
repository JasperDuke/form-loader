import { apiBase, type AppConfig, normalizeAtenxionUrl } from "./types";

export const EMPTY_CONFIG: AppConfig = {
  atenxionUrl: "",
  atenxionToken: "",
  batchSize: 10,
  waitTime: 5,
};

export async function loadConfig(): Promise<AppConfig> {
  try {
    const response = await fetch(`${apiBase()}/api/config`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not load configuration.");
    const body = (await response.json()) as { config?: Partial<AppConfig> };
    const config = body.config || {};
    return {
      atenxionUrl: String(config.atenxionUrl || ""),
      atenxionToken: String(config.atenxionToken || ""),
      batchSize: Number(config.batchSize) || 10,
      waitTime: Number.isFinite(Number(config.waitTime))
        ? Number(config.waitTime)
        : 5,
    };
  } catch {
    return EMPTY_CONFIG;
  }
}

export async function saveConfig(config: AppConfig) {
  const next: AppConfig = {
    atenxionUrl: normalizeAtenxionUrl(config.atenxionUrl),
    atenxionToken: config.atenxionToken.trim(),
    batchSize: Number(config.batchSize),
    waitTime: Number(config.waitTime),
  };
  const response = await fetch(`${apiBase()}/api/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(next),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error || "Could not save configuration.");
  }
  const body = (await response.json()) as { config: AppConfig };
  return body.config;
}

export function configReady(config: AppConfig) {
  return Boolean(
    normalizeAtenxionUrl(config.atenxionUrl) && config.atenxionToken.trim()
  );
}

export function validateConfig(config: AppConfig) {
  const url = normalizeAtenxionUrl(config.atenxionUrl);
  const token = config.atenxionToken.trim();
  const batchSize = Number(config.batchSize);
  const waitTime = Number(config.waitTime);

  if (!url || !token) {
    return "Please configure the Atenxion URL and token first.";
  }
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "Atenxion URL must start with http or https.";
    }
  } catch {
    return "Atenxion URL is invalid.";
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    return "Batch size must be between 1 and 500.";
  }
  if (!Number.isFinite(waitTime) || waitTime < 0) {
    return "Wait time must be 0 or greater.";
  }
  return null;
}
