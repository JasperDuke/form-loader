import { normalizeUrl } from "./utils.js";

/** Outward-facing API base URL (for /files/... links). Set in production/Docker. */
export function configuredPublicApiUrl() {
  const raw = process.env.PUBLIC_API_URL || process.env.PUBLIC_ORIGIN;
  if (!raw || !String(raw).trim()) return null;
  return normalizeUrl(String(raw).trim());
}

function publicOriginFromRequest(req, port) {
  const forwardedProto = req.get("x-forwarded-proto");
  const proto = forwardedProto
    ? forwardedProto.split(",")[0].trim()
    : req.protocol || "http";
  const host = req.get("x-forwarded-host") || req.get("host");
  if (host) {
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return `http://localhost:${port}`;
}

export function resolvePublicOrigin(req, port) {
  return configuredPublicApiUrl() || publicOriginFromRequest(req, port);
}
