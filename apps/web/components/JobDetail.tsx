"use client";

import { useMemo, useState } from "react";
import { cancelJob, downloadUrl } from "@/lib/api";
import {
  formatBytes,
  hostOf,
  isActiveStatus,
  type FileRecord,
  type JobRecord,
} from "@/lib/types";
import { FilePreview } from "./FilePreview";

type Props = {
  job: JobRecord;
  onBack: () => void;
  onUpdated: (job: JobRecord) => void;
};

function statusLabel(status: string) {
  return status.replace("_", " ");
}

export function JobDetail({ job, onBack, onUpdated }: Props) {
  const [preview, setPreview] = useState<FileRecord | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openBatch, setOpenBatch] = useState<string | null>(
    job.batches.find((batch) =>
      ["sending", "pending", "waiting"].includes(batch.status)
    )?._id || job.batches[0]?._id || null
  );

  const progress = useMemo(() => {
    const sent = job.batches.filter((batch) => batch.status === "sent").length;
    return { sent, total: job.batches.length };
  }, [job.batches]);

  const canCancel =
    isActiveStatus(job.status) &&
    job.batches.some((batch) => ["pending", "sending"].includes(batch.status));

  async function onCancel() {
    setCancelling(true);
    setError(null);
    try {
      const next = await cancelJob(job._id);
      onUpdated(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_14px_40px_rgba(18,18,18,0.05)]">
      <div className="border-b border-line px-6 py-6 md:px-10">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium uppercase tracking-[0.14em] text-muted hover:text-ink"
        >
          ← History
        </button>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
          <p className="font-mono text-sm">{job.eventId}</p>
            <p className="mt-1 text-sm text-muted">{hostOf(job.atenxionUrl)}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">
              {job.batchSize} per batch · {job.waitTime}s wait · {job.files.length} files
            </p>
          </div>
          {canCancel ? (
            <button
              type="button"
              disabled={cancelling}
              onClick={onCancel}
              className="rounded-md border border-ink px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] hover:bg-ink hover:text-paper disabled:opacity-50"
            >
              {cancelling ? "Cancelling" : "Cancel remaining"}
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-sm">
          {progress.sent}/{progress.total} batches sent · {statusLabel(job.status)}
        </p>
        {job.jobDescription ? (
          <p className="mt-2 text-sm text-muted">{job.jobDescription}</p>
        ) : null}
        {error ? <p className="mt-2 text-sm">{error}</p> : null}
      </div>

      <div className="mono-scroll max-h-[calc(100vh-245px)] overflow-auto px-6 py-6 md:px-10">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
          Batches
        </p>
        <ul className="mt-3 space-y-2">
          {job.batches.map((batch) => {
            const open = openBatch === batch._id;
            return (
              <li key={batch._id} className="rounded-xl border border-line bg-paper/50">
                <button
                  type="button"
                  onClick={() =>
                    setOpenBatch((current) =>
                      current === batch._id ? null : batch._id
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                >
                  <span className="text-sm">
                    Batch {batch.index}
                    <span className="ml-2 font-mono text-xs text-muted">
                      {batch.eventId}
                    </span>
                  </span>
                  <span
                    className={`text-xs uppercase tracking-[0.14em] ${
                      batch.status === "sending" || batch.status === "pending"
                        ? "pulse-dot"
                        : ""
                    } ${batch.status === "cancelled" ? "line-through text-muted" : ""}`}
                  >
                    {batch.status}
                  </span>
                </button>
                {open ? (
                  <div className="border-t border-line px-3 py-3">
                    {batch.error ? (
                      <p className="mb-2 text-xs">{batch.error}</p>
                    ) : null}
                    {batch.responseStatus ? (
                      <p className="mb-2 text-xs text-muted">
                        Response {batch.responseStatus}
                        {typeof batch.responseBody === "string"
                          ? ` · ${batch.responseBody}`
                          : batch.responseBody
                            ? ` · ${JSON.stringify(batch.responseBody).slice(0, 180)}`
                            : ""}
                      </p>
                    ) : null}
                    <ul className="space-y-2">
                      {batch.files.map((file) => (
                        <FileRow
                          key={file._id}
                          file={file}
                          onPreview={() => setPreview(file)}
                        />
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-[11px] uppercase tracking-[0.22em] text-muted">
          All files
        </p>
        <ul className="mt-3 divide-y divide-line border border-line bg-white">
          {job.files.map((file) => (
            <li key={file._id} className="px-3 py-2">
              <FileRow file={file} onPreview={() => setPreview(file)} />
            </li>
          ))}
        </ul>
      </div>

      {preview ? (
        <FilePreview file={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}

function FileRow({
  file,
  onPreview,
}: {
  file: FileRecord;
  onPreview: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm">{file.originalName}</p>
        <p className="text-xs text-muted">{formatBytes(file.size)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="text-xs uppercase tracking-[0.14em] underline underline-offset-4"
        >
          Preview
        </button>
        <a
          href={downloadUrl(file._id)}
          className="text-xs uppercase tracking-[0.14em] underline underline-offset-4"
        >
          Download
        </a>
      </div>
    </div>
  );
}
