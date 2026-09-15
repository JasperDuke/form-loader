import { authHeaders } from "./auth";
import {
  apiBase,
  type AppConfig,
  type DestinationConfig,
  type PayloadPair,
  normalizeAtenxionUrl,
} from "./types";

export const EMPTY_DESTINATION: DestinationConfig = {
  atenxionUrl: "",
  temporalUrl: "",
  atenxionToken: "",
};

export const EMPTY_PAYLOAD_PAIR: PayloadPair = { key: "", value: "" };

export const EMPTY_CONFIG: AppConfig = {
  servers: [{ ...EMPTY_DESTINATION }],
  maxConcurrent: 4,
  includeDocId: false,
  additionalPayload: [],
  pollWaitSeconds: 5,
};

function asAdditionalPayload(input: unknown): PayloadPair[] {
  if (!Array.isArray(input)) return [];
  return input.map((row) => ({
    key: String((row as PayloadPair)?.key ?? ""),
    value: String((row as PayloadPair)?.value ?? ""),
  }));
}

function asServers(config: Partial<AppConfig> & {
  atenxionUrl?: string;
  temporalUrl?: string;
  atenxionToken?: string;
  batchSize?: number;
}): DestinationConfig[] {
  if (Array.isArray(config.servers) && config.servers.length) {
    return config.servers.map((server) => ({
      atenxionUrl: String(server.atenxionUrl || ""),
      temporalUrl: String(server.temporalUrl || ""),
      atenxionToken: String(server.atenxionToken || ""),
    }));
  }
  if (config.atenxionUrl || config.temporalUrl || config.atenxionToken) {
    return [
      {
        atenxionUrl: String(config.atenxionUrl || ""),
        temporalUrl: String(config.temporalUrl || ""),
        atenxionToken: String(config.atenxionToken || ""),
      },
    ];
  }
  return [{ ...EMPTY_DESTINATION }];
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const response = await fetch(`${apiBase()}/api/config`, {
      cache: "no-store",
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Could not load configuration.");
    const body = (await response.json()) as { config?: Partial<AppConfig> & { batchSize?: number } };
    const config = body.config || {};
    return {
      servers: asServers(config),
      maxConcurrent: Number(config.maxConcurrent || config.batchSize) || 4,
      includeDocId: Boolean(config.includeDocId),
      additionalPayload: asAdditionalPayload(config.additionalPayload),
      pollWaitSeconds: Number(config.pollWaitSeconds) || 5,
    };
  } catch {
    return EMPTY_CONFIG;
  }
}

export async function saveConfig(config: AppConfig) {
  const next: AppConfig = {
    servers: config.servers.map((server) => ({
      atenxionUrl: normalizeAtenxionUrl(server.atenxionUrl),
      temporalUrl: normalizeAtenxionUrl(server.temporalUrl),
      atenxionToken: server.atenxionToken.trim(),
    })),
    maxConcurrent: Number(config.maxConcurrent),
    includeDocId: Boolean(config.includeDocId),
    additionalPayload: asAdditionalPayload(config.additionalPayload),
    pollWaitSeconds: Number(config.pollWaitSeconds) || 5,
  };
  const response = await fetch(`${apiBase()}/api/config`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(next),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error || "Could not save configuration.");
  }
  const body = (await response.json()) as { config: AppConfig };
  return {
    servers: asServers(body.config),
    maxConcurrent: Number(body.config.maxConcurrent) || 4,
    includeDocId: Boolean(body.config.includeDocId),
    additionalPayload: asAdditionalPayload(body.config.additionalPayload),
    pollWaitSeconds: Number(body.config.pollWaitSeconds) || 5,
  };
}

export async function saveAdditionalPayload(pairs: PayloadPair[]) {
  const response = await fetch(`${apiBase()}/api/config/additional-payload`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ additionalPayload: asAdditionalPayload(pairs) }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error || "Could not save additional payload.");
  }
  const body = (await response.json()) as { config: AppConfig };
  return {
    servers: asServers(body.config),
    maxConcurrent: Number(body.config.maxConcurrent) || 4,
    includeDocId: Boolean(body.config.includeDocId),
    additionalPayload: asAdditionalPayload(body.config.additionalPayload),
    pollWaitSeconds: Number(body.config.pollWaitSeconds) || 5,
  };
}

export function configReady(config: AppConfig) {
  return config.servers.some(
    (server) =>
      normalizeAtenxionUrl(server.atenxionUrl) &&
      normalizeAtenxionUrl(server.temporalUrl) &&
      server.atenxionToken.trim()
  );
}

export function validateConfig(config: AppConfig) {
  const maxConcurrent = Number(config.maxConcurrent);
  if (!config.servers.length) return "Add at least one destination.";
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 500) {
    return "Max concurrent APIs must be between 1 and 500.";
  }

  const pollWaitSeconds = Number(config.pollWaitSeconds);
  if (
    !Number.isInteger(pollWaitSeconds) ||
    pollWaitSeconds < 1 ||
    pollWaitSeconds > 3600
  ) {
    return "Temporal poll wait must be between 1 and 3600 seconds.";
  }

  for (const [index, server] of config.servers.entries()) {
    const label = `Destination ${index + 1}`;
    const url = normalizeAtenxionUrl(server.atenxionUrl);
    const temporalUrl = normalizeAtenxionUrl(server.temporalUrl);
    const token = server.atenxionToken.trim();
    if (!url || !temporalUrl || !token) {
      return `${label} needs a backend URL, Temporal URL, and token.`;
    }
    try {
      const parsed = new URL(url);
      const temporal = new URL(temporalUrl);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        !["http:", "https:"].includes(temporal.protocol)
      ) {
        return `${label} URLs must start with http or https.`;
      }
    } catch {
      return `${label} has an invalid URL.`;
    }
  }
  return null;
}
