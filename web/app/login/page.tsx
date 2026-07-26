"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setAuth, type AuthState } from "@/lib/auth";
import Button from "@/components/Button";

function LoginInner() {
  const router = useRouter();
  const redirect = useSearchParams().get("redirect");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login" ? { email: form.email, password: form.password } : form;
      const auth = await api.post<AuthState>(path, payload);
      setAuth(auth);

      if (redirect) {
        router.push(redirect);
      } else {
        router.push(auth.roles.includes("admin") ? "/admin" : "/");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-haze px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-brand-100 bg-white p-8 shadow-sm">
        <Link href="/" className="block text-center">
          <div className="font-serif text-xl font-semibold text-brand-900">Petals Wander</div>
          <div className="mt-1 text-xs text-brand-400">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </div>
        </Link>

        {error && (
          <p className="mt-5 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "register" && (
            <input
              required
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          )}
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-brand-500 hover:underline"
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>

        <p className="mt-6 rounded-lg bg-brand-50 px-3 py-2 text-center text-xs text-brand-400">
          Demo admin: admin@petalwanders.test / password
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
