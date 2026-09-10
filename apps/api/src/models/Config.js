import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "primary" },
    atenxionUrl: { type: String, default: "" },
    atenxionToken: { type: String, default: "" },
    batchSize: { type: Number, default: 10 },
    waitTime: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export const ConfigModel = mongoose.model("Config", configSchema);
