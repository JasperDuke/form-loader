"use client";

import { useEffect, useState } from "react";
import { EMPTY_PAYLOAD_PAIR } from "@/lib/config";
import type { PayloadPair } from "@/lib/types";
import { useConfig } from "./ConfigProvider";

export function AdditionalPayloadModal() {
  const { config, payloadOpen, setPayloadOpen, persistPayload } = useConfig();
  const [rows, setRows] = useState<PayloadPair[]>([{ ...EMPTY_PAYLOAD_PAIR }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payloadOpen) {
      setRows(
        config.additionalPayload.length
          ? config.additionalPayload.map((row) => ({ ...row }))
          : [{ ...EMPTY_PAYLOAD_PAIR }]
      );
      setError(null);
    }
  }, [payloadOpen, config.additionalPayload]);

  useEffect(() => {
    if (!payloadOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPayloadOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [payloadOpen, setPayloadOpen]);

  if (!payloadOpen) return null;

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await persistPayload(rows);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save additional payload."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/20"
        aria-label="Close additional payload"
        onClick={() => setPayloadOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payload-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-line bg-paper p-6"
      >
        <h2 id="payload-title" className="text-2xl font-medium">
          Additional Payload
        </h2>
        <p className="mt-1 text-sm text-muted">
          Extra JSON fields merged into every trigger call, on every destination
          and every file. Keys and values are sent exactly as entered.
        </p>

        <div className="mt-6 space-y-3">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-md border border-line bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-muted">
                  Key
                </span>
                <input
                  value={row.key}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, key: event.target.value } : item
                      )
                    )
                  }
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-muted">
                  Value
                </span>
                <input
                  value={row.value}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, value: event.target.value } : item
                      )
                    )
                  }
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    setRows((current) => current.filter((_, i) => i !== index))
                  }
                  disabled={rows.length === 1}
                  className="px-2 py-2 text-xs uppercase tracking-[0.14em] text-muted hover:text-ink disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setRows((current) => [...current, { ...EMPTY_PAYLOAD_PAIR }])
            }
            className="w-full rounded-md border border-dashed border-line py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-muted hover:border-ink hover:text-ink"
          >
            Add field
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-ink bg-white px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setPayloadOpen(false)}
            className="px-4 py-2 text-sm uppercase tracking-[0.16em] text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-md border border-ink bg-ink px-4 py-2 text-sm uppercase tracking-[0.16em] text-paper hover:bg-transparent hover:text-ink disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
