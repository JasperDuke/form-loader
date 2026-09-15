import crypto from "crypto";

const USER_EMAIL = "system@atenxion.ai";
const USER_PASSWORD = "admin";

export const SESSION_TOKEN = crypto
  .createHash("sha256")
  .update(`${USER_EMAIL}:${USER_PASSWORD}:ram-data-extraction-portal`)
  .digest("hex");

export function verifyAuthHeader(header) {
  const value = String(header || "").trim();
  return value.length > 0 && value === SESSION_TOKEN;
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization || req.query?.token;
  if (verifyAuthHeader(token)) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized." });
}
