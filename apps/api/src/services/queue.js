import { JobModel } from "../models/Job.js";
import { triggerAgent } from "./atenxion.js";
import { emitJob } from "./live.js";
import { removeStoredFiles } from "./storage.js";
import { isSuccessfulWorkflow, isTerminalWorkflow, pollWorkflow } from "./temporal.js";
import { DEFAULT_POLL_WAIT_SECONDS, sleep } from "../utils.js";

const processing = new Set();
const jobLocks = new Map();

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
  const pending = await JobModel.find({
    status: { $in: ["queued", "sending", "waiting"] },
  }).select("_id");

  for (const job of pending) {
    enqueueJob(job._id);
  }

  const leftover = await JobModel.find({
    filesDeleted: { $ne: true },
    status: { $in: ["completed", "failed", "partial", "cancelled"] },
  }).select("files servers batches status");

  for (const job of leftover) {
    if (!allProcessed(job)) continue;
    await removeStoredFiles(job.files);
    job.filesDeleted = true;
    await job.save();
    await emitJob(job._id);
  }
}

export function withJobLock(jobId, fn) {
  const key = String(jobId);
  const previous = jobLocks.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(fn);
  jobLocks.set(key, current);
  current.finally(() => {
    if (jobLocks.get(key) === current) jobLocks.delete(key);
  });
  return current;
}

async function loadJob(id) {
  return JobModel.findById(id)
    .select("+atenxionToken +servers.atenxionToken")
    .populate("files")
    .populate("servers.items.file")
    .populate("batches.files");
}

function maxConcurrentOf(job) {
  return Number(job.maxConcurrent || job.batchSize || 1);
}

function pollWaitMsOf(job) {
  const seconds = Number(job?.pollWaitSeconds ?? DEFAULT_POLL_WAIT_SECONDS);
  if (!Number.isFinite(seconds) || seconds < 1) {
    return DEFAULT_POLL_WAIT_SECONDS * 1000;
  }
  return Math.round(seconds) * 1000;
}

function inFlightCount(server) {
  return (server.items || []).filter((item) =>
    ["sending", "polling"].includes(item.status)
  ).length;
}

function isTerminalItem(status) {
  return ["sent", "failed", "cancelled"].includes(status);
}

function allItemsTerminal(job) {
  if (job.servers?.length) {
    return job.servers.every((server) =>
      (server.items || []).every((item) => isTerminalItem(item.status))
    );
  }
  const batches = job.batches || [];
  return (
    batches.length > 0 && batches.every((batch) => isTerminalItem(batch.status))
  );
}

function allProcessed(job) {
  if (job.servers?.length) {
    return job.servers.every((server) =>
      (server.items || []).every((item) => item.status === "sent" || item.status === "failed")
    );
  }
  const batches = job.batches || [];
  return (
    batches.length > 0 &&
    batches.every((batch) => batch.status === "sent" || batch.status === "failed")
  );
}

function serverStatus(server, cancelled) {
  const statuses = (server.items || []).map((item) => item.status);
  const sent = statuses.filter((status) => status === "sent").length;
  const failed = statuses.filter((status) => status === "failed").length;
  const pending = statuses.filter((status) =>
    ["pending", "sending", "polling"].includes(status)
  ).length;
  if (cancelled && pending === 0) return "cancelled";
  if (pending === 0 && failed === 0) return "completed";
  if (pending === 0 && failed > 0 && sent > 0) return "partial";
  if (pending === 0 && failed > 0 && sent === 0) return "failed";
  if (pending > 0) return "sending";
  return server.status;
}

function jobStatusFromServers(job) {
  const servers = job.servers || [];
  const statuses = servers.map((server) => server.status);
  if (job.cancelledAt && allItemsTerminal(job)) return "cancelled";
  if (statuses.every((status) => status === "completed")) return "completed";
  if (statuses.every((status) => status === "failed")) return "failed";
  if (
    statuses.every((status) =>
      ["completed", "failed", "partial", "cancelled"].includes(status)
    )
  ) {
    return "partial";
  }
  return "sending";
}

function progressSnapshot(job) {
  return JSON.stringify({
    status: job.status,
    filesDeleted: job.filesDeleted,
    servers: (job.servers || []).map((server) => ({
      id: String(server._id),
      status: server.status,
      items: (server.items || []).map((item) => ({
        id: String(item._id),
        status: item.status,
        error: item.error || "",
        workflowId: item.workflowId || "",
      })),
    })),
  });
}

function applyPollResult(item, result) {
  item.polledAt = new Date();
  if (result.error && !result.status) {
    item.error = result.error;
    return;
  }
  item.temporalStatus = result.workflowStatus || item.temporalStatus;
  if (!result.ok) {
    item.error = result.error || `Temporal responded ${result.status}`;
    return;
  }
  if (!isTerminalWorkflow(result.workflowStatus)) return;
  if (isSuccessfulWorkflow(result.workflowStatus)) {
    item.status = "sent";
    item.sentAt = new Date();
    item.error = undefined;
    return;
  }
  item.status = "failed";
  item.error = result.workflowStatus || "Workflow failed.";
}

async function pollTargets(temporalUrl, atenxionToken, items) {
  const results = [];
  for (const item of items) {
    try {
      const result = await pollWorkflow({
        temporalUrl,
        atenxionToken,
        workflowId: item.workflowId,
        runId: item.runId,
      });
      results.push({ id: item.id, ...result });
    } catch (error) {
      results.push({
        id: item.id,
        error: error.message || "Temporal poll failed.",
      });
    }
  }
  return results;
}

async function startNextFile(jobId, serverId, itemId) {
  const payload = await withJobLock(jobId, async () => {
    const job = await loadJob(jobId);
    if (!job) return null;
    const server = job.servers.id(serverId);
    const item = server?.items.id(itemId);
    if (!item || item.status !== "pending") return null;

    job.status = "sending";
    server.status = "sending";
    item.status = "sending";
    await job.save();
    await emitJob(job._id);

    return {
      atenxionUrl: server.atenxionUrl,
      atenxionToken: server.atenxionToken,
      eventId: item.eventId,
      jobDescription: job.jobDescription,
      attachments: item.file?.publicUrl ? [item.file.publicUrl] : [],
      docId: job.includeDocId ? item.docId : undefined,
      additionalPayload: job.additionalPayload,
    };
  });

  if (!payload) return;

  try {
    const result = await triggerAgent(payload);
    await withJobLock(jobId, async () => {
      const current = await loadJob(jobId);
      if (!current) return;
      const currentServer = current.servers.id(serverId);
      const currentItem = currentServer.items.id(itemId);
      currentItem.responseStatus = result.status;
      currentItem.responseBody = result.body;
      currentItem.workflowId = result.workflowId || undefined;
      currentItem.runId = result.runId || undefined;

      if (current.cancelledAt) {
        currentItem.status = result.ok ? "cancelled" : "failed";
        if (!result.ok) currentItem.error = `Atenxion responded ${result.status}`;
      } else if (!result.ok) {
        currentItem.status = "failed";
        currentItem.error = `Atenxion responded ${result.status}`;
      } else if (!result.workflowId || !result.runId) {
        currentItem.status = "failed";
        currentItem.error = "Trigger succeeded but workflow_id or run_id was missing.";
      } else {
        currentItem.status = "polling";
        currentItem.error = undefined;
      }
      await current.save();
      await emitJob(current._id);
    });
  } catch (error) {
    await withJobLock(jobId, async () => {
      const current = await loadJob(jobId);
      if (!current) return;
      const currentServer = current.servers.id(serverId);
      const currentItem = currentServer.items.id(itemId);
      currentItem.status = "failed";
      currentItem.error = error.message || "Trigger request failed.";
      await current.save();
      await emitJob(current._id);
    });
  }
}

async function processServer(jobId, serverId) {
  while (true) {
    const targets = await withJobLock(jobId, async () => {
      const job = await loadJob(jobId);
      if (!job) return { stop: true };
      const server = job.servers.id(serverId);
      if (!server) return { stop: true };
      return {
        stop: false,
        temporalUrl: server.temporalUrl,
        atenxionToken: server.atenxionToken,
        items: server.items
          .filter((item) => item.status === "polling" && item.workflowId && item.runId)
          .map((item) => ({
            id: item._id,
            workflowId: item.workflowId,
            runId: item.runId,
          })),
      };
    });

    if (targets.stop) return;

    const pollResults = await pollTargets(
      targets.temporalUrl,
      targets.atenxionToken,
      targets.items
    );

    const step = await withJobLock(jobId, async () => {
      const job = await loadJob(jobId);
      if (!job) return { stop: true };
      const server = job.servers.id(serverId);
      if (!server) return { stop: true };

      const before = progressSnapshot(job);
      const cancelled = Boolean(job.cancelledAt);
      if (cancelled) {
        server.items.forEach((item) => {
          if (item.status === "pending") item.status = "cancelled";
        });
      }

      for (const result of pollResults) {
        const item = server.items.id(result.id);
        if (!item || item.status !== "polling") continue;
        applyPollResult(item, result);
      }

      server.items.forEach((item) => {
        if (item.status === "polling" && (!item.workflowId || !item.runId)) {
          item.status = "failed";
          item.error = "Missing workflow_id or run_id.";
        }
      });

      server.status = serverStatus(server, cancelled);
      await job.save();
      if (before !== progressSnapshot(job)) await emitJob(job._id);

      if (cancelled) {
        return { stop: inFlightCount(server) === 0 };
      }

      const slots = Math.max(0, maxConcurrentOf(job) - inFlightCount(server));
      const ids = [];
      for (const item of server.items) {
        if (ids.length >= slots) break;
        if (item.status === "pending") ids.push(item._id);
      }
      return { stop: false, ids };
    });

    if (step.stop) return;

    for (const itemId of step.ids || []) {
      await startNextFile(jobId, serverId, itemId);
    }

    const done = await withJobLock(jobId, async () => {
      const job = await loadJob(jobId);
      if (!job) return true;
      const server = job.servers.id(serverId);
      if (!server) return true;
      const pending = server.items.some((item) => item.status === "pending");
      const inflight = inFlightCount(server) > 0;
      server.status = serverStatus(server, Boolean(job.cancelledAt));
      await job.save();
      return !pending && !inflight;
    });

    if (done) return;
    const job = await loadJob(jobId);
    await sleep(pollWaitMsOf(job));
  }
}

async function processJob(jobId) {
  const ready = await withJobLock(jobId, async () => {
    let job = await loadJob(jobId);
    if (!job) return false;

    if (["completed", "cancelled", "failed", "partial"].includes(job.status)) {
      if (!job.filesDeleted && allProcessed(job)) {
        await removeStoredFiles(job.files.map((file) => file._id || file));
        job.filesDeleted = true;
        await job.save();
        await emitJob(job._id);
      }
      return false;
    }

    if (!job.startedAt) {
      job.startedAt = new Date();
    }

    if (!job.servers?.length && job.batches?.length) {
      job.servers.push({
        atenxionUrl: job.atenxionUrl,
        temporalUrl: job.temporalUrl,
        atenxionToken: job.atenxionToken,
        status: "queued",
        items: job.batches.map((batch) => ({
          index: batch.index,
          eventId: batch.eventId,
          file: batch.files?.[0]?._id || batch.files?.[0],
          status: batch.status,
          docId: batch.docId,
          workflowId: batch.workflowId,
          runId: batch.runId,
          temporalStatus: batch.temporalStatus,
          error: batch.error,
        })),
      });
    }

    (job.servers || []).forEach((server) => {
      server.items.forEach((item) => {
        if (item.status === "sending" && !item.workflowId && !item.runId) {
          item.status = "pending";
        }
      });
    });
    await job.save();
    return Boolean(job.servers?.length);
  });

  if (!ready) return;

  const current = await loadJob(jobId);
  if (!current?.servers?.length) return;

  await Promise.all(current.servers.map((server) => processServer(jobId, server._id)));

  await withJobLock(jobId, async () => {
    const job = await loadJob(jobId);
    if (!job) return;
    job.servers.forEach((server) => {
      server.status = serverStatus(server, Boolean(job.cancelledAt));
    });
    job.status = jobStatusFromServers(job);
    if (allItemsTerminal(job)) {
      job.completedAt = job.completedAt || new Date();
      if (!job.filesDeleted && allProcessed(job)) {
        await removeStoredFiles(job.files.map((file) => file._id || file));
        job.filesDeleted = true;
      }
    }
    await job.save();
    await emitJob(job._id);
  });
}
