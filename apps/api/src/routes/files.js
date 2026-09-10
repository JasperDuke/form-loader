import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import { FileModel } from "../models/File.js";
import { uploadsDir } from "../paths.js";
import {
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  MAX_FILES,
  createStoredName,
  isAllowedFile,
  publicFileUrl,
} from "../utils.js";

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, createStoredName(file.originalname)),
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedFile(file.originalname, file.mimetype)) {
      cb(new Error("INVALID_TYPE"));
      return;
    }
    cb(null, true);
  },
});

function multerErrorMessage(error) {
  if (error?.message === "INVALID_TYPE") {
    return {
      status: 400,
      error: "Only PDF, DOCX, and XLSX files are supported.",
    };
  }
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return { status: 400, error: "File exceeds the 50 MB limit." };
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return { status: 400, error: "Maximum 500 files." };
    }
  }
  return { status: 500, error: error.message || "Upload failed." };
}

export function filesRouter(publicOrigin) {
  const router = express.Router();

  router.post("/upload", (req, res) => {
    upload.array("files", MAX_FILES)(req, res, async (error) => {
      if (error) {
        const mapped = multerErrorMessage(error);
        res.status(mapped.status).json({ error: mapped.error });
        return;
      }

      const incoming = req.files || [];
      if (!incoming.length) {
        res.status(400).json({ error: "No files received." });
        return;
      }

      const totalBytes = incoming.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_TOTAL_BYTES) {
        incoming.forEach((file) => fs.rmSync(file.path, { force: true }));
        res.status(400).json({ error: "The total upload exceeds the 1 GB limit." });
        return;
      }

      try {
        const docs = await FileModel.insertMany(
          incoming.map((file) => ({
            originalName: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            publicUrl: publicFileUrl(publicOrigin, file.filename),
          }))
        );

        res.json({
          files: docs.map((doc) => ({
            _id: doc._id.toString(),
            id: doc._id.toString(),
            originalName: doc.originalName,
            storedName: doc.storedName,
            mimeType: doc.mimeType,
            size: doc.size,
            publicUrl: doc.publicUrl,
          })),
        });
      } catch (saveError) {
        res.status(500).json({ error: saveError.message || "Upload failed." });
      }
    });
  });

  router.get("/files/:id/download", async (req, res) => {
    const doc = await FileModel.findById(req.params.id);
    if (!doc || doc.removedAt) {
      res.status(404).json({ error: "File not found." });
      return;
    }
    const filePath = path.join(uploadsDir, doc.storedName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File missing on disk." });
      return;
    }
    res.download(filePath, doc.originalName);
  });

  return router;
}
