import { apiBase, type FileRecord, type JobRecord } from "./types";

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function uploadFiles(files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const response = await fetch(`${apiBase()}/api/upload`, {
    method: "POST",
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
  atenxionUrl: string;
  atenxionToken: string;
  batchSize: number;
  waitTime: number;
}) {
  const response = await fetch(`${apiBase()}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { job: JobRecord };
  return body.job;
}

export async function fetchJobs() {
  const response = await fetch(`${apiBase()}/api/jobs`);
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { jobs: JobRecord[] };
  return body.jobs;
}

export async function fetchJob(id: string) {
  const response = await fetch(`${apiBase()}/api/jobs/${id}`);
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { job: JobRecord };
  return body.job;
}

export async function cancelJob(id: string) {
  const response = await fetch(`${apiBase()}/api/jobs/${id}/cancel`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { job: JobRecord };
  return body.job;
}

export async function deleteJob(id: string) {
  const response = await fetch(`${apiBase()}/api/jobs/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await readError(response));
}

export function downloadUrl(fileId: string) {
  return `${apiBase()}/api/files/${fileId}/download`;
}
