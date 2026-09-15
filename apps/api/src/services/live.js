import { WebSocketServer } from "ws";
import { JobModel } from "../models/Job.js";
import { verifyAuthHeader } from "../middleware/auth.js";

const JOB_POPULATE = [
  { path: "files" },
  { path: "servers.items.file" },
  { path: "batches.files" },
];

let wss = null;

export function attachLive(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (socket, request) => {
    const url = new URL(request.url || "", "http://localhost");
    const token = url.searchParams.get("token") || "";
    const header = request.headers.authorization || token;
    if (!verifyAuthHeader(header)) {
      socket.close(4401, "Unauthorized");
      return;
    }
    socket.send(JSON.stringify({ type: "hello" }));
  });
  const timer = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.ping();
    });
  }, 25000);
  wss.on("close", () => clearInterval(timer));
}

export async function emitJob(jobId) {
  if (!wss) return;
  const job = await JobModel.findById(jobId)
    .select("-atenxionToken -servers.atenxionToken")
    .populate(JOB_POPULATE);
  if (!job) return;
  const payload = JSON.stringify({ type: "job", job });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

export function emitJobDeleted(jobId) {
  if (!wss) return;
  const payload = JSON.stringify({ type: "job-deleted", id: String(jobId) });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

export const JOB_POPULATE_PATHS = JOB_POPULATE;
