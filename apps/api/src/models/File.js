import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true, unique: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, required: true },
    publicUrl: { type: String, required: true },
    removedAt: Date,
  },
  { timestamps: true }
);

export const FileModel = mongoose.model("File", fileSchema);
