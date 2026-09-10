"use client";

import { hostOf, isActiveStatus, type JobRecord } from "@/lib/types";

type Props = {
  jobs: JobRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function HistoryList({ jobs, selectedId, onSelect }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_40px_rgba(18,18,18,0.05)]">
      <div className="border-b border-line px-6 py-6 md:px-10">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
          History
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-4xl">Every convoy</h2>
            <p className="mt-2 text-sm text-muted">Shared workspace · no accounts</p>
          </div>
          <p className="text-xs text-muted">{jobs.length} dispatches</p>
        </div>
      </div>
      <div className="mono-scroll max-h-[calc(100vh-245px)] overflow-auto">
        {jobs.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted md:px-8">
            No dispatches yet. Upload files to form the first convoy.
          </p>
        ) : (
          <ul>
            {jobs.map((job) => {
              const sent = job.batches.filter((batch) => batch.status === "sent").length;
              const active = isActiveStatus(job.status);
              return (
                <li key={job._id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onSelect(job._id)}
                    className={`w-full px-6 py-5 text-left transition md:px-8 ${
                      selectedId === job._id ? "bg-paper" : "hover:bg-paper/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-sm">{job.eventId}</p>
                      <span
                        className={`text-[11px] uppercase tracking-[0.14em] ${
                          active ? "pulse-dot" : ""
                        } ${job.status === "cancelled" ? "line-through text-muted" : ""}`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{hostOf(job.atenxionUrl)}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">
                      {job.batchSize} / batch · {job.waitTime}s wait · {sent}/
                      {job.batches.length} sent
                    </p>
                    <div className="mt-3 h-px bg-line">
                      <div
                        className="h-px bg-ink"
                        style={{
                          width: job.batches.length
                            ? `${(sent / job.batches.length) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
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
