"use client";

import { useEffect, useState } from "react";
import { useConfig } from "./ConfigProvider";
import { EMPTY_DESTINATION, validateConfig } from "@/lib/config";
import type { AppConfig } from "@/lib/types";

export function ConfigModal() {
  const { config, open, setOpen, persist } = useConfig();
  const [draft, setDraft] = useState<AppConfig>(config);
  const [visibleTokens, setVisibleTokens] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft({
        ...config,
        servers: config.servers.length ? config.servers : [{ ...EMPTY_DESTINATION }],
      });
      setVisibleTokens({});
      setError(null);
    }
  }, [open, config]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  async function onSave() {
    const message = validateConfig(draft);
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await persist(draft);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save configuration."
      );
    } finally {
      setSaving(false);
    }
  }

  function updateServer(index: number, patch: Partial<(typeof draft.servers)[number]>) {
    setDraft((prev) => ({
      ...prev,
      servers: prev.servers.map((server, i) =>
        i === index ? { ...server, ...patch } : server
      ),
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/20"
        aria-label="Close configuration"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-line bg-paper p-6"
      >
        <h2 id="config-title" className="text-2xl font-medium">
          Configuration
        </h2>
        <p className="mt-1 text-sm text-muted">
          Destinations are stored on the server. Max concurrent is per destination.
          Doc_ID is one value per file, shared across every destination.
        </p>

        <div className="mt-6 space-y-4">
          {draft.servers.map((server, index) => (
            <div key={index} className="rounded-md border border-line bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                  Destination {index + 1}
                </p>
                {draft.servers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        servers: prev.servers.filter((_, i) => i !== index),
                      }))
                    }
                    className="text-xs uppercase tracking-[0.14em] text-muted hover:text-ink"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-muted">
                  Atenxion Backend URL
                </span>
                <input
                  value={server.atenxionUrl}
                  onChange={(event) =>
                    updateServer(index, { atenxionUrl: event.target.value })
                  }
                  placeholder="https://backend.atenxion.ai"
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs uppercase tracking-[0.16em] text-muted">
                  Temporal URL
                </span>
                <input
                  value={server.temporalUrl}
                  onChange={(event) =>
                    updateServer(index, { temporalUrl: event.target.value })
                  }
                  placeholder="https://temporal-qa.atenxion.ai"
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs uppercase tracking-[0.16em] text-muted">
                  Atenxion Token
                </span>
                <div className="mt-1 flex rounded-md border border-line focus-within:border-ink">
                  <input
                    type={visibleTokens[index] ? "text" : "password"}
                    value={server.atenxionToken}
                    onChange={(event) =>
                      updateServer(index, { atenxionToken: event.target.value })
                    }
                    placeholder="eyJhbGciOiJIUzI1NiIs..."
                    autoComplete="off"
                    className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleTokens((prev) => ({
                        ...prev,
                        [index]: !prev[index],
                      }))
                    }
                    className="shrink-0 px-3 text-xs uppercase tracking-[0.14em] text-muted hover:text-ink"
                  >
                    {visibleTokens[index] ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                servers: [...prev.servers, { ...EMPTY_DESTINATION }],
              }))
            }
            className="w-full rounded-md border border-dashed border-line py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-muted hover:border-ink hover:text-ink"
          >
            Add destination
          </button>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              Max concurrent APIs
            </span>
            <input
              type="number"
              min={1}
              max={500}
              value={draft.maxConcurrent}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  maxConcurrent: Number(event.target.value),
                }))
              }
              placeholder="4"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <span className="mt-1 block text-xs text-muted">
              Per destination. 3 means 3 in-flight on each server, not 3 total.
            </span>
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              Temporal poll wait (seconds)
            </span>
            <input
              type="number"
              min={1}
              max={3600}
              value={draft.pollWaitSeconds}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  pollWaitSeconds: Number(event.target.value),
                }))
              }
              placeholder="5"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <span className="mt-1 block text-xs text-muted">
              Pause between Temporal status checks per destination. Default 5; use
              120 or higher to reduce API calls.
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-3">
            <input
              type="checkbox"
              checked={draft.includeDocId}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  includeDocId: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-ink"
            />
            <span className="text-sm">
              Include Doc_ID
              <span className="mt-0.5 block text-xs text-muted">
                Adds a unique Doc_ID per file. The same file uses that same Doc_ID on every destination.
              </span>
            </span>
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-ink bg-white px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm uppercase tracking-[0.16em] text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-md border border-ink bg-ink px-4 py-2 text-sm uppercase tracking-[0.16em] text-paper hover:bg-transparent hover:text-ink"
          >
            {saving ? "Saving…" : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
