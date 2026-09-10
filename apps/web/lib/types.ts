export const MAX_FILES = 500;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;
export const ACCEPT_EXTENSIONS = [".pdf", ".docx", ".xlsx"] as const;
export const ACCEPT_ATTR = ".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type AppConfig = {
  atenxionUrl: string;
  atenxionToken: string;
  batchSize: number;
  waitTime: number;
};

export type FileRecord = {
  _id: string;
  id?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  publicUrl: string;
  createdAt?: string;
};

export type BatchStatus = "pending" | "sending" | "sent" | "failed" | "cancelled";

export type BatchRecord = {
  _id: string;
  index: number;
  eventId: string;
  files: FileRecord[];
  status: BatchStatus;
  sentAt?: string;
  responseStatus?: number;
  responseBody?: unknown;
  error?: string;
};

export type JobStatus =
  | "queued"
  | "sending"
  | "waiting"
  | "completed"
  | "cancelled"
  | "failed"
  | "partial";

export type JobRecord = {
  _id: string;
  eventId: string;
  jobDescription: string;
  atenxionUrl: string;
  batchSize: number;
  waitTime: number;
  status: JobStatus;
  files: FileRecord[];
  batches: BatchRecord[];
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020";
}

export function normalizeAtenxionUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

export function isActiveStatus(status: JobStatus) {
  return status === "queued" || status === "sending" || status === "waiting";
}

export function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function fileExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export function isAllowedFile(file: File) {
  return [".pdf", ".docx", ".xlsx"].includes(fileExtension(file.name));
}
