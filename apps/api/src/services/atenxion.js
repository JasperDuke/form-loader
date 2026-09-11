import { extractWorkflowIds, normalizeUrl } from "../utils.js";

function applyAdditionalPayload(payload, pairs) {
  for (const pair of pairs || []) {
    payload[pair.key] = pair.value;
  }
}

export async function triggerAgent({
  atenxionUrl,
  atenxionToken,
  eventId,
  jobDescription,
  attachments,
  docId,
  additionalPayload,
}) {
  const url = `${normalizeUrl(atenxionUrl)}/api/trigger/agent-trigger`;
  const payload = {
    event_id: eventId,
    jobDescription: jobDescription || "",
    attachments,
    file_urls: attachments,
  };
  if (docId) {
    payload.Doc_ID = docId;
  }
  applyAdditionalPayload(payload, additionalPayload);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: atenxionToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  const { workflowId, runId } = extractWorkflowIds(body);

  return {
    ok: response.ok,
    status: response.status,
    body,
    workflowId,
    runId,
  };
}
