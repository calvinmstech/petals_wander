"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import type { Order } from "@/lib/types";

// Order confirmation / lookup. Works for a signed-in customer (Bearer token) and
// for a guest, who reaches it via ?token=<guest_token> from checkout or email.
function OrderInner({ id }: { id: string }) {
  const token = useSearchParams().get("token");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guests authorize every request to this order with the same token.
  const query = token ? `?token=${encodeURIComponent(token)}` : "";

  function load() {
    return api
      .get<{ data: Order }>(`/orders/${id}${query}`)
      .then((res) => setOrder(res.data))
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "This order link is invalid or has expired."
            : "We couldn't load this order."
        )
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token && !getAuth()) {
      setError("This order link is invalid or has expired.");
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  if (loading) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-brand-400">Loading…</p>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        <Link href="/shop" className="mt-4 inline-block text-sm text-brand-600 underline">
          Browse the shop
        </Link>
      </div>
    );
  }

  const awaitingBank = order.status === "awaiting_payment" && order.payment_method === "bank";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-brand-100 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-400">Order</p>
            <h1 className="font-serif text-2xl font-semibold text-brand-900">{order.number}</h1>
            <p className="mt-0.5 text-xs text-brand-400">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          🎉 Thank you! Your order is placed. A confirmation has been sent
          {order.guest_email ? ` to ${order.guest_email}` : ""}.
        </p>

        <ul className="mt-5 space-y-1.5 border-t border-brand-100 pt-4 text-sm text-brand-600">
          {order.items?.map((it) => (
            <li key={it.id} className="flex justify-between">
              <span>
                {it.product_name} × {it.quantity}
              </span>
              <span>{money(it.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-brand-100 pt-3 text-sm text-brand-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{Number(order.shipping) === 0 ? "Free" : money(order.shipping)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-brand-100 pt-2 text-base font-bold text-brand-900">
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
        </div>

        {awaitingBank && (
          <ReceiptUpload orderId={order.id} token={token} onUploaded={load} uploaded={Boolean(order.payment_proof_path)} />
        )}
      </div>

      <p className="mt-5 text-center text-xs text-brand-400">
        {token
          ? "Bookmark this page to check your order — the link in your email works too."
          : ""}{" "}
        <Link href="/shop" className="text-brand-600 underline">
          Continue shopping
        </Link>
      </p>
    </div>
  );
}

function ReceiptUpload({
  orderId,
  token,
  uploaded,
  onUploaded,
}: {
  orderId: number;
  token: string | null;
  uploaded: boolean;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("receipt", file);
      if (token) form.append("token", token);
      await api.upload(`/orders/${orderId}/receipt`, form);
      setMsg("Receipt uploaded — we'll verify your payment shortly.");
      onUploaded();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-brand-200 bg-mist p-4">
      <div className="text-sm font-semibold text-brand-800">
        {uploaded ? "Payment proof received" : "Upload your bank-transfer receipt"}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-brand-600">
        Your order is <strong>awaiting payment</strong>. Once we verify your transfer, it&apos;s
        released for fulfilment.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="block text-xs text-brand-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700"
        />
        <Button type="button" onClick={upload} disabled={busy}>
          {busy ? "Uploading…" : uploaded ? "Replace" : "Upload"}
        </Button>
      </div>
      {msg && <p className="mt-2 text-xs text-brand-600">{msg}</p>}
    </div>
  );
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<p className="mx-auto max-w-2xl px-4 py-10 text-brand-400">Loading…</p>}>
      <OrderInner id={id} />
    </Suspense>
  );
}
