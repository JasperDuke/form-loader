import express from "express";
import { FileModel } from "../models/File.js";
import { JobModel } from "../models/Job.js";
import { enqueueJob } from "../services/queue.js";
import { createEventId, MAX_FILES, normalizeAtenxionUrl } from "../utils.js";

const JOB_POPULATE = [
  { path: "files" },
  { path: "batches.files" },
];

export function jobsRouter() {
  const router = express.Router();

  router.post("/analyze", async (req, res) => {
    try {
      const {
        fileIds,
        jobDescription = "",
        atenxionUrl,
        atenxionToken,
        batchSize,
        waitTime,
      } = req.body || {};

      const url = normalizeAtenxionUrl(atenxionUrl);
      const token = String(atenxionToken || "").trim();
      const ids = Array.isArray(fileIds)
        ? fileIds.map(String).filter((id) => id && id !== "undefined")
        : [];
      const size = Number(batchSize);
      const wait = Number(waitTime);

      if (!url || !token) {
        res.status(400).json({
          error: "Please configure the Atenxion URL and token first.",
        });
        return;
      }

      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("invalid");
        }
      } catch {
        res.status(400).json({ error: "Atenxion URL is invalid." });
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
      if (!Number.isInteger(size) || size < 1 || size > MAX_FILES) {
        res.status(400).json({ error: "Batch size must be between 1 and 500." });
        return;
      }
      if (!Number.isFinite(wait) || wait < 0) {
        res.status(400).json({ error: "Wait time must be 0 or greater." });
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

      const batches = [];
      for (let i = 0; i < ordered.length; i += size) {
        const slice = ordered.slice(i, i + size);
        batches.push({
          index: batches.length + 1,
          eventId: createEventId(),
          files: slice.map((file) => file._id),
          status: "pending",
        });
      }

      const job = await JobModel.create({
        eventId: createEventId(),
        jobDescription: String(jobDescription || ""),
        atenxionUrl: url,
        atenxionToken: token,
        batchSize: size,
        waitTime: wait,
        status: "queued",
        files: ordered.map((file) => file._id),
        batches,
      });

      enqueueJob(job._id);

      const created = await JobModel.findById(job._id)
        .select("-atenxionToken")
        .populate(JOB_POPULATE);

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
      .select("-atenxionToken")
      .populate(JOB_POPULATE)
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ jobs });
  });

  router.get("/jobs/:id", async (req, res) => {
    const job = await JobModel.findById(req.params.id)
      .select("-atenxionToken")
      .populate(JOB_POPULATE);
    if (!job) {
      res.status(404).json({ error: "Job not found." });
      return;
    }
    res.json({ job });
  });

  router.post("/jobs/:id/cancel", async (req, res) => {
    const job = await JobModel.findById(req.params.id).select("-atenxionToken");
    if (!job) {
      res.status(404).json({ error: "Job not found." });
      return;
    }

    if (["completed", "cancelled", "failed", "partial"].includes(job.status)) {
      const populated = await JobModel.findById(job._id)
        .select("-atenxionToken")
        .populate(JOB_POPULATE);
      res.json({ job: populated });
      return;
    }

    job.cancelledAt = new Date();
    job.batches.forEach((batch) => {
      if (batch.status === "pending") {
        batch.status = "cancelled";
      }
    });
    job.status = "cancelled";
    await job.save();

    const populated = await JobModel.findById(job._id)
      .select("-atenxionToken")
      .populate(JOB_POPULATE);
    res.json({ job: populated });
  });

  return router;
}
