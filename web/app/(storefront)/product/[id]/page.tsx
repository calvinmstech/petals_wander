"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cart } from "@/lib/cart";
import { flyToCart } from "@/lib/flyToCart";
import { money } from "@/lib/format";
import Button from "@/components/Button";
import QtyStepper from "@/components/QtyStepper";
import type { HomeSettings, Product, ProductVariant } from "@/lib/types";

const ACCORDION = ["Description", "Delivery & care"];

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [openPanel, setOpenPanel] = useState(0);
  const [deliveryCare, setDeliveryCare] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const mainImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    api
      .get<{ data: Product }>(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    api
      .get<{ data: HomeSettings }>("/settings/home")
      .then((res) => setDeliveryCare(res.data.delivery_care ?? ""))
      .catch(() => {});
  }, []);

  if (notFound) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-brand-500">
        <p>Sorry, we couldn&apos;t find that flower.</p>
        <Link href="/shop" className="mt-4 inline-block text-brand-600 underline">
          Back to shop
        </Link>
      </div>
    );
  }

  if (!product) return <p className="mx-auto max-w-6xl px-4 py-8 text-brand-400">Loading…</p>;

  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  // Variant products require an explicit size choice before adding.
  const needsSelection = hasVariants && !variant;
  const basePrice = typeof product.price === "string" ? parseFloat(product.price) : product.price;
  const price = variant ? Number(variant.price) : basePrice;
  const available = variant ? variant.stock : hasVariants ? 0 : product.stock;
  const canAdd = !needsSelection && available > 0;
  const gallery =
    product.images && product.images.length > 0
      ? product.images.map((i) => i.path)
      : [product.image_path ?? "/images/products/placeholder.svg"];
  const mainImg = gallery[Math.min(activeImg, gallery.length - 1)];

  function addToCart(thenGo?: string) {
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
    if (thenGo) {
      router.push(thenGo);
    } else {
      flyToCart(mainImgRef.current, mainImg);
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1600);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="font-mono text-xs text-brand-400">
        Home / Shop / {product.name}
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-8">
        {/* gallery */}
        <div className="min-w-0 flex-1 basis-72">
          <div className="overflow-hidden rounded-xl border border-brand-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={mainImgRef} src={mainImg} alt={product.name} className="aspect-square w-full object-cover" />
          </div>
          {gallery.length > 1 && (
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border ${
                    i === activeImg ? "border-2 border-brand-600" : "border-brand-200"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* info */}
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="font-serif text-3xl font-semibold text-brand-900">{product.name}</h1>
          <p className="mt-3 font-serif text-2xl font-semibold text-brand-900">{money(price)}</p>
          <p className="mt-3 leading-relaxed text-brand-600">{product.description}</p>

          {/* size picker */}
          {variants.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold text-brand-500">
                {variant ? (
                  <>Size — <span className="text-brand-800">{variant.size}</span></>
                ) : (
                  <span className="text-rose-500">Select a size</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
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
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
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
              <p className="mt-2 font-mono text-xs text-brand-400">
                Each size is its own SKU{variant ? ` · ${variant.sku}` : ""} — price &amp; stock per size.
              </p>
            </div>
          )}

          <p className="mt-4 text-sm text-brand-500">
            {needsSelection
              ? "Choose a size to see availability"
              : available > 0
                ? `${available} in stock`
                : "Currently sold out"}
          </p>

          {/* qty + add */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} max={available || undefined} />
            <div className="relative flex-1">
              <Button
                onClick={() => addToCart()}
                disabled={!canAdd}
                className={`w-full ${justAdded ? "btn-pop" : ""}`}
              >
                {justAdded ? "Added ✓" : needsSelection ? "Select a size" : "Add to cart"}
              </Button>
              {justAdded && (
                <span
                  className="fly-up pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-900 px-3 py-1 text-xs font-semibold text-white shadow-md"
                >
                  Added to cart 🌸
                </span>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => addToCart("/checkout")}
            disabled={!canAdd}
            className="mt-2.5 w-full"
          >
            {needsSelection ? "Select a size" : "Buy it now"}
          </Button>

          {/* accordion */}
          <div className="mt-6 border-t border-brand-100">
            {ACCORDION.map((label, i) => (
              <div key={label} className="border-b border-brand-100">
                <button
                  onClick={() => setOpenPanel(openPanel === i ? -1 : i)}
                  className="flex w-full items-center justify-between py-3.5 text-left text-sm font-semibold text-brand-800"
                >
                  {label}
                  <span className="text-brand-400">{openPanel === i ? "−" : "+"}</span>
                </button>
                {openPanel === i && (
                  <p className="pb-4 text-sm leading-relaxed text-brand-600">
                    {i === 0 ? product.description : deliveryCare}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* related */}
      {(product.related?.length ?? 0) > 0 && (
        <section className="mt-12 border-t border-brand-100 pt-8">
          <h2 className="mb-4 font-serif text-xl font-semibold text-brand-900">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {product.related!.map((r) => (
              <Link
                key={r.id}
                href={`/product/${r.id}`}
                className="group overflow-hidden rounded-xl border border-brand-100 bg-white transition hover:shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.image_path ?? "/images/products/placeholder.svg"}
                  alt={r.name}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-3">
                  <div className="text-sm font-medium text-brand-800 group-hover:text-brand-600">{r.name}</div>
                  <div className="mt-1 font-semibold text-brand-900">{money(r.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
