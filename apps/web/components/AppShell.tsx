"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJobs } from "@/lib/api";
import { isActiveStatus, wsUrl, type JobRecord } from "@/lib/types";
import { AdditionalPayloadModal } from "./AdditionalPayloadModal";
import { ConfigModal } from "./ConfigModal";
import { Header } from "./Header";
import { HistoryList } from "./HistoryList";
import { JobDetail } from "./JobDetail";
import { UploadPanel } from "./UploadPanel";

export function AppShell() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dispatch" | "history">("dispatch");
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchJobs();
      setJobs(next);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load history."
      );
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let closed = false;
    let socket: WebSocket | null = null;
    let retry: number | undefined;

    function connect() {
      try {
        socket = new WebSocket(wsUrl());
      } catch {
        retry = window.setTimeout(connect, 2500);
        return;
      }
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type?: string;
            job?: JobRecord;
            id?: string;
          };
          if (message.type === "job" && message.job) {
            setJobs((current) => {
              const index = current.findIndex((job) => job._id === message.job?._id);
              if (index < 0) return [message.job!, ...current];
              const next = [...current];
              next[index] = message.job!;
              return next;
            });
          }
          if (message.type === "job-deleted" && message.id) {
            setJobs((current) => current.filter((job) => job._id !== message.id));
            setSelectedId((current) => (current === message.id ? null : current));
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onclose = () => {
        if (closed) return;
        retry = window.setTimeout(connect, 2500);
      };
    }

    connect();
    const fallback = window.setInterval(refresh, 20000);
    return () => {
      closed = true;
      window.clearInterval(fallback);
      if (retry) window.clearTimeout(retry);
      socket?.close();
    };
  }, [refresh]);

  const selected = jobs.find((job) => job._id === selectedId) || null;
  const liveCount = jobs.filter((job) => isActiveStatus(job.status)).length;

  return (
    <div className="min-h-screen bg-paper">
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedId(null);
        }}
      />
      {loadError ? (
        <div className="mx-auto max-w-[1440px] px-5 pt-4 text-sm md:px-10">{loadError}</div>
      ) : null}
      <main className="mx-auto max-w-[1440px] px-5 py-6 md:px-10 md:py-10">
        {activeTab === "dispatch" ? (
          <div className="mx-auto max-w-3xl">
            <UploadPanel
              onDispatched={(id) => {
                setSelectedId(id);
                setActiveTab("history");
                refresh();
              }}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-5xl">
            {liveCount ? (
              <p className="mb-4 text-xs uppercase tracking-[0.16em] text-muted">
                Live updates · {liveCount} running
              </p>
            ) : null}
            {selected ? (
              <JobDetail
                job={selected}
                onBack={() => setSelectedId(null)}
                onDeleted={() => {
                  setSelectedId(null);
                  refresh();
                }}
                onUpdated={(job) => {
                  setJobs((current) =>
                    current.map((item) => (item._id === job._id ? job : item))
                  );
                }}
              />
            ) : (
              <HistoryList
                jobs={jobs}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>
        )}
      </main>
      <ConfigModal />
      <AdditionalPayloadModal />
    </div>
  );
}
