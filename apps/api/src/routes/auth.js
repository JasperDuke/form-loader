import express from "express";
import { SESSION_TOKEN } from "../middleware/auth.js";

const USER_EMAIL = "system@atenxion.ai";
const USER_PASSWORD = "admin";

export function authRouter() {
  const router = express.Router();

  router.post("/auth/login", (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (email !== USER_EMAIL || password !== USER_PASSWORD) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    res.json({ token: SESSION_TOKEN });
  });

  return router;
}
