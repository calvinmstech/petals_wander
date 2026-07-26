"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import DataTable, { type Column } from "@/components/DataTable";
import type { Order, Paginated } from "@/lib/types";

const STATUSES = ["awaiting_payment", "pending", "paid", "shipped", "ready", "completed", "cancelled", "refunded"];
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8014/api").replace(/\/api$/, "");

export default function AdminSalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ per_page: "100" });
    if (statusFilter) params.set("status", statusFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const res = await api.get<Paginated<Order>>(`/admin/orders?${params.toString()}`);
    setOrders(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.number.toLowerCase().includes(q) ||
        o.user?.name?.toLowerCase().includes(q) ||
        o.user?.email?.toLowerCase().includes(q) ||
        o.purchaser_name?.toLowerCase().includes(q) ||
        o.guest_email?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  async function setStatus(order: Order, status: string) {
    const res = await api.patch<{ data: Order }>(`/admin/orders/${order.id}`, { status });
    setSelected((s) => (s ? { ...s, status: res.data.status } : s));
    await load();
  }

  const columns: Column<Order>[] = [
    { header: "Order", cell: (o) => o.number, width: "0.9fr" },
    {
      header: "Customer",
      cell: (o) => (
        <span className="flex items-center gap-1.5">
          <span className="truncate">{o.user?.name ?? o.purchaser_name ?? "—"}</span>
          {!o.user && (
            <span className="flex-none rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-500">
              Guest
            </span>
          )}
        </span>
      ),
      width: "1.3fr",
    },
    { header: "Date", cell: (o) => new Date(o.created_at).toLocaleDateString(), width: "0.8fr", className: "text-brand-400" },
    { header: "Items", cell: (o) => o.items?.length ?? 0, width: "0.5fr" },
    { header: "Total", cell: (o) => <span className="font-semibold">{money(o.total)}</span>, width: "0.8fr" },
    { header: "Status", cell: (o) => <StatusBadge status={o.status} />, width: "1fr" },
    { header: "", cell: () => <span className="font-semibold text-brand-600">View</span>, width: "0.5fr", className: "text-right" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-2xl font-semibold text-brand-900">Sales / Orders</h1>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          className="input max-w-xs flex-1"
          placeholder="Search order # or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto cursor-pointer"
        >
          <option value="">Status: All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-brand-400">From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input w-auto cursor-pointer"
          />
          <span className="text-xs font-semibold text-brand-400">to</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="input w-auto cursor-pointer"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs font-semibold text-brand-500 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-brand-400">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(o) => o.id}
          onRowClick={(o) => setSelected(o)}
          minWidth={640}
          empty="No orders found."
        />
      )}

      {selected && (
        <OrderDrawer order={selected} onClose={() => setSelected(null)} onSetStatus={setStatus} />
      )}
    </div>
  );
}

function OrderDrawer({
  order,
  onClose,
  onSetStatus,
}: {
  order: Order;
  onClose: () => void;
  onSetStatus: (order: Order, status: string) => void;
}) {
  const isBankAwaiting = order.payment_method === "bank" && order.status === "awaiting_payment";
  const [copied, setCopied] = useState(false);

  const waText = buildWhatsAppMessage(order);
  const waPhone = digitsOnly(order.phone ?? order.purchaser_phone);
  const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`;

  async function copyInfo() {
    try {
      await navigator.clipboard.writeText(waText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable (insecure context) — fall back to the wa.me link
      window.open(waLink, "_blank", "noopener");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-serif text-xl font-semibold text-brand-900">{order.number}</div>
            <div className="mt-1 text-xs text-brand-400">
              {new Date(order.created_at).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} className="text-xl text-brand-400 hover:text-brand-600">
            ×
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="text-xs capitalize text-brand-400">
            {order.payment_method} · {order.delivery_method?.replace(/_/g, " ")}
          </span>
        </div>

        {/* purchaser + recipient */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ContactCard
            heading="Purchaser"
            name={order.purchaser_name ?? order.user?.name}
            phone={order.purchaser_phone}
            email={order.user?.email ?? order.guest_email}
            badge={order.user ? undefined : "Guest"}
          />
          <ContactCard
            heading="Send to"
            name={order.recipient_name}
            phone={order.phone}
            address={order.shipping_address}
          />
        </div>

        {(order.delivery_date || order.card_message) && (
          <div className="mt-3 rounded-lg border border-brand-100 p-3.5 text-sm">
            {order.delivery_date && (
              <div className="flex justify-between text-brand-600">
                <span className="text-brand-400">Delivery date</span>
                <span className="font-medium text-brand-800">
                  {new Date(order.delivery_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {order.card_message && (
              <div className="mt-2 border-t border-brand-100 pt-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">Gift card message</div>
                <p className="mt-1 whitespace-pre-wrap italic text-brand-700">“{order.card_message}”</p>
              </div>
            )}
          </div>
        )}

        {/* items */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-400">Items</div>
          <ul className="space-y-2 text-sm">
            {order.items?.map((it) => (
              <li key={it.id} className="flex items-center gap-3 text-brand-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.product?.image_path ?? "/images/products/placeholder.svg"}
                  alt=""
                  className="h-10 w-10 flex-none rounded-md border border-brand-200 object-cover"
                />
                <span className="min-w-0 flex-1 truncate">
                  {it.product_name} × {it.quantity}
                </span>
                <span className="flex-none font-medium">{money(it.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-brand-100 pt-2 text-sm">
            <div className="flex justify-between text-brand-500">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-brand-500">
              <span>Delivery</span>
              <span>{money(order.shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-brand-900">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
          </div>
        </div>

        {/* payment proof */}
        {order.payment_proof_path && (
          <a
            href={`${API_ORIGIN}/storage/${order.payment_proof_path}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-medium text-brand-600 underline"
          >
            View uploaded receipt ↗
          </a>
        )}

        {/* actions */}
        <div className="mt-6 space-y-2.5 border-t border-brand-100 pt-4">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={copyInfo} className="flex-1">
              {copied ? "Copied ✓" : "Copy for WhatsApp"}
            </Button>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-white hover:brightness-95"
              title="Open WhatsApp"
              aria-label="Open WhatsApp"
            >
              WhatsApp ↗
            </a>
          </div>
          {isBankAwaiting && (
            <Button onClick={() => onSetStatus(order, "paid")} className="w-full">
              Verify &amp; mark paid
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-500">Status</span>
            <select
              value={order.status}
              onChange={(e) => onSetStatus(order, e.target.value)}
              className="input w-auto flex-1 cursor-pointer"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          {order.status !== "refunded" && (
            <Button variant="secondary" onClick={() => onSetStatus(order, "refunded")} className="w-full">
              Refund order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A labelled contact block for the order drawer. Name is prominent; phone and
 * email are clearly distinguished with icons and are tappable (call / email).
 * A "Guest" badge flags orders placed without an account.
 */
function ContactCard({
  heading,
  name,
  phone,
  email,
  address,
  badge,
}: {
  heading: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  badge?: string;
}) {
  return (
    <div className="rounded-lg border border-brand-100 bg-mist p-3.5 text-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">{heading}</span>
        {badge && (
          <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">
            {badge}
          </span>
        )}
      </div>
      <div className="font-semibold text-brand-800">{name || "—"}</div>
      <div className="mt-1.5 space-y-1">
        {phone && (
          <ContactRow icon="📞" href={`tel:${digitsOnly(phone)}`}>
            {phone}
          </ContactRow>
        )}
        {email && (
          <ContactRow icon="✉️" href={`mailto:${email}`}>
            {email}
          </ContactRow>
        )}
        {address && (
          <ContactRow icon="📍">
            {address}
          </ContactRow>
        )}
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  href,
  children,
}: {
  icon: string;
  href?: string;
  children: React.ReactNode;
}) {
  const content = (
    <span className="min-w-0 break-words">{children}</span>
  );
  return (
    <div className="flex items-start gap-1.5 text-brand-600">
      <span className="flex-none select-none text-xs leading-5">{icon}</span>
      {href ? (
        <a href={href} className="min-w-0 break-words text-brand-600 hover:text-brand-800 hover:underline">
          {children}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

/** Strip everything but digits so the value works in a wa.me link. */
function digitsOnly(phone?: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** Build a human-readable order summary for pasting into WhatsApp. */
function buildWhatsAppMessage(order: Order): string {
  const lines: string[] = [];
  lines.push(`*Order ${order.number}*`);
  lines.push(`Date: ${new Date(order.created_at).toLocaleDateString()}`);
  lines.push(`Status: ${order.status.replace(/_/g, " ")}`);
  lines.push("");

  lines.push("*Purchaser*");
  lines.push(order.purchaser_name ?? order.user?.name ?? "—");
  if (order.purchaser_phone) lines.push(order.purchaser_phone);
  lines.push("");

  lines.push("*Send to*");
  lines.push(order.recipient_name ?? "—");
  if (order.phone) lines.push(order.phone);
  if (order.shipping_address) lines.push(order.shipping_address);
  if (order.delivery_date) lines.push(`Delivery date: ${new Date(order.delivery_date).toLocaleDateString()}`);
  lines.push("");

  lines.push("*Items*");
  for (const it of order.items ?? []) {
    lines.push(`• ${it.product_name} × ${it.quantity} — ${money(it.line_total)}`);
  }
  lines.push("");

  lines.push(`Subtotal: ${money(order.subtotal)}`);
  lines.push(`Delivery: ${money(order.shipping)}`);
  lines.push(`*Total: ${money(order.total)}*`);

  if (order.card_message) {
    lines.push("");
    lines.push("*Card message*");
    lines.push(`"${order.card_message}"`);
  }

  return lines.join("\n");
}
