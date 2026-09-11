"use client";

import { useConfig } from "./ConfigProvider";

type Props = {
  activeTab: "dispatch" | "history";
  onTabChange: (tab: "dispatch" | "history") => void;
};

export function Header({ activeTab, onTabChange }: Props) {
  const { setOpen, setPayloadOpen } = useConfig();

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper">
            <span className="text-xs font-medium">Q</span>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted">
              Atenxion
            </p>
            <h1 className="font-serif text-3xl leading-none">QueueDrop</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPayloadOpen(true)}
            className="rounded-md border border-line bg-white px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] transition hover:border-ink hover:bg-wash"
          >
            Add Extra
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-line bg-white px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] transition hover:border-ink hover:bg-wash"
          >
            Configuration
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1440px] gap-7 px-5 md:px-10" aria-label="Main navigation">
        {(["dispatch", "history"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`border-b-2 px-0 py-3 text-xs font-medium uppercase tracking-[0.16em] transition ${
              activeTab === tab
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab === "dispatch" ? "Upload" : "History"}
          </button>
        ))}
      </nav>
    </header>
  );
}
