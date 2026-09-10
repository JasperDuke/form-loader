import crypto from "crypto";
import path from "path";

export const MAX_FILES = 500;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;

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

export function createStoredName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
}

export function normalizeAtenxionUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export function isAllowedFile(originalName, mimeType) {
  const ext = path.extname(originalName || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (!mimeType) return true;
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function publicFileUrl(origin, storedName) {
  return `${normalizeAtenxionUrl(origin)}/files/${encodeURIComponent(storedName)}`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
