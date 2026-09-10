import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    eventId: { type: String, required: true },
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed", "cancelled"],
      default: "pending",
    },
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
    atenxionUrl: { type: String, required: true },
    atenxionToken: { type: String, required: true, select: false },
    batchSize: { type: Number, required: true },
    waitTime: { type: Number, required: true },
    status: {
      type: String,
      enum: ["queued", "sending", "waiting", "completed", "cancelled", "failed", "partial"],
      default: "queued",
      index: true,
    },
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    batches: [batchSchema],
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
    return ret;
  },
});

export const JobModel = mongoose.model("Job", jobSchema);
