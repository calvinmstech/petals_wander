"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cart, CART_EVENT } from "@/lib/cart";
import { getAuth, clearAuth, isAdmin, type AuthState } from "@/lib/auth";
import { api } from "@/lib/api";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Occasions", href: "/shop?category=occasions" },
  { label: "Plants", href: "/shop?category=plants" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [auth, setAuthState] = useState<AuthState | null>(null);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    let prev = cart.count();
    setCount(prev);
    const sync = () => {
      const next = cart.count();
      // only animate when the cart grows (an item was added)
      if (next > prev) {
        setBump(true);
        window.setTimeout(() => setBump(false), 450);
      }
      prev = next;
      setCount(next);
    };
    window.addEventListener(CART_EVENT, sync);
    setAuthState(getAuth());
    return () => window.removeEventListener(CART_EVENT, sync);
  }, []);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* token may already be gone; ignore */
    }
    clearAuth();
    setAuthState(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-brand-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        {/* Wordmark */}
        <Link href="/" className="leading-none">
          <div className="font-serif text-xl font-medium uppercase tracking-[0.25em] text-brand-700">
            Petals Wander
          </div>
          <div className="mt-1 text-center text-[8px] font-bold uppercase tracking-[0.35em] text-brand-400">
            Floral Studio
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-2 hidden items-center gap-5 md:flex">
          {NAV.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-brand-600 hover:text-brand-800"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-3.5 text-sm font-medium text-brand-600">
          <Link href="/shop" className="hidden hover:text-brand-800 sm:inline">
            Search
          </Link>
          <Link href={auth ? "/account" : "/login"} className="hidden hover:text-brand-800 sm:inline">
            Account
          </Link>
          {isAdmin(auth) && (
            <Link href="/admin" className="hidden hover:text-brand-800 sm:inline">
              Admin
            </Link>
          )}
          <Link
            id="cart-target"
            href="/cart"
            className={`inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700 ${
              bump ? "cart-bump" : ""
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6h15l-1.5 9h-12z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6 5 3H3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
            </svg>
            Cart
            {count > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-brand-700">
                {count}
              </span>
            )}
          </Link>
          {auth ? (
            <button onClick={logout} className="hidden hover:text-brand-800 sm:inline">
              Logout
            </button>
          ) : null}
          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-brand-200 bg-white px-4 py-3 md:hidden">
          {NAV.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-brand-700"
            >
              {l.label}
            </Link>
          ))}
          <Link href={auth ? "/account" : "/login"} onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-brand-700">
            Account
          </Link>
          {isAdmin(auth) && (
            <Link href="/admin" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-brand-700">
              Admin
            </Link>
          )}
          {auth && (
            <button onClick={logout} className="block py-2 text-sm font-medium text-brand-700">
              Logout
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
