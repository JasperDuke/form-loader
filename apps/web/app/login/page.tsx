"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthToken, login } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("system@atenxion.ai");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getAuthToken()) router.replace("/");
  }, [router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/ram-logo.jpg"
            alt="RAM"
            width={200}
            height={64}
            className="h-14 w-auto object-contain"
            priority
          />
          <h1 className="mt-4 text-xl font-medium">{BRAND_NAME}</h1>
          <p className="mt-1 text-sm text-muted">Sign in to continue</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              Email
            </span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </label>
          {error ? (
            <p className="rounded-md border border-ink px-3 py-2 text-sm">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md border border-ink bg-ink py-2.5 text-sm uppercase tracking-[0.16em] text-paper hover:bg-transparent hover:text-ink disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
