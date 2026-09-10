"use client";

import { useEffect, useState } from "react";
import { useConfig } from "./ConfigProvider";
import { validateConfig } from "@/lib/config";
import type { AppConfig } from "@/lib/types";

export function ConfigModal() {
  const { config, open, setOpen, persist } = useConfig();
  const [draft, setDraft] = useState<AppConfig>(config);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(config);
      setShowToken(false);
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

  function onSave() {
    const message = validateConfig(draft);
    if (message) {
      setError(message);
      return;
    }
    persist(draft);
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
        className="relative w-full max-w-lg rounded-lg border border-line bg-paper p-6"
      >
        <h2 id="config-title" className="font-serif text-3xl">
          Configuration
        </h2>
        <p className="mt-1 text-sm text-muted">
          These values are stored in this browser and used for every dispatch.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              Atenxion Backend URL
            </span>
            <input
              value={draft.atenxionUrl}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, atenxionUrl: event.target.value }))
              }
              placeholder="https://backend.atenxion.ai"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              Atenxion Token
            </span>
            <div className="mt-1 flex rounded-md border border-line bg-white focus-within:border-ink">
              <input
                type={showToken ? "text" : "password"}
                value={draft.atenxionToken}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    atenxionToken: event.target.value,
                  }))
                }
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                autoComplete="off"
                className="w-full bg-transparent px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken((value) => !value)}
                className="shrink-0 px-3 text-xs uppercase tracking-[0.14em] text-muted hover:text-ink"
              >
                {showToken ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-muted">
                Batch size
              </span>
              <input
                type="number"
                min={1}
                max={500}
                value={draft.batchSize}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    batchSize: Number(event.target.value),
                  }))
                }
                placeholder="50"
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-muted">
                Wait time (seconds)
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={draft.waitTime}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    waitTime: Number(event.target.value),
                  }))
                }
                placeholder="10"
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </label>
          </div>
        </div>

        {error ? (
          <p className="mt-4 border border-ink bg-white px-3 py-2 text-sm">{error}</p>
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
            onClick={onSave}
            className="rounded-md border border-ink bg-ink px-4 py-2 text-sm uppercase tracking-[0.16em] text-paper hover:bg-transparent hover:text-ink"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
