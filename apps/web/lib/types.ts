export const MAX_FILES = 500;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;
export const ACCEPT_EXTENSIONS = [".pdf", ".docx", ".xlsx"] as const;
export const ACCEPT_ATTR = ".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type DestinationConfig = {
  atenxionUrl: string;
  temporalUrl: string;
  atenxionToken: string;
};

export type PayloadPair = {
  key: string;
  value: string;
};

export type AppConfig = {
  servers: DestinationConfig[];
  maxConcurrent: number;
  includeDocId: boolean;
  additionalPayload: PayloadPair[];
};

export type FileRecord = {
  _id: string;
  id?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  publicUrl: string;
  removedAt?: string;
  createdAt?: string;
};

export type ItemStatus =
  | "pending"
  | "sending"
  | "polling"
  | "sent"
  | "failed"
  | "cancelled";

export type DispatchItem = {
  _id: string;
  index: number;
  eventId: string;
  file?: FileRecord;
  files?: FileRecord[];
  status: ItemStatus;
  docId?: string;
  workflowId?: string;
  runId?: string;
  temporalStatus?: string;
  polledAt?: string;
  sentAt?: string;
  responseStatus?: number;
  responseBody?: unknown;
  error?: string;
};

export type ServerRun = {
  _id: string;
  atenxionUrl: string;
  temporalUrl: string;
  status: string;
  items: DispatchItem[];
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
  temporalUrl?: string;
  maxConcurrent?: number;
  batchSize: number;
  includeDocId?: boolean;
  waitTime?: number;
  status: JobStatus;
  files: FileRecord[];
  servers?: ServerRun[];
  batches?: DispatchItem[];
  filesDeleted?: boolean;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020";
}

export function wsUrl() {
  return `${apiBase().replace(/^http/, "ws")}/ws`;
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

export function concurrencyOf(job: JobRecord) {
  return Number(job.maxConcurrent || job.batchSize || 1);
}

export function jobServers(job: JobRecord): ServerRun[] {
  if (job.servers?.length) return job.servers;
  return [
    {
      _id: "legacy",
      atenxionUrl: job.atenxionUrl,
      temporalUrl: job.temporalUrl || "",
      status: job.status,
      items: (job.batches || []).map((batch) => ({
        ...batch,
        file: batch.file || batch.files?.[0],
      })),
    },
  ];
}

export function formatWhen(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function itemCounts(items: DispatchItem[]) {
  return {
    total: items.length,
    done: items.filter((item) => item.status === "sent").length,
    finished: items.filter((item) =>
      ["sent", "failed", "cancelled"].includes(item.status)
    ).length,
    running: items.filter((item) =>
      ["sending", "polling"].includes(item.status)
    ).length,
    waiting: items.filter((item) => item.status === "pending").length,
    failed: items.filter((item) => item.status === "failed").length,
  };
}

export function submissionCounts(job: JobRecord) {
  const servers = jobServers(job);
  const items = servers.flatMap((server) => server.items);
  return {
    ...itemCounts(items),
    servers: servers.length,
    files: job.files?.length || 0,
  };
}

export function statusLabel(status: string) {
  if (status === "sent") return "done";
  if (status === "polling") return "running";
  if (status === "sending") return "sending";
  if (status === "pending") return "waiting";
  return status.replace(/_/g, " ");
}
