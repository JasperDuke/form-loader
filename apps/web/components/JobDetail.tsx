"use client";

import { useEffect, useMemo, useState } from "react";
import { cancelJob, deleteJob, downloadUrl } from "@/lib/api";
import {
  formatBytes,
  formatWhen,
  hostOf,
  isActiveStatus,
  itemCounts,
  itemStatusLabel,
  jobServers,
  statusLabel,
  submissionCounts,
  type DispatchItem,
  type FileRecord,
  type JobRecord,
} from "@/lib/types";
import { FilePreview } from "./FilePreview";

type Props = {
  job: JobRecord;
  onBack: () => void;
  onUpdated: (job: JobRecord) => void;
  onDeleted: () => void;
};

export function JobDetail({ job, onBack, onUpdated, onDeleted }: Props) {
  const servers = jobServers(job);
  const [tab, setTab] = useState(servers[0]?._id || "");
  const [preview, setPreview] = useState<FileRecord | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!servers.some((server) => server._id === tab) && servers[0]?._id) {
      setTab(servers[0]._id);
    }
  }, [servers, tab]);

  const selected = servers.find((server) => server._id === tab) || servers[0];
  const totals = submissionCounts(job);
  const selectedCounts = itemCounts(selected?.items || []);
  const canCancel = isActiveStatus(job.status);
  const jobComplete = !canCancel;
  const overallProgress = jobComplete
    ? ((totals.done + totals.failed) / Math.max(totals.total, 1)) * 100
    : ((totals.total - totals.waiting) / Math.max(totals.total, 1)) * 100;

  async function onCancel() {
    setCancelling(true);
    setError(null);
    try {
      onUpdated(await cancelJob(job._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setCancelling(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete this submission from history?")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteJob(job._id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  const created = useMemo(() => formatWhen(job.createdAt), [job.createdAt]);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line px-6 py-6 md:px-8">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium uppercase tracking-[0.14em] text-muted hover:text-ink"
        >
          ← Submissions
        </button>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm">{job.eventId}</p>
            <p className="mt-1 text-sm text-muted">
              {totals.files === 1 ? "1 file" : `${totals.files} files`} ·{" "}
              {servers.length === 1
                ? "1 destination"
                : `${servers.length} destinations`}
              {created ? ` · ${created}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCancel ? (
              <button
                type="button"
                disabled={cancelling || deleting}
                onClick={onCancel}
                className="rounded-md border border-ink px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] hover:bg-ink hover:text-paper disabled:opacity-50"
              >
                {cancelling ? "Cancelling" : "Cancel remaining"}
              </button>
            ) : (
              <button
                type="button"
                disabled={deleting}
                onClick={onDelete}
                className="rounded-md border border-line px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-muted hover:border-ink hover:text-ink disabled:opacity-50"
              >
                {deleting ? "Deleting" : "Delete history"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-ink" style={{ width: `${overallProgress}%` }} />
        </div>
        <p className="mt-2 text-sm">
          {statusLabel(job.status)}
          {jobComplete ? (
            <>
              {" "}
              · {totals.done}/{totals.total} done
              {totals.failed ? ` · ${totals.failed} failed` : ""}
            </>
          ) : (
            <>
              {" "}
              · {totals.processing} processing
              {totals.waiting ? ` · ${totals.waiting} waiting` : ""}
              {totals.sending ? ` · ${totals.sending} sending` : ""}
              {totals.failed ? ` · ${totals.failed} failed` : ""}
            </>
          )}
        </p>
        {job.filesDeleted ? (
          <p className="mt-1 text-xs text-muted">
            Uploaded files were removed after every destination finished. History is kept.
          </p>
        ) : null}
        {error ? <p className="mt-2 text-sm">{error}</p> : null}
      </div>

      <div
        role="tablist"
        aria-label="Destinations"
        className="flex gap-0 overflow-auto border-b border-line px-6 md:px-8"
      >
        {servers.map((server, index) => {
          const counts = itemCounts(server.items);
          const active = selected?._id === server._id;
          return (
            <button
              key={server._id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(server._id)}
              className={`min-w-[180px] flex-1 border-b-2 px-3 py-3 text-left ${
                active ? "border-ink" : "border-transparent text-muted"
              }`}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.16em]">
                Destination {index + 1}
              </p>
              <p className="mt-1 truncate text-sm">{hostOf(server.atenxionUrl)}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em]">
                {jobComplete
                  ? `${counts.done}/${counts.total} done`
                  : `${counts.processing} processing · ${counts.waiting} waiting`}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mono-scroll max-h-[calc(100vh-320px)] overflow-auto px-6 py-6 md:px-8">
        {selected ? (
          <>
            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>{hostOf(selected.atenxionUrl)}</span>
              <span>{statusLabel(selected.status)}</span>
              {jobComplete ? (
                <>
                  <span>{selectedCounts.done} done</span>
                  {selectedCounts.failed ? (
                    <span>{selectedCounts.failed} failed</span>
                  ) : null}
                </>
              ) : (
                <>
                  <span>{selectedCounts.processing} processing</span>
                  <span>{selectedCounts.waiting} waiting</span>
                  {selectedCounts.failed ? (
                    <span>{selectedCounts.failed} failed</span>
                  ) : null}
                </>
              )}
            </div>
            <ul className="divide-y divide-line rounded-md border border-line">
              {selected.items.map((item) => (
                <ItemRow
                  key={item._id}
                  item={item}
                  jobComplete={jobComplete}
                  filesRemoved={Boolean(job.filesDeleted)}
                  onPreview={(file) => setPreview(file)}
                />
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {preview ? (
        <FilePreview file={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}

function ItemRow({
  item,
  jobComplete,
  filesRemoved,
  onPreview,
}: {
  item: DispatchItem;
  jobComplete: boolean;
  filesRemoved: boolean;
  onPreview: (file: FileRecord) => void;
}) {
  const file = item.file || item.files?.[0];
  const live =
    item.status === "sending" ||
    item.status === "pending" ||
    item.status === "running" ||
    item.status === "polling";
  const gone = filesRemoved || Boolean(file?.removedAt);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm">
            {file?.originalName || `File ${item.index}`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {file ? formatBytes(file.size) : ""}
            {item.docId ? ` · ${item.docId}` : ""}
          </p>
          {item.error ? <p className="mt-1 text-xs">{item.error}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`text-[11px] uppercase tracking-[0.14em] ${
              live ? "pulse-dot" : ""
            } ${item.status === "cancelled" ? "line-through text-muted" : ""}`}
          >
            {itemStatusLabel(item.status, jobComplete)}
          </span>
          {file && !gone ? (
            <>
              <button
                type="button"
                onClick={() => onPreview(file)}
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
            </>
          ) : gone ? (
            <span className="text-xs text-muted">Removed</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
