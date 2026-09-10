import express from "express";
import { ConfigModel } from "../models/Config.js";
import { normalizeAtenxionUrl } from "../utils.js";

const DEFAULT_CONFIG = {
  atenxionUrl: "",
  atenxionToken: "",
  batchSize: 10,
  waitTime: 5,
};

export function configRouter() {
  const router = express.Router();

  router.get("/config", async (_req, res) => {
    const config = await ConfigModel.findById("primary").lean();
    res.json({
      config: config
        ? {
            atenxionUrl: config.atenxionUrl,
            atenxionToken: config.atenxionToken,
            batchSize: config.batchSize,
            waitTime: config.waitTime,
          }
        : DEFAULT_CONFIG,
    });
  });

  router.put("/config", async (req, res) => {
    const body = req.body || {};
    const atenxionUrl = normalizeAtenxionUrl(body.atenxionUrl);
    const atenxionToken = String(body.atenxionToken || "").trim();
    const batchSize = Number(body.batchSize);
    const waitTime = Number(body.waitTime);

    if (!atenxionUrl || !atenxionToken) {
      res.status(400).json({
        error: "Atenxion URL and token are required.",
      });
      return;
    }

    try {
      const parsed = new URL(atenxionUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      res.status(400).json({ error: "Atenxion URL is invalid." });
      return;
    }

    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
      res.status(400).json({ error: "Batch size must be between 1 and 500." });
      return;
    }
    if (!Number.isFinite(waitTime) || waitTime < 0) {
      res.status(400).json({ error: "Wait time must be 0 or greater." });
      return;
    }

    const config = await ConfigModel.findByIdAndUpdate(
      "primary",
      { atenxionUrl, atenxionToken, batchSize, waitTime },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({
      config: {
        atenxionUrl: config.atenxionUrl,
        atenxionToken: config.atenxionToken,
        batchSize: config.batchSize,
        waitTime: config.waitTime,
      },
    });
  });

  return router;
}
