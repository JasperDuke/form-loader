import { JobModel } from "../models/Job.js";
import { triggerAgent } from "./atenxion.js";
import { sleep } from "../utils.js";

const processing = new Set();

export function enqueueJob(jobId) {
  const id = String(jobId);
  if (processing.has(id)) return;
  processing.add(id);
  processJob(id)
    .catch((error) => {
      console.error(`Job ${id} failed:`, error);
    })
    .finally(() => {
      processing.delete(id);
    });
}

export async function resumePendingJobs() {
  const jobs = await JobModel.find({
    status: { $in: ["queued", "sending", "waiting"] },
  }).select("_id");

  for (const job of jobs) {
    enqueueJob(job._id);
  }
}

async function loadJob(id) {
  return JobModel.findById(id).select("+atenxionToken").populate("files").populate("batches.files");
}

async function isCancelled(id) {
  const job = await JobModel.findById(id).select("status cancelledAt");
  return !job || job.status === "cancelled" || Boolean(job.cancelledAt);
}

async function waitWithCancel(jobId, seconds) {
  const total = Math.max(0, Number(seconds) || 0) * 1000;
  if (total === 0) return !(await isCancelled(jobId));

  const started = Date.now();
  while (Date.now() - started < total) {
    if (await isCancelled(jobId)) return false;
    const remaining = total - (Date.now() - started);
    await sleep(Math.min(250, remaining));
  }
  return !(await isCancelled(jobId));
}

function publicStatus(job) {
  const statuses = job.batches.map((batch) => batch.status);
  const sent = statuses.filter((status) => status === "sent").length;
  const failed = statuses.filter((status) => status === "failed").length;
  const cancelled = statuses.filter((status) => status === "cancelled").length;
  const pending = statuses.filter((status) =>
    ["pending", "sending"].includes(status)
  ).length;

  if (job.cancelledAt || cancelled) {
    return pending || statuses.includes("sending") ? "cancelled" : "cancelled";
  }
  if (pending === 0 && failed === 0) return "completed";
  if (pending === 0 && failed > 0 && sent > 0) return "partial";
  if (pending === 0 && failed > 0 && sent === 0) return "failed";
  return job.status;
}

async function processJob(jobId) {
  let job = await loadJob(jobId);
  if (!job) return;

  if (["completed", "cancelled", "failed", "partial"].includes(job.status)) {
    return;
  }

  if (!job.startedAt) {
    job.startedAt = new Date();
    await job.save();
  }

  for (let i = 0; i < job.batches.length; i += 1) {
    job = await loadJob(jobId);
    if (!job) return;

    if (job.status === "cancelled" || job.cancelledAt) {
      job.batches.forEach((batch) => {
        if (["pending", "sending"].includes(batch.status)) {
          batch.status = "cancelled";
        }
      });
      job.status = "cancelled";
      job.completedAt = job.completedAt || new Date();
      await job.save();
      return;
    }

    const batch = job.batches[i];
    if (["sent", "cancelled"].includes(batch.status)) continue;

    if (batch.status === "failed") continue;

    job.status = "sending";
    batch.status = "sending";
    await job.save();

    const attachments = (batch.files || []).map((file) => file.publicUrl);

    try {
      const result = await triggerAgent({
        atenxionUrl: job.atenxionUrl,
        atenxionToken: job.atenxionToken,
        eventId: batch.eventId,
        jobDescription: job.jobDescription,
        attachments,
      });

      job = await loadJob(jobId);
      const current = job.batches[i];
      current.responseStatus = result.status;
      current.responseBody = result.body;

      if (job.cancelledAt) {
        current.status = result.ok ? "sent" : "failed";
        current.sentAt = result.ok ? new Date() : undefined;
        if (!result.ok) current.error = `Atenxion responded ${result.status}`;
        job.batches.forEach((item, index) => {
          if (index > i && ["pending", "sending"].includes(item.status)) {
            item.status = "cancelled";
          }
        });
        job.status = "cancelled";
        job.completedAt = new Date();
        await job.save();
        return;
      }

      if (result.ok) {
        current.status = "sent";
        current.sentAt = new Date();
        current.error = undefined;
      } else {
        current.status = "failed";
        current.error = `Atenxion responded ${result.status}`;
      }
      await job.save();
    } catch (error) {
      job = await loadJob(jobId);
      const current = job.batches[i];
      current.status = "failed";
      current.error = error.message || "Trigger request failed";
      await job.save();
    }

    const remaining = job.batches
      .slice(i + 1)
      .some((item) => item.status === "pending");

    if (remaining) {
      job.status = "waiting";
      await job.save();
      const shouldContinue = await waitWithCancel(jobId, job.waitTime);
      if (!shouldContinue) {
        job = await loadJob(jobId);
        job.batches.forEach((item) => {
          if (["pending", "sending"].includes(item.status)) {
            item.status = "cancelled";
          }
        });
        job.status = "cancelled";
        job.cancelledAt = job.cancelledAt || new Date();
        job.completedAt = new Date();
        await job.save();
        return;
      }
    }
  }

  job = await loadJob(jobId);
  job.status = publicStatus(job);
  job.completedAt = new Date();
  await job.save();
}
