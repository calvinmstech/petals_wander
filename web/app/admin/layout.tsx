"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuth, isAdmin } from "@/lib/auth";
import AdminTopNav from "@/components/AdminTopNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const isLogin = pathname === "/admin/login";

  // proxy.ts guards this route server-side; this is a client fallback.
  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    if (!isAdmin(getAuth())) {
      router.replace("/admin/login?redirect=/admin");
    } else {
      setReady(true);
    }
  }, [router, isLogin]);

  // The admin login provides its own full-screen layout (no top nav).
  if (isLogin) return <>{children}</>;

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col bg-brand-50/40">
      <AdminTopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6">{children}</main>
    </div>
  );
}
