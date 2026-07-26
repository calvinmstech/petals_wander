"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import DataTable, { type Column } from "@/components/DataTable";
import type { Customer, Paginated } from "@/lib/types";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("spend");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Customer | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: "100", sort });
    if (search) params.set("search", search);
    const t = setTimeout(() => {
      api
        .get<Paginated<Customer>>(`/admin/customers?${params.toString()}`)
        .then((res) => setCustomers(res.data))
        .catch(() => setCustomers([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, sort]);

  async function openProfile(c: Customer) {
    const res = await api.get<{ data: Customer }>(`/admin/customers/${c.id}`);
    setSelected(res.data);
  }

  const columns: Column<Customer>[] = [
    {
      header: "Name",
      width: "1.3fr",
      cell: (c) => (
        <span className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-200 text-xs font-semibold text-brand-700">
            {c.name.charAt(0)}
          </span>
          <span className="font-semibold">{c.name}</span>
        </span>
      ),
    },
    { header: "Email", width: "1.6fr", cell: (c) => <span className="text-brand-400">{c.email}</span> },
    { header: "Orders", width: "0.7fr", cell: (c) => c.orders_count ?? 0 },
    { header: "Spent", width: "0.8fr", cell: (c) => <span className="font-semibold">{money(c.spent ?? 0)}</span> },
    { header: "Joined", width: "0.9fr", cell: (c) => <span className="text-brand-400">{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span> },
    { header: "", width: "0.5fr", className: "text-right", cell: () => <span className="font-semibold text-brand-600">View</span> },
  ];

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-2xl font-semibold text-brand-900">Customers</h1>

      <div className="flex flex-wrap items-center gap-2.5">
        <input
          className="input max-w-xs flex-1"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto cursor-pointer">
          <option value="spend">Sort: Spend</option>
          <option value="orders">Sort: Orders</option>
          <option value="name">Sort: Name</option>
          <option value="recent">Sort: Newest</option>
        </select>
      </div>

      {loading ? (
        <p className="text-brand-400">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={customers}
          rowKey={(c) => c.id}
          onRowClick={openProfile}
          minWidth={620}
          empty="No customers."
        />
      )}

      {selected && <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CustomerDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-200 text-lg font-semibold text-brand-700">
              {customer.name.charAt(0)}
            </span>
            <div>
              <div className="font-serif text-lg font-semibold text-brand-900">{customer.name}</div>
              <div className="text-xs text-brand-400">{customer.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-xl text-brand-400 hover:text-brand-600">
            ×
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-brand-100 bg-mist p-3">
            <div className="text-xs text-brand-400">Orders</div>
            <div className="font-serif text-2xl font-semibold text-brand-900">{customer.orders_count ?? customer.orders?.length ?? 0}</div>
          </div>
          <div className="rounded-lg border border-brand-100 bg-mist p-3">
            <div className="text-xs text-brand-400">Joined</div>
            <div className="mt-1 text-sm font-medium text-brand-800">
              {new Date(customer.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-400">Order history</div>
          {customer.orders && customer.orders.length > 0 ? (
            <div className="space-y-2">
              {customer.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-brand-100 px-3 py-2.5 text-sm">
                  <div>
                    <div className="font-medium text-brand-800">{o.number}</div>
                    <div className="text-xs text-brand-400">{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={o.status} />
                    <span className="font-semibold text-brand-900">{money(o.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-400">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
