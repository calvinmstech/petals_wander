"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import type { Order, Paginated } from "@/lib/types";

function AccountInner() {
  const router = useRouter();
  const placed = useSearchParams().get("placed");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login?redirect=/account");
      return;
    }
    api
      .get<Paginated<Order>>("/orders")
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-serif text-2xl font-semibold text-brand-900">My orders</h1>

      {placed && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          🎉 Order <strong>{placed}</strong> placed! We&apos;ll be in touch soon.
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-brand-400">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-brand-400">
          No orders yet.{" "}
          <Link href="/shop" className="text-brand-600 underline">
            Browse flowers
          </Link>
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-brand-100 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-brand-900">{order.number}</p>
                  <p className="text-xs text-brand-400">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <ul className="mt-3 space-y-1 text-sm text-brand-600">
                {order.items?.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span>
                      {it.product_name} × {it.quantity}
                    </span>
                    <span>{money(it.line_total)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-right font-semibold text-brand-900">
                Total {money(order.total)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-4xl px-4 py-8 text-brand-400">Loading…</p>}>
      <AccountInner />
    </Suspense>
  );
}
