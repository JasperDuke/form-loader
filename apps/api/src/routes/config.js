import express from "express";
import { ConfigModel } from "../models/Config.js";
import { DEFAULT_POLL_WAIT_SECONDS, normalizeUrl } from "../utils.js";

const MIN_POLL_WAIT_SECONDS = 1;
const MAX_POLL_WAIT_SECONDS = 3600;

export function normalizePollWaitSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return DEFAULT_POLL_WAIT_SECONDS;
  const rounded = Math.round(seconds);
  if (rounded < MIN_POLL_WAIT_SECONDS) return MIN_POLL_WAIT_SECONDS;
  if (rounded > MAX_POLL_WAIT_SECONDS) return MAX_POLL_WAIT_SECONDS;
  return rounded;
}

const EMPTY_SERVER = {
  atenxionUrl: "",
  temporalUrl: "",
  atenxionToken: "",
  agentIds: [],
};

export function normalizeAgentIds(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    const id = String(raw || "").trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    if (!/^[a-f0-9]{24}$/.test(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function assertHttpUrl(value, label) {
  const url = normalizeUrl(value);
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} must start with http or https.`);
  }
  return url;
}

export function normalizeServers(config) {
  if (Array.isArray(config?.servers) && config.servers.length) {
    return config.servers.map((server) => ({
      _id: server._id,
      atenxionUrl: server.atenxionUrl || "",
      temporalUrl: server.temporalUrl || "",
      atenxionToken: server.atenxionToken || "",
      agentIds: normalizeAgentIds(server.agentIds),
    }));
  }
  if (config?.atenxionUrl || config?.temporalUrl || config?.atenxionToken) {
    return [
      {
        atenxionUrl: config.atenxionUrl || "",
        temporalUrl: config.temporalUrl || "",
        atenxionToken: config.atenxionToken || "",
        agentIds: [],
      },
    ];
  }
  return [{ ...EMPTY_SERVER }];
}

export function normalizeAdditionalPayload(input) {
  if (!Array.isArray(input)) return [];
  return input.map((row) => ({
    key: String(row?.key ?? ""),
    value: String(row?.value ?? ""),
  }));
}

function publicConfig(config) {
  return {
    servers: normalizeServers(config).map((server) => ({
      atenxionUrl: server.atenxionUrl,
      temporalUrl: server.temporalUrl,
      atenxionToken: server.atenxionToken,
      agentIds: normalizeAgentIds(server.agentIds),
    })),
    maxConcurrent: Number(config?.maxConcurrent || config?.batchSize || 4),
    includeDocId: Boolean(config?.includeDocId),
    additionalPayload: normalizeAdditionalPayload(config?.additionalPayload),
    pollWaitSeconds: normalizePollWaitSeconds(
      config?.pollWaitSeconds ?? DEFAULT_POLL_WAIT_SECONDS
    ),
  };
}

export function configRouter() {
  const router = express.Router();

  router.get("/config", async (_req, res) => {
    const config = await ConfigModel.findById("primary").lean();
    res.json({ config: publicConfig(config) });
  });

  router.put("/config", async (req, res) => {
    const body = req.body || {};
    const maxConcurrent = Number(body.maxConcurrent ?? body.batchSize);
    const includeDocId = Boolean(body.includeDocId);
    const incoming = Array.isArray(body.servers) ? body.servers : [];

    if (!incoming.length) {
      res.status(400).json({ error: "Add at least one Atenxion destination." });
      return;
    }

    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 500) {
      res.status(400).json({ error: "Max concurrent APIs must be between 1 and 500." });
      return;
    }

    if (body.pollWaitSeconds !== undefined) {
      const raw = Number(body.pollWaitSeconds);
      if (
        !Number.isInteger(raw) ||
        raw < MIN_POLL_WAIT_SECONDS ||
        raw > MAX_POLL_WAIT_SECONDS
      ) {
        res.status(400).json({
          error: `Temporal poll wait must be between ${MIN_POLL_WAIT_SECONDS} and ${MAX_POLL_WAIT_SECONDS} seconds.`,
        });
        return;
      }
    }

    const existing = await ConfigModel.findById("primary").lean();
    const pollWaitSeconds = normalizePollWaitSeconds(
      body.pollWaitSeconds ?? existing?.pollWaitSeconds
    );

    let servers;
    try {
      servers = incoming.map((server, index) => {
        const label = `Destination ${index + 1}`;
        const atenxionToken = String(server.atenxionToken || "").trim();
        if (!server.atenxionUrl || !server.temporalUrl || !atenxionToken) {
          throw new Error(`${label} needs a backend URL, Temporal URL, and token.`);
        }
        const agentIds = normalizeAgentIds(server.agentIds);
        if (!agentIds.length) {
          throw new Error(`${label} needs at least one Agent ID (24-character hex).`);
        }
        return {
          atenxionUrl: assertHttpUrl(server.atenxionUrl, `${label} backend URL`),
          temporalUrl: assertHttpUrl(server.temporalUrl, `${label} Temporal URL`),
          atenxionToken,
          agentIds,
        };
      });
    } catch (error) {
      res.status(400).json({ error: error.message || "Configuration is invalid." });
      return;
    }

    const additionalPayload =
      body.additionalPayload !== undefined
        ? normalizeAdditionalPayload(body.additionalPayload)
        : normalizeAdditionalPayload(existing?.additionalPayload);

    const config = await ConfigModel.findByIdAndUpdate(
      "primary",
      {
        servers,
        atenxionUrl: servers[0].atenxionUrl,
        temporalUrl: servers[0].temporalUrl,
        atenxionToken: servers[0].atenxionToken,
        maxConcurrent,
        includeDocId,
        additionalPayload,
        pollWaitSeconds,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ config: publicConfig(config) });
  });

  router.put("/config/additional-payload", async (req, res) => {
    const additionalPayload = normalizeAdditionalPayload(req.body?.additionalPayload);

    const config = await ConfigModel.findByIdAndUpdate(
      "primary",
      { $set: { additionalPayload } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ config: publicConfig(config) });
  });

  return router;
}
