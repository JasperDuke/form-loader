"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useConfig } from "./ConfigProvider";
import { clearAuthToken } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  activeTab: "dispatch" | "history";
  onTabChange: (tab: "dispatch" | "history") => void;
};

export function Header({ activeTab, onTabChange }: Props) {
  const router = useRouter();
  const { setOpen, setPayloadOpen } = useConfig();

  function signOut() {
    clearAuthToken();
    router.replace("/login");
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-5 md:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/ram-logo.jpg"
            alt="RAM"
            width={120}
            height={40}
            className="h-9 w-auto shrink-0 object-contain"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight md:text-base">
              {BRAND_NAME}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setPayloadOpen(true)}
            className="rounded-md border border-line bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition hover:border-ink hover:bg-wash md:px-4 md:text-[11px]"
          >
            Add Extra
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-line bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition hover:border-ink hover:bg-wash md:px-4 md:text-[11px]"
          >
            Configuration
          </button>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md border border-line bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted transition hover:border-ink hover:text-ink md:px-4 md:text-[11px]"
          >
            Sign out
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
