"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cart, CART_EVENT, type CartItem } from "@/lib/cart";
import { money } from "@/lib/format";
import { ButtonLink } from "@/components/Button";
import QtyStepper from "@/components/QtyStepper";

const DELIVERY = 8;

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(cart.items());
    sync();
    window.addEventListener(CART_EVENT, sync);
    return () => window.removeEventListener(CART_EVENT, sync);
  }, []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-400">
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 6h15l-1.5 9h-12z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 6 5 3H3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="18" cy="20" r="1.4" />
          </svg>
        </div>
        <h1 className="mt-5 font-serif text-2xl font-semibold text-brand-900">Your cart is empty</h1>
        <p className="mt-1.5 text-sm text-brand-500">Find something beautiful to brighten the day.</p>
        <ButtonLink href="/shop" className="mt-6">
          Start shopping
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-3xl font-semibold text-brand-900">Your Cart</h1>
        <span className="text-sm text-brand-400">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-6">
        {/* line items */}
        <div className="min-w-0 flex-1 basis-80 space-y-3">
          {items.map((item) => (
            <div
              key={`${item.product_id}:${item.variant_id ?? ""}`}
              className="flex items-center gap-4 rounded-xl border border-brand-100 bg-white p-3.5 transition hover:border-brand-200 hover:shadow-sm"
            >
              <Link href={`/product/${item.product_id}`} className="flex-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_path ?? "/images/products/placeholder.svg"}
                  alt={item.name}
                  className="h-20 w-20 rounded-lg border border-brand-100 object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.product_id}`}
                  className="block truncate font-medium text-brand-900 hover:text-brand-600"
                >
                  {item.name}
                </Link>
                {item.variant_label && (
                  <span className="mt-0.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-500">
                    {item.variant_label}
                  </span>
                )}
                <p className="mt-1 text-xs text-brand-400">{money(item.price)} each</p>
                <div className="mt-2 sm:hidden">
                  <QtyStepper
                    size="sm"
                    value={item.quantity}
                    onChange={(n) => cart.setQuantity(item.product_id, n, item.variant_id)}
                  />
                </div>
              </div>
              <div className="hidden sm:block">
                <QtyStepper
                  size="sm"
                  value={item.quantity}
                  onChange={(n) => cart.setQuantity(item.product_id, n, item.variant_id)}
                />
              </div>
              <div className="w-20 flex-none text-right font-semibold text-brand-900">
                {money(item.price * item.quantity)}
              </div>
              <button
                onClick={() => cart.remove(item.product_id, item.variant_id)}
                className="flex-none rounded-full p-1.5 text-brand-300 transition hover:bg-brand-50 hover:text-rose-500"
                aria-label="Remove"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
          <Link href="/shop" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-800">
            ← Continue shopping
          </Link>
        </div>

        {/* summary */}
        <aside className="w-full flex-none rounded-xl border border-brand-100 bg-mist p-5 md:w-80 md:sticky md:top-24">
          <h2 className="mb-3.5 font-serif text-lg font-semibold text-brand-900">Order Summary</h2>
          <Row label="Subtotal" value={money(subtotal)} />
          <Row label="Delivery" value={money(DELIVERY)} />
          <div className="my-3 flex gap-2">
            <input className="input flex-1" placeholder="Promo code" />
            <button className="rounded-lg border border-brand-200 bg-white px-3.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
              Apply
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-brand-100 pt-3 text-base font-bold text-brand-900">
            <span>Total</span>
            <span>{money(subtotal + DELIVERY)}</span>
          </div>
          <ButtonLink href="/checkout" className="mt-4 w-full">
            Checkout
          </ButtonLink>
          <p className="mt-3 text-center text-xs text-brand-400">Taxes calculated at checkout</p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm text-brand-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
