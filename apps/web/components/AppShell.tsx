"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJobs } from "@/lib/api";
import { isActiveStatus, type JobRecord } from "@/lib/types";
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
    const timer = window.setInterval(refresh, 1200);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const selected = jobs.find((job) => job._id === selectedId) || null;
  const watching = jobs.some((job) => isActiveStatus(job.status));

  useEffect(() => {
    if (!watching) return;
    const faster = window.setInterval(refresh, 700);
    return () => window.clearInterval(faster);
  }, [watching, refresh]);

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
    </div>
  );
}
