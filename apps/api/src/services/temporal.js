import { normalizeUrl } from "../utils.js";

const TERMINAL = [
  "WORKFLOW_EXECUTION_STATUS_COMPLETED",
  "WORKFLOW_EXECUTION_STATUS_FAILED",
  "WORKFLOW_EXECUTION_STATUS_CANCELED",
  "WORKFLOW_EXECUTION_STATUS_CANCELLED",
  "WORKFLOW_EXECUTION_STATUS_TERMINATED",
  "WORKFLOW_EXECUTION_STATUS_TIMED_OUT",
];

const RUNNING_QUERY = 'ExecutionStatus="Running"';

export function isTerminalWorkflow(status) {
  return TERMINAL.includes(String(status || "").toUpperCase());
}

export function isSuccessfulWorkflow(status) {
  return String(status || "").toUpperCase() === "WORKFLOW_EXECUTION_STATUS_COMPLETED";
}

/** `chat-temporal-agent-{agentObjectId}-{suffix}` → agent ObjectId */
export function parseAgentIdFromWorkflowId(workflowId) {
  const value = String(workflowId || "");
  const match = value.match(/^chat-temporal-agent-([a-f0-9]{24})-/i);
  if (match) return match[1].toLowerCase();
  const parts = value.split("-");
  if (parts.length >= 5 && parts[0] === "chat" && parts[1] === "temporal" && parts[2] === "agent") {
    const candidate = parts[3];
    if (/^[a-f0-9]{24}$/i.test(candidate)) return candidate.toLowerCase();
  }
  return "";
}

export function countRunningWorkflowsForAgents(workflowIds, agentIds) {
  const allowed = new Set(
    (agentIds || []).map((id) => String(id || "").trim().toLowerCase()).filter(Boolean)
  );
  if (!allowed.size) return 0;
  let count = 0;
  for (const workflowId of workflowIds || []) {
    const agentId = parseAgentIdFromWorkflowId(workflowId);
    if (agentId && allowed.has(agentId)) count += 1;
  }
  return count;
}

function temporalHeaders(atenxionToken) {
  const headers = { Accept: "application/json" };
  if (atenxionToken) headers.Authorization = atenxionToken;
  return headers;
}

export async function listRunningWorkflowIds({ temporalUrl, atenxionToken }) {
  const base = normalizeUrl(temporalUrl);
  const ids = [];
  let nextPageToken = "";

  for (let page = 0; page < 50; page += 1) {
    const params = new URLSearchParams({ query: RUNNING_QUERY });
    if (nextPageToken) params.set("nextPageToken", nextPageToken);
    const url = `${base}/api/v1/namespaces/default/workflows?${params.toString()}`;
    const response = await fetch(url, { headers: temporalHeaders(atenxionToken) });
    const text = await response.text();
    let body = text;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    if (!response.ok) {
      throw new Error(
        typeof body === "object" && body?.message
          ? body.message
          : `Temporal list failed (${response.status})`
      );
    }
    for (const row of body.executions || []) {
      const workflowId = row?.execution?.workflowId;
      if (workflowId) ids.push(workflowId);
    }
    nextPageToken = body.nextPageToken || "";
    if (!nextPageToken) break;
  }

  return ids;
}

export async function pollWorkflow({ temporalUrl, atenxionToken, workflowId, runId }) {
  const base = normalizeUrl(temporalUrl);
  let url = `${base}/api/v1/namespaces/default/workflows/${encodeURIComponent(workflowId)}`;
  if (runId) {
    url += `?runId=${encodeURIComponent(runId)}`;
  }

  const response = await fetch(url, { headers: temporalHeaders(atenxionToken) });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  const workflowStatus =
    body?.workflowExecutionInfo?.status || body?.status || "";

  return {
    ok: response.ok,
    status: response.status,
    workflowStatus,
    body,
  };
}
