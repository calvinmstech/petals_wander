"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable, { type Column } from "@/components/DataTable";
import type { DashboardData, Order } from "@/lib/types";

export default function AdminDashboard() {
  const [d, setD] = useState<DashboardData | null>(null);

  useEffect(() => {
    api
      .get<{ data: DashboardData }>("/admin/dashboard")
      .then((res) => setD(res.data))
      .catch(() => setD(null));
  }, []);

  const stats = [
    { label: "Orders (30d)", value: d?.orders_30d ?? "—" },
    { label: "Sales (30d)", value: d ? money(d.revenue_30d) : "—" },
    { label: "Orders (all time)", value: d?.orders_total ?? "—" },
    { label: "Customers (all time)", value: d?.customers_total ?? "—" },
  ];

  const maxSale = Math.max(1, ...(d?.sales_series.map((s) => s.total) ?? [1]));

  const recentColumns: Column<Order>[] = [
    { header: "Order", cell: (o) => o.number, width: "0.9fr" },
    { header: "Customer", cell: (o) => o.user?.name ?? "—", width: "1.3fr" },
    { header: "Date", cell: (o) => new Date(o.created_at).toLocaleDateString(), width: "0.9fr", className: "text-brand-400" },
    { header: "Total", cell: (o) => <span className="font-semibold">{money(o.total)}</span>, width: "0.8fr" },
    { header: "Status", cell: (o) => <StatusBadge status={o.status} />, width: "1fr" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-2xl font-semibold text-brand-900">Overview</h1>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3.5">
        {/* sales chart */}
        <div className="min-w-0 flex-1 basis-80 rounded-xl border border-brand-100 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-brand-900">Sales over time (30d)</div>
          <div className="flex h-40 items-end gap-[3px]">
            {(d?.sales_series ?? []).map((s) => (
              <div
                key={s.date}
                title={`${s.date}: ${money(s.total)}`}
                className="flex-1 rounded-t bg-brand-300 transition hover:bg-brand-500"
                style={{ height: `${Math.max(2, (s.total / maxSale) * 100)}%` }}
              />
            ))}
          </div>
        </div>

        {/* top products */}
        <div className="min-w-0 flex-1 basis-60 rounded-xl border border-brand-100 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-brand-900">Top products</div>
          {(d?.top_products ?? []).map((p) => (
            <div key={p.product_name} className="flex items-center justify-between border-b border-brand-50 py-1.5 text-sm last:border-0">
              <span className="min-w-0 truncate text-brand-700">{p.product_name}</span>
              <span className="ml-2 flex-none font-semibold text-brand-900">{money(p.revenue)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* recent orders */}
      <div>
        <div className="mb-2 text-sm font-semibold text-brand-900">Recent orders</div>
        <DataTable
          columns={recentColumns}
          rows={d?.recent_orders ?? []}
          rowKey={(o) => o.id}
          minWidth={560}
          empty="No orders yet."
        />
      </div>
    </div>
  );
}
