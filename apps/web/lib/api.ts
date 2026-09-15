import { authHeaders, clearAuthToken, getAuthToken } from "./auth";
import { apiBase, type FileRecord, type JobRecord } from "./types";

async function readError(response: Response) {
  if (response.status === 401) {
    clearAuthToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return "Session expired. Please sign in again.";
  }
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function authorizedDownloadUrl(fileId: string) {
  const token = getAuthToken();
  const url = `${apiBase()}/api/files/${fileId}/download`;
  if (!token) return url;
  return `${url}?token=${encodeURIComponent(token)}`;
}

export async function uploadFiles(files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const response = await fetch(`${apiBase()}/api/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { files: FileRecord[] };
  return body.files.map((file) => ({
    ...file,
    _id: file._id || file.id || "",
  }));
}

export async function startAnalyze(payload: {
  fileIds: string[];
  jobDescription: string;
}) {
  const response = await fetch(`${apiBase()}/api/analyze`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { job: JobRecord };
  return body.job;
}

export async function fetchJobs() {
  const response = await fetch(`${apiBase()}/api/jobs`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { jobs: JobRecord[] };
  return body.jobs;
}

export async function fetchJob(id: string) {
  const response = await fetch(`${apiBase()}/api/jobs/${id}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { job: JobRecord };
  return body.job;
}

export async function cancelJob(id: string) {
  const response = await fetch(`${apiBase()}/api/jobs/${id}/cancel`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { job: JobRecord };
  return body.job;
}

export async function deleteJob(id: string) {
  const response = await fetch(`${apiBase()}/api/jobs/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export function downloadUrl(fileId: string) {
  return authorizedDownloadUrl(fileId);
}
