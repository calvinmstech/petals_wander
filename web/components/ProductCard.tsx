"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { cart } from "@/lib/cart";
import { money } from "@/lib/format";
import { flyToCart } from "@/lib/flyToCart";
import QuickAddModal from "@/components/QuickAddModal";
import type { Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product }) {
  const basePrice =
    typeof product.price === "string" ? parseFloat(product.price) : product.price;
  const hasVariants = (product.variants?.length ?? product.variants_count ?? 0) > 0;
  const soldOut = product.stock <= 0 && !hasVariants;
  const href = `/product/${product.id}`;
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  function handleAdd() {
    // Variant products need a size choice — open the quick-add modal.
    if (hasVariants) {
      setShowModal(true);
      return;
    }
    cart.add({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      price: basePrice,
      image_path: product.image_path,
    });
    flyToCart(imgRef.current, product.image_path ?? "/images/products/placeholder.svg");
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-brand-100 bg-white transition hover:shadow-md">
      <Link href={href} className="relative block overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={product.image_path ?? "/images/products/placeholder.svg"}
          alt={product.name}
          className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link href={href}>
          <h3 className="text-sm font-medium text-brand-800 group-hover:text-brand-600">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-semibold text-brand-900">{money(basePrice)}</span>
          <button
            onClick={handleAdd}
            disabled={soldOut}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white transition disabled:bg-brand-200 ${
              added ? "btn-pop bg-emerald-500" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {soldOut ? "Sold out" : added ? "Added ✓" : hasVariants ? "Choose size" : "+ Add"}
          </button>
        </div>
      </div>

      {showModal && (
        <QuickAddModal productId={product.id} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
