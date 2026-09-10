import { normalizeAtenxionUrl } from "../utils.js";

export async function triggerAgent({
  atenxionUrl,
  atenxionToken,
  eventId,
  jobDescription,
  attachments,
}) {
  const url = `${normalizeAtenxionUrl(atenxionUrl)}/api/trigger/agent-trigger`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: atenxionToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_id: eventId,
      jobDescription: jobDescription || "",
      attachments,
      file_urls: attachments,
    }),
  });

  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}
