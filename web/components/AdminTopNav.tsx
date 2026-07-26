"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearAuth, getAuth, type AuthState } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings/payment", label: "Settings" },
];

export default function AdminTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => setAuth(getAuth()), []);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    clearAuth();
    router.push("/login");
  }

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <header className="bg-brand-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
        <Link href="/admin" className="font-serif text-lg font-semibold">
          Petals Wander
        </Link>
        <nav className="flex flex-wrap gap-1.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                isActive(item.href)
                  ? "bg-white/15 font-semibold text-white"
                  : "font-medium text-brand-200 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/" className="hidden text-xs text-brand-200 hover:text-white sm:inline">
            View storefront ↗
          </Link>
          <span className="hidden text-xs text-brand-200 md:inline">{auth?.user.email}</span>
          <button
            onClick={logout}
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
