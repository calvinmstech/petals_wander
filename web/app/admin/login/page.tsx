"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setAuth, clearAuth, type AuthState } from "@/lib/auth";
import Button from "@/components/Button";

function AdminLoginInner() {
  const router = useRouter();
  const redirect = useSearchParams().get("redirect") ?? "/admin";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const auth = await api.post<AuthState>("/auth/login", form);
      if (!auth.roles.includes("admin")) {
        clearAuth();
        throw new ApiError("That account doesn't have admin access.", 403);
      }
      setAuth(auth);
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-haze px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-brand-100 bg-white p-8 shadow-sm">
        <div className="text-center font-serif text-xl font-semibold text-brand-900">
          Petals Wander
        </div>
        <div className="mt-1 text-center text-xs text-brand-400">Admin dashboard</div>

        {error && (
          <p className="mt-5 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-500">Email</label>
            <input
              required
              type="email"
              placeholder="admin@petalwanders.test"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-brand-500">Password</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 rounded-lg bg-brand-50 px-3 py-2 text-center text-xs text-brand-400">
          Demo: admin@petalwanders.test / password
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}
