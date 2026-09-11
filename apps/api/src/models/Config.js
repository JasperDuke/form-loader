import mongoose from "mongoose";

const serverConfigSchema = new mongoose.Schema(
  {
    atenxionUrl: { type: String, default: "" },
    temporalUrl: { type: String, default: "" },
    atenxionToken: { type: String, default: "" },
  },
  { _id: true }
);

const payloadPairSchema = new mongoose.Schema(
  {
    key: { type: String, default: "" },
    value: { type: String, default: "" },
  },
  { _id: false }
);

const configSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "primary" },
    servers: { type: [serverConfigSchema], default: [] },
    atenxionUrl: { type: String, default: "" },
    temporalUrl: { type: String, default: "" },
    atenxionToken: { type: String, default: "" },
    maxConcurrent: { type: Number, default: 4 },
    includeDocId: { type: Boolean, default: false },
    additionalPayload: { type: [payloadPairSchema], default: [] },
  },
  { timestamps: true }
);

export const ConfigModel = mongoose.model("Config", configSchema);
