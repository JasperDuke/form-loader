import { normalizeUrl } from "../utils.js";

const TERMINAL = [
  "WORKFLOW_EXECUTION_STATUS_COMPLETED",
  "WORKFLOW_EXECUTION_STATUS_FAILED",
  "WORKFLOW_EXECUTION_STATUS_CANCELED",
  "WORKFLOW_EXECUTION_STATUS_CANCELLED",
  "WORKFLOW_EXECUTION_STATUS_TERMINATED",
  "WORKFLOW_EXECUTION_STATUS_TIMED_OUT",
];

export function isTerminalWorkflow(status) {
  return TERMINAL.includes(String(status || "").toUpperCase());
}

export function isSuccessfulWorkflow(status) {
  return String(status || "").toUpperCase() === "WORKFLOW_EXECUTION_STATUS_COMPLETED";
}

export async function pollWorkflow({ temporalUrl, atenxionToken, workflowId, runId }) {
  const url = `${normalizeUrl(temporalUrl)}/api/v1/namespaces/default/workflows/${encodeURIComponent(
    workflowId
  )}?runId=${encodeURIComponent(runId)}`;

  const headers = {
    Accept: "application/json",
  };
  if (atenxionToken) {
    headers.Authorization = atenxionToken;
  }

  const response = await fetch(url, { headers });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  const workflowStatus =
    body?.workflowExecutionInfo?.status ||
    body?.status ||
    "";

  return {
    ok: response.ok,
    status: response.status,
    workflowStatus,
    body,
  };
}
