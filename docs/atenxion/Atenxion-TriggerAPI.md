# Atenxion Agent Trigger API

Call the agent trigger endpoint with an **`event_id`** and your API **token**. For file jobs, include **`file_urls`**.

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://backend.atenxion.ai` |
| **QA** | `https://api-qa.atenxion.ai` |

```http
POST /api/trigger/agent-trigger
```

---

## Authentication

| Header | Value |
|--------|--------|
| `Authorization` | Atenxion API token (raw value, no `Bearer`) |
| `Content-Type` | `application/json` |

---

## Request body (JSON)

### Required

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | string | Unique id for this trigger (e.g. `event_fd963328a70f`). |

### Files

| Field | Type | Description |
|-------|------|-------------|
| `file_urls` | array of strings | Public HTTPS URLs Atenxion can download. |

```json
"file_urls": ["https://files.example.com/report.pdf"]
```

```json
"file_urls": [
  "https://files.example.com/a.pdf",
  "https://files.example.com/b.pdf"
]
```

### Optional

| Field | Type | Description |
|-------|------|-------------|
| `Doc_ID` | string | Document id when your workflow uses it. |

You may include **any other top-level JSON fields** your workflow expects.

Example:

```json
{
  "event_id": "event_a1b2c3d4e5f6",
  "file_urls": [
    "https://cdn.example.com/invoices/inv-1001.pdf"
  ],
  "Doc_ID": "20260914-a1b2c3d4"
}
```

---

## Examples

### QA

```bash
curl -X POST "https://api-qa.atenxion.ai/api/trigger/agent-trigger" \
  -H "Authorization: YOUR_ATENXION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "event_fd963328a70f",
    "file_urls": ["https://files.example.com/report.pdf"]
  }'
```

### Production

```bash
curl -X POST "https://backend.atenxion.ai/api/trigger/agent-trigger" \
  -H "Authorization: YOUR_ATENXION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "event_fd963328a70f",
    "file_urls": ["https://files.example.com/report.pdf"]
  }'
```

---

## Response (HTTP 200)

| Field | Description |
|-------|-------------|
| `success` | Whether the trigger was accepted |
| `message` | Status message |
| `workflow_id` | Temporal workflow id |
| `run_id` | Temporal run id |

```json
{
  "success": true,
  "message": "Trigger success",
  "workflow_id": "agent-workflow-abc123",
  "run_id": "0192a1b2-c3d4-7e8f-9abc-def012345678"
}
```

| HTTP status | Meaning |
|-------------|---------|
| `400` | Invalid request |
| `401` | Invalid or missing token |
| `500` | Server error |

---

## OpenAPI

[openapi.yaml](./openapi.yaml)
