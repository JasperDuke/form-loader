import crypto from "crypto";
import path from "path";

export const MAX_FILES = 500;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;
export const POLL_INTERVAL_MS = 5000;

export const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx"]);

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

export function createEventId() {
  return `event_${crypto.randomBytes(6).toString("hex")}`;
}

export function createDocId() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${yyyy}${mm}${dd}-${suffix}`;
}

export function createStoredName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
}

export function normalizeUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export const normalizeAtenxionUrl = normalizeUrl;

export function isAllowedFile(originalName, mimeType) {
  const ext = path.extname(originalName || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (!mimeType) return true;
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function publicFileUrl(origin, storedName) {
  return `${normalizeUrl(origin)}/files/${encodeURIComponent(storedName)}`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractWorkflowIds(body) {
  const sources = [body];
  if (body && typeof body === "object") {
    sources.push(body.data, body.result, body.payload, body.workflow);
  }

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const workflowId =
      source.workflow_id || source.workflowId || source.WorkflowId;
    const runId = source.run_id || source.runId || source.RunId;
    if (workflowId && runId) {
      return { workflowId: String(workflowId), runId: String(runId) };
    }
  }

  return { workflowId: "", runId: "" };
}
