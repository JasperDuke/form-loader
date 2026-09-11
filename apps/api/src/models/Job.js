import mongoose from "mongoose";

const payloadPairSchema = new mongoose.Schema(
  {
    key: { type: String, default: "" },
    value: { type: String, default: "" },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    eventId: { type: String, required: true },
    file: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    status: {
      type: String,
      enum: ["pending", "sending", "polling", "sent", "failed", "cancelled"],
      default: "pending",
    },
    docId: String,
    workflowId: String,
    runId: String,
    temporalStatus: String,
    polledAt: Date,
    sentAt: Date,
    responseStatus: Number,
    responseBody: mongoose.Schema.Types.Mixed,
    error: String,
  },
  { _id: true }
);

const serverRunSchema = new mongoose.Schema(
  {
    atenxionUrl: { type: String, required: true },
    temporalUrl: { type: String, required: true },
    atenxionToken: { type: String, required: true, select: false },
    status: {
      type: String,
      enum: ["queued", "sending", "completed", "cancelled", "failed", "partial"],
      default: "queued",
    },
    items: [itemSchema],
  },
  { _id: true }
);

const batchSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    eventId: { type: String, required: true },
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    status: {
      type: String,
      enum: ["pending", "sending", "polling", "sent", "failed", "cancelled"],
      default: "pending",
    },
    docId: String,
    workflowId: String,
    runId: String,
    temporalStatus: String,
    polledAt: Date,
    sentAt: Date,
    responseStatus: Number,
    responseBody: mongoose.Schema.Types.Mixed,
    error: String,
  },
  { _id: true }
);

const jobSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    jobDescription: { type: String, default: "" },
    atenxionUrl: { type: String, default: "" },
    temporalUrl: { type: String, default: "" },
    atenxionToken: { type: String, default: "", select: false },
    maxConcurrent: { type: Number, required: true },
    batchSize: { type: Number, required: true },
    includeDocId: { type: Boolean, default: false },
    additionalPayload: { type: [payloadPairSchema], default: [] },
    waitTime: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["queued", "sending", "waiting", "completed", "cancelled", "failed", "partial"],
      default: "queued",
      index: true,
    },
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    servers: [serverRunSchema],
    batches: [batchSchema],
    filesDeleted: { type: Boolean, default: false },
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

jobSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.atenxionToken;
    delete ret.__v;
    if (Array.isArray(ret.servers)) {
      ret.servers.forEach((server) => {
        delete server.atenxionToken;
      });
    }
    return ret;
  },
});

export const JobModel = mongoose.model("Job", jobSchema);
