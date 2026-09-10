import fs from "fs";
import path from "path";
import { FileModel } from "../models/File.js";
import { uploadsDir } from "../paths.js";

export async function removeStoredFiles(fileIds) {
  if (!fileIds?.length) return;
  const files = await FileModel.find({ _id: { $in: fileIds } }).select(
    "storedName removedAt"
  );

  for (const file of files) {
    if (file.removedAt) continue;
    fs.rmSync(path.join(uploadsDir, file.storedName), { force: true });
  }

  await FileModel.updateMany(
    { _id: { $in: fileIds }, removedAt: { $exists: false } },
    { $set: { removedAt: new Date() } }
  );
}
