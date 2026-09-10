import {
  CONFIG_STORAGE_KEY,
  type AppConfig,
  normalizeAtenxionUrl,
} from "./types";

export const EMPTY_CONFIG: AppConfig = {
  atenxionUrl: "",
  atenxionToken: "",
  batchSize: 10,
  waitTime: 5,
};

export function loadConfig(): AppConfig {
  if (typeof window === "undefined") return EMPTY_CONFIG;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return EMPTY_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      atenxionUrl: String(parsed.atenxionUrl || ""),
      atenxionToken: String(parsed.atenxionToken || ""),
      batchSize: Number(parsed.batchSize) || 10,
      waitTime: Number.isFinite(Number(parsed.waitTime))
        ? Number(parsed.waitTime)
        : 5,
    };
  } catch {
    return EMPTY_CONFIG;
  }
}

export function saveConfig(config: AppConfig) {
  const next: AppConfig = {
    atenxionUrl: normalizeAtenxionUrl(config.atenxionUrl),
    atenxionToken: config.atenxionToken.trim(),
    batchSize: Number(config.batchSize),
    waitTime: Number(config.waitTime),
  };
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
  return next;
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
