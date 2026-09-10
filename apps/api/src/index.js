import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { filesRouter, uploadsDir } from "./routes/files.js";
import { jobsRouter } from "./routes/jobs.js";
import { resumePendingJobs } from "./services/queue.js";

dotenv.config();

const PORT = Number(process.env.API_PORT || 3020);
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/convoy";
const PUBLIC_ORIGIN = (process.env.PUBLIC_ORIGIN || `http://localhost:${PORT}`).replace(
  /\/+$/,
  ""
);

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

app.use(
  "/files",
  cors({ origin: true }),
  express.static(uploadsDir, {
    fallthrough: false,
    setHeaders(res) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1,
    publicOrigin: PUBLIC_ORIGIN,
  });
});

app.use("/api", filesRouter(PUBLIC_ORIGIN));
app.use("/api", jobsRouter());

app.use((error, _req, res, _next) => {
  if (error) {
    res.status(500).json({ error: error.message || "Server error." });
  }
});

async function start() {
  fs.mkdirSync(uploadsDir, { recursive: true });

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("Ensure MongoDB is running and MONGODB_URI is reachable.");
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Convoy API on ${PUBLIC_ORIGIN}`);
    resumePendingJobs().catch((error) => {
      console.error("Failed to resume jobs:", error);
    });
  });

  server.headersTimeout = 30 * 60 * 1000;
  server.requestTimeout = 30 * 60 * 1000;
  server.timeout = 30 * 60 * 1000;
}

start();
