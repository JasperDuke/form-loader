"use client";

import {
  formatWhen,
  hostOf,
  isActiveStatus,
  itemCounts,
  jobServers,
  statusLabel,
  submissionCounts,
  type JobRecord,
} from "@/lib/types";

type Props = {
  jobs: JobRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function HistoryList({ jobs, selectedId, onSelect }: Props) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line px-6 py-6 md:px-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
          History
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-medium">Submissions</h2>
            <p className="mt-1 text-sm text-muted">
              One upload is one submission. Open it to see each destination.
            </p>
          </div>
          <p className="text-xs text-muted">{jobs.length}</p>
        </div>
      </div>
      <div className="mono-scroll max-h-[calc(100vh-245px)] overflow-auto">
        {jobs.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted">
            No submissions yet.
          </p>
        ) : (
          <ul>
            {jobs.map((job) => {
              const totals = submissionCounts(job);
              const servers = jobServers(job);
              const active = isActiveStatus(job.status);
              const progress =
                ((totals.done + totals.failed) / Math.max(totals.total, 1)) * 100;
              return (
                <li key={job._id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onSelect(job._id)}
                    className={`w-full px-6 py-5 text-left transition ${
                      selectedId === job._id ? "bg-paper" : "hover:bg-paper/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm">{job.eventId}</p>
                        <p className="mt-1 text-sm text-muted">
                          {totals.files === 1 ? "1 file" : `${totals.files} files`} ·{" "}
                          {servers.length === 1
                            ? "1 destination"
                            : `${servers.length} destinations`}
                          {job.createdAt ? ` · ${formatWhen(job.createdAt)}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] uppercase tracking-[0.14em] ${
                          active ? "pulse-dot" : ""
                        } ${job.status === "cancelled" ? "line-through text-muted" : ""}`}
                      >
                        {statusLabel(job.status)}
                      </span>
                    </div>

                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full bg-ink transition-[width]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {totals.done}/{totals.total} done
                      {totals.running ? ` · ${totals.running} running` : ""}
                      {totals.waiting ? ` · ${totals.waiting} waiting` : ""}
                      {totals.failed ? ` · ${totals.failed} failed` : ""}
                    </p>

                    {servers.length > 1 ? (
                      <div className="mt-3 grid gap-2">
                        {servers.map((server, index) => {
                          const counts = itemCounts(server.items);
                          return (
                            <div
                              key={server._id}
                              className="flex items-center justify-between gap-3 rounded-md bg-paper px-3 py-2 text-xs"
                            >
                              <span className="min-w-0 truncate">
                                {index + 1}. {hostOf(server.atenxionUrl)}
                              </span>
                              <span className="shrink-0 tabular-nums text-muted">
                                {counts.done}/{counts.total} done
                                {counts.running ? ` · ${counts.running} running` : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
