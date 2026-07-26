"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cart } from "@/lib/cart";
import { flyToCart } from "@/lib/flyToCart";
import { money } from "@/lib/format";
import Button from "@/components/Button";
import QtyStepper from "@/components/QtyStepper";
import type { Product, ProductVariant } from "@/lib/types";

/**
 * Lightweight "quick add" modal for products with size variants — lets the
 * customer pick a size + quantity from the listing without a full page nav.
 * Fetches the full product (variants + images) on open.
 */
export default function QuickAddModal({
  productId,
  onClose,
}: {
  productId: number;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    api
      .get<{ data: Product }>(`/products/${productId}`)
      .then((res) => setProduct(res.data))
      .catch(() => onClose());
  }, [productId, onClose]);

  // Close on Escape; lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const basePrice = product
    ? typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price
    : 0;
  const hasVariants = (product?.variants?.length ?? 0) > 0;
  // Variant products require an explicit size choice before adding.
  const needsSelection = hasVariants && !variant;
  const price = variant ? Number(variant.price) : basePrice;
  const available = variant ? variant.stock : hasVariants ? 0 : product?.stock ?? 0;
  const canAdd = !needsSelection && available > 0;
  const image =
    product?.images?.find((i) => i.is_default)?.path ??
    product?.images?.[0]?.path ??
    product?.image_path ??
    "/images/products/placeholder.svg";

  function addToCart() {
    if (!product || !canAdd) return;
    cart.add(
      {
        product_id: product.id,
        variant_id: variant?.id ?? null,
        variant_label: variant?.size ?? null,
        name: product.name,
        slug: product.slug,
        price,
        image_path: product.image_path,
      },
      qty
    );
    flyToCart(imgRef.current, image);
    setAdded(true);
    window.setTimeout(onClose, 700);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-brand-100 bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-400">Quick add</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-brand-400 transition hover:bg-brand-50 hover:text-brand-700"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!product ? (
          <p className="px-5 py-10 text-center text-sm text-brand-400">Loading…</p>
        ) : (
          <div className="flex gap-4 p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={image}
              alt={product.name}
              className="h-28 w-28 flex-none rounded-xl border border-brand-100 object-cover"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-xl font-semibold text-brand-900">{product.name}</h2>
              <p className="mt-1 font-serif text-lg font-semibold text-brand-900">{money(price)}</p>
              {product.description && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-brand-500">
                  {product.description}
                </p>
              )}

              {/* size picker */}
              {hasVariants && (
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-semibold text-brand-500">
                    {variant ? `Size — ${variant.size}` : "Select a size"}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {product.variants!.map((v) => {
                      const active = variant?.id === v.id;
                      const disabled = v.stock <= 0;
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            setVariant(v);
                            setQty(1);
                          }}
                          disabled={disabled}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            active
                              ? "border-2 border-brand-600 bg-brand-100 text-brand-700"
                              : "border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
                          } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                        >
                          {v.size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="mt-2.5 text-xs text-brand-400">
                {needsSelection
                  ? "Choose a size to continue"
                  : available > 0
                    ? `${available} in stock`
                    : "Currently sold out"}
              </p>
            </div>
          </div>
        )}

        {/* footer actions */}
        {product && (
          <div className="flex flex-wrap items-center gap-3 border-t border-brand-100 px-5 py-4">
            <QtyStepper value={qty} onChange={setQty} max={available || undefined} />
            <Button
              onClick={addToCart}
              disabled={!canAdd}
              className={`flex-1 ${added ? "btn-pop" : ""}`}
            >
              {added
                ? "Added ✓"
                : needsSelection
                  ? "Select a size"
                  : `Add to cart · ${money(price * qty)}`}
            </Button>
            <Link
              href={`/product/${product.id}`}
              className="w-full text-center text-xs font-medium text-brand-500 hover:text-brand-700"
            >
              View full details →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
