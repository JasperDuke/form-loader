"use client";

import { useEffect, useState } from "react";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import { downloadUrl } from "@/lib/api";
import { fileExtension, formatBytes, type FileRecord } from "@/lib/types";

type Props = {
  file: FileRecord;
  onClose: () => void;
};

export function FilePreview({ file, onClose }: Props) {
  const ext = fileExtension(file.originalName);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(ext === ".docx" || ext === ".xlsx");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (ext !== ".docx" && ext !== ".xlsx") return;
      try {
        const response = await fetch(file.publicUrl);
        if (!response.ok) throw new Error("Could not load file.");
        const buffer = await response.arrayBuffer();
        if (ext === ".docx") {
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          if (!cancelled) setHtml(result.value || "<p>Empty document.</p>");
        } else {
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const table = XLSX.utils.sheet_to_html(sheet);
          if (!cancelled) setHtml(table);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Preview failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ext, file.publicUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col rounded-lg border border-line bg-paper">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.originalName}</p>
            <p className="text-xs text-muted">{formatBytes(file.size)}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={downloadUrl(file._id)}
              className="rounded-md border border-line px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] hover:border-ink hover:bg-wash"
            >
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted hover:bg-wash hover:text-ink"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#e9e8e4]">
          {ext === ".pdf" ? (
            <iframe
              title={file.originalName}
              src={file.publicUrl}
              className="h-full min-h-[70vh] w-full"
            />
          ) : loading ? (
            <p className="p-8 text-sm text-muted">Preparing preview…</p>
          ) : error ? (
            <p className="p-8 text-sm">{error}</p>
          ) : (
            <div className="document-sheet">
              <div
                className="prose-preview"
                dangerouslySetInnerHTML={{ __html: html || "" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
