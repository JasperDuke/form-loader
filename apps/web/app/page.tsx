"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(
  () => import("@/components/AppShell").then((mod) => mod.AppShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    ),
  }
);

export default function Page() {
  return <AppShell />;
}
