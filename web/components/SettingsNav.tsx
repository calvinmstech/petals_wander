"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/settings/payment", label: "Payment" },
  { href: "/admin/settings/home", label: "Home page" },
];

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2">
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
              active ? "bg-brand-900 text-white" : "border border-brand-200 bg-white text-brand-600 hover:bg-brand-50"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
