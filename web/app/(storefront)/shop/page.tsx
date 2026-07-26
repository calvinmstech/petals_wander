"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import type { Category, Paginated, Product } from "@/lib/types";

const PER_PAGE = 9;

function numericPrice(p: Product): number {
  return typeof p.price === "string" ? parseFloat(p.price) : p.price;
}

function ShopInner() {
  const initialCategory = useSearchParams().get("category") ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(250);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveCat(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    api
      .get<{ data: Category[] }>("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: "100" });
    if (activeCat) params.set("category", activeCat);
    if (search) params.set("search", search);

    const t = setTimeout(() => {
      api
        .get<Paginated<Product>>(`/products?${params.toString()}`)
        .then((res) => setProducts(res.data))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(t);
  }, [activeCat, search]);

  // Client-side refine (price, availability, sort) + pagination.
  const refined = useMemo(() => {
    let list = products.filter((p) => numericPrice(p) <= maxPrice);
    if (inStockOnly) list = list.filter((p) => p.stock > 0 || (p.variants_count ?? 0) > 0);
    switch (sort) {
      case "price_asc":
        list = [...list].sort((a, b) => numericPrice(a) - numericPrice(b));
        break;
      case "price_desc":
        list = [...list].sort((a, b) => numericPrice(b) - numericPrice(a));
        break;
      case "name":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list = [...list].sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    }
    return list;
  }, [products, maxPrice, inStockOnly, sort]);

  useEffect(() => setPage(1), [activeCat, search, sort, inStockOnly, maxPrice]);

  const totalPages = Math.max(1, Math.ceil(refined.length / PER_PAGE));
  const pageItems = refined.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* breadcrumb */}
      <div className="font-mono text-xs text-brand-400">Home / Shop</div>

      {/* toolbar */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-brand-900">Shop</h1>
        <span className="text-sm text-brand-400">{refined.length} products</span>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <input
            type="search"
            placeholder="Search flowers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-52"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto cursor-pointer">
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: low → high</option>
            <option value="price_desc">Price: high → low</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-6">
        {/* filters */}
        <aside className="w-full flex-none rounded-xl border border-brand-100 bg-white p-4 md:w-52">
          <div className="mb-3 text-sm font-semibold text-brand-900">Filters</div>

          <div className="text-xs font-semibold text-brand-500">Category</div>
          <div className="mt-2 space-y-1.5 text-sm text-brand-700">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" checked={activeCat === ""} onChange={() => setActiveCat("")} />
              All
            </label>
            {categories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={activeCat === c.slug}
                  onChange={() => setActiveCat(c.slug)}
                />
                {c.name}
              </label>
            ))}
          </div>

          <div className="mt-4 text-xs font-semibold text-brand-500">Max price</div>
          <input
            type="range"
            min={10}
            max={250}
            step={10}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="mt-2 w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-brand-400">
            <span>$10</span>
            <span>${maxPrice}</span>
          </div>

          <div className="mt-4 text-xs font-semibold text-brand-500">Availability</div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-brand-700">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
            In stock only
          </label>
        </aside>

        {/* grid */}
        <div className="min-w-0 flex-1">
          {loading ? (
            <p className="text-brand-400">Loading…</p>
          ) : pageItems.length === 0 ? (
            <p className="text-brand-400">No products match your filters.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {pageItems.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-7 flex justify-center gap-1.5">
              <PageBtn label="‹" disabled={page === 1} onClick={() => setPage((p) => p - 1)} />
              {Array.from({ length: totalPages }).map((_, i) => (
                <PageBtn key={i} label={String(i + 1)} active={page === i + 1} onClick={() => setPage(i + 1)} />
              ))}
              <PageBtn label="›" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageBtn({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm disabled:opacity-40 ${
        active
          ? "border-brand-600 bg-brand-100 font-semibold text-brand-700"
          : "border-brand-200 text-brand-600 hover:bg-brand-50"
      }`}
    >
      {label}
    </button>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-8 text-brand-400">Loading…</p>}>
      <ShopInner />
    </Suspense>
  );
}
