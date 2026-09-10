import express from "express";
import { ConfigModel } from "../models/Config.js";
import { FileModel } from "../models/File.js";
import { JobModel } from "../models/Job.js";
import { enqueueJob, withJobLock } from "../services/queue.js";
import { removeStoredFiles } from "../services/storage.js";
import { emitJob, emitJobDeleted, JOB_POPULATE_PATHS } from "../services/live.js";
import { normalizeServers } from "./config.js";
import {
  createDocId,
  createEventId,
  MAX_FILES,
} from "../utils.js";

export function jobsRouter() {
  const router = express.Router();

  router.post("/analyze", async (req, res) => {
    try {
      const { fileIds, jobDescription = "" } = req.body || {};
      const savedConfig = await ConfigModel.findById("primary").lean();
      const destinations = normalizeServers(savedConfig).filter(
        (server) => server.atenxionUrl && server.temporalUrl && server.atenxionToken
      );
      const ids = Array.isArray(fileIds)
        ? fileIds.map(String).filter((id) => id && id !== "undefined")
        : [];
      const maxConcurrent = Number(
        savedConfig?.maxConcurrent || savedConfig?.batchSize
      );
      const includeDocId = Boolean(savedConfig?.includeDocId);

      if (!destinations.length) {
        res.status(400).json({
          error:
            "Please configure at least one Atenxion URL, Temporal URL, and token first.",
        });
        return;
      }

      if (!ids.length) {
        res.status(400).json({ error: "No files to send." });
        return;
      }
      if (ids.length > MAX_FILES) {
        res.status(400).json({ error: "Maximum 500 files." });
        return;
      }
      if (
        !Number.isInteger(maxConcurrent) ||
        maxConcurrent < 1 ||
        maxConcurrent > MAX_FILES
      ) {
        res.status(400).json({
          error: "Max concurrent APIs must be between 1 and 500.",
        });
        return;
      }

      const files = await FileModel.find({ _id: { $in: ids } });
      if (files.length !== ids.length) {
        res.status(400).json({ error: "One or more files were not found." });
        return;
      }

      const ordered = ids.map((id) =>
        files.find((file) => file._id.toString() === id)
      );

      const docIds = includeDocId
        ? ordered.map(() => createDocId())
        : ordered.map(() => undefined);

      const servers = destinations.map((destination) => ({
        atenxionUrl: destination.atenxionUrl,
        temporalUrl: destination.temporalUrl,
        atenxionToken: destination.atenxionToken,
        status: "queued",
        items: ordered.map((file, index) => ({
          index: index + 1,
          eventId: createEventId(),
          file: file._id,
          status: "pending",
          docId: docIds[index],
        })),
      }));

      const job = await JobModel.create({
        eventId: createEventId(),
        jobDescription: String(jobDescription || ""),
        atenxionUrl: destinations[0].atenxionUrl,
        temporalUrl: destinations[0].temporalUrl,
        atenxionToken: destinations[0].atenxionToken,
        maxConcurrent,
        batchSize: maxConcurrent,
        includeDocId,
        waitTime: 0,
        status: "queued",
        files: ordered.map((file) => file._id),
        servers,
        batches: [],
      });

      enqueueJob(job._id);

      const created = await JobModel.findById(job._id)
        .select("-atenxionToken -servers.atenxionToken")
        .populate(JOB_POPULATE_PATHS);

      emitJob(job._id).catch(() => {});
      res.status(201).json({ job: created });
    } catch (error) {
      if (error?.name === "CastError") {
        res.status(400).json({ error: "One or more files were not found." });
        return;
      }
      res.status(500).json({ error: error.message || "Failed to start dispatch." });
    }
  });

  router.get("/jobs", async (_req, res) => {
    const jobs = await JobModel.find()
      .select("-atenxionToken -servers.atenxionToken")
      .populate(JOB_POPULATE_PATHS)
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ jobs });
  });

  router.get("/jobs/:id", async (req, res) => {
    const job = await JobModel.findById(req.params.id)
      .select("-atenxionToken -servers.atenxionToken")
      .populate(JOB_POPULATE_PATHS);
    if (!job) {
      res.status(404).json({ error: "Job not found." });
      return;
    }
    res.json({ job });
  });

  router.delete("/jobs/:id", async (req, res) => {
    const job = await JobModel.findById(req.params.id).select("status files");
    if (!job) {
      res.status(404).json({ error: "Job not found." });
      return;
    }

    if (["queued", "sending", "waiting"].includes(job.status)) {
      res.status(409).json({
        error: "Cancel the active dispatch before deleting its history.",
      });
      return;
    }

    await removeStoredFiles(job.files);
    await FileModel.deleteMany({ _id: { $in: job.files } });
    await JobModel.deleteOne({ _id: job._id });
    emitJobDeleted(job._id);
    res.status(204).send();
  });

  router.post("/jobs/:id/cancel", async (req, res) => {
    try {
      const populated = await withJobLock(req.params.id, async () => {
        const job = await JobModel.findById(req.params.id).select(
          "-atenxionToken -servers.atenxionToken"
        );
        if (!job) return null;

        if (["completed", "cancelled", "failed", "partial"].includes(job.status)) {
          return JobModel.findById(job._id)
            .select("-atenxionToken -servers.atenxionToken")
            .populate(JOB_POPULATE_PATHS);
        }

        job.cancelledAt = new Date();
        job.status = "cancelled";
        (job.servers || []).forEach((server) => {
          server.items.forEach((item) => {
            if (item.status === "pending") item.status = "cancelled";
          });
        });
        (job.batches || []).forEach((batch) => {
          if (batch.status === "pending") batch.status = "cancelled";
        });
        await job.save();

        return JobModel.findById(job._id)
          .select("-atenxionToken -servers.atenxionToken")
          .populate(JOB_POPULATE_PATHS);
      });

      if (!populated) {
        res.status(404).json({ error: "Job not found." });
        return;
      }

      emitJob(populated._id).catch(() => {});
      res.json({ job: populated });
    } catch (error) {
      res.status(500).json({ error: error.message || "Cancel failed." });
    }
  });

  return router;
}
