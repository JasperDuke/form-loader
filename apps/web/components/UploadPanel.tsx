"use client";

import { useMemo, useRef, useState } from "react";
import { uploadFiles, startAnalyze } from "@/lib/api";
import { configReady } from "@/lib/config";
import {
  ACCEPT_ATTR,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  MAX_FILES,
  formatBytes,
  isAllowedFile,
  type FileRecord,
} from "@/lib/types";
import { BRAND_NAME } from "@/lib/brand";
import { useConfig } from "./ConfigProvider";

type Staged = {
  localId: string;
  file: File;
  status: "ready" | "uploading" | "uploaded" | "error";
  error?: string;
  remote?: FileRecord;
};

type Props = {
  onDispatched: (jobId: string) => void;
};

export function UploadPanel({ onDispatched }: Props) {
  const { config, loading: configLoading, setOpen } = useConfig();
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceMode = useRef(false);
  const [items, setItems] = useState<Staged[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [needConfig, setNeedConfig] = useState(false);

  const totals = useMemo(() => {
    const bytes = items.reduce((sum, item) => sum + item.file.size, 0);
    return { count: items.length, bytes };
  }, [items]);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    setBanner(null);
    setNeedConfig(false);
    setItems((current) => {
      const next = replaceMode.current ? [] : [...current];
      replaceMode.current = false;
      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          setBanner("Maximum 500 files.");
          break;
        }
        if (!isAllowedFile(file)) {
          next.push({
            localId: crypto.randomUUID(),
            file,
            status: "error",
            error: "Only PDF, DOCX, and XLSX files are supported.",
          });
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          next.push({
            localId: crypto.randomUUID(),
            file,
            status: "error",
            error: "File exceeds the 50 MB limit.",
          });
          continue;
        }
        next.push({
          localId: crypto.randomUUID(),
          file,
          status: "ready",
        });
      }
      const totalBytes = next
        .filter((item) => item.status !== "error")
        .reduce((sum, item) => sum + item.file.size, 0);
      if (totalBytes > MAX_TOTAL_BYTES) {
        setBanner("The total upload exceeds the 1 GB limit.");
      }
      return next;
    });
  }

  async function onUpload() {
    setBanner(null);
    if (configLoading) {
      setBanner("Loading configuration…");
      return;
    }
    if (!configReady(config)) {
      setNeedConfig(true);
      return;
    }
    const valid = items.filter((item) => item.status !== "error");
    if (!valid.length) {
      setBanner("Add at least one valid file.");
      return;
    }
    const totalBytes = valid.reduce((sum, item) => sum + item.file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      setBanner("The total upload exceeds the 1 GB limit.");
      return;
    }

    try {
      const uploaded: FileRecord[] = [];
      for (let i = 0; i < valid.length; i += 1) {
        const item = valid[i];
        setBusy(`Uploading ${i + 1} / ${valid.length}`);
        setItems((current) =>
          current.map((row) =>
            row.localId === item.localId
              ? { ...row, status: "uploading", error: undefined }
              : row
          )
        );
        try {
          const [remote] = item.remote
            ? [item.remote]
            : await uploadFiles([item.file]);
          uploaded.push(remote);
          setItems((current) =>
            current.map((row) =>
              row.localId === item.localId
                ? { ...row, status: "uploaded", remote }
                : row
            )
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Upload failed.";
          setItems((current) =>
            current.map((row) =>
              row.localId === item.localId
                ? { ...row, status: "error", error: message }
                : row
            )
          );
          setBusy(null);
          setBanner(message);
          return;
        }
      }

      setBusy("Starting queue…");
      const job = await startAnalyze({
        fileIds: uploaded.map((file) => file._id),
        jobDescription: "",
      });
      setItems([]);
      setBusy(null);
      onDispatched(job._id);
    } catch (error) {
      setBusy(null);
      setBanner(error instanceof Error ? error.message : "Dispatch failed.");
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_14px_40px_rgba(18,18,18,0.05)]">
      <div className="flex items-end justify-between border-b border-line px-6 py-6 md:px-10">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
            {BRAND_NAME}
          </p>
          <h2 className="mt-2 font-serif text-4xl">Upload files</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Drop your documents here. Each file is sent to every destination with
            the same payload and the same Doc_ID. Max concurrent is per server.
          </p>
        </div>
        <div className="hidden text-right text-xs text-muted sm:block">
          <p>01 / 02</p>
          <p className="mt-1">Prepare files</p>
        </div>
      </div>

      <div className="mono-scroll overflow-auto px-6 py-7 md:px-10">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
          }}
          className={`flex min-h-[270px] flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition ${
            dragging ? "border-ink bg-paper" : "border-line bg-paper/50"
          }`}
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white">
            <span className="text-xl text-muted">↑</span>
          </div>
          <p className="font-serif text-3xl">Upload your files</p>
          <p className="mt-2 text-sm text-muted">Drag & drop files here</p>
          <p className="my-1 text-xs text-muted">or</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-3 rounded-md border border-ink px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition hover:bg-ink hover:text-paper"
          >
            Browse files
          </button>
          <p className="mt-4 text-xs text-muted">
            PDF, DOCX, XLSX · 50 MB each · 1 GB total · 500 files max
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">
            {totals.count
              ? `${totals.count} file${totals.count === 1 ? "" : "s"} · ${formatBytes(totals.bytes)}`
              : "No files selected"}
          </p>
          <button
            type="button"
            onClick={() => {
              replaceMode.current = true;
              inputRef.current?.click();
            }}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted transition hover:border-ink hover:text-ink"
          >
            Replace
          </button>
        </div>

        {items.length ? (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-paper/50">
            {items.map((item) => (
              <li
                key={item.localId}
                className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate">{item.file.name}</p>
                  <p className="text-xs text-muted">
                    {formatBytes(item.file.size)}
                    {item.status === "uploading" ? " · uploading" : ""}
                    {item.status === "uploaded" ? " · stored" : ""}
                    {item.error ? ` · ${item.error}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((row) => row.localId !== item.localId)
                    )
                  }
                  className="text-xs uppercase tracking-[0.14em] text-muted hover:text-ink"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {needConfig ? (
          <div className="mt-4 rounded-lg border border-ink bg-paper px-4 py-3 text-sm">
            <p>Please configure at least one Atenxion destination first.</p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 text-xs uppercase tracking-[0.16em] underline underline-offset-4"
            >
              Open Configuration
            </button>
          </div>
        ) : null}

        {banner ? (
          <p className="mt-4 rounded-lg border border-ink bg-paper px-4 py-3 text-sm">
            {banner}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line bg-paper px-6 py-5 md:px-10">
        <p className="hidden text-xs text-muted sm:block">
          {config.servers.length} destination{config.servers.length === 1 ? "" : "s"} ·{" "}
          {config.maxConcurrent} max concurrent each
          {config.includeDocId ? " · Doc_ID on" : ""}
        </p>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={onUpload}
          className="ml-auto rounded-md border border-ink bg-ink px-7 py-3 text-xs font-medium uppercase tracking-[0.16em] text-paper transition disabled:opacity-50 hover:bg-transparent hover:text-ink"
        >
          {busy || "Upload"}
        </button>
      </div>
    </section>
  );
}
