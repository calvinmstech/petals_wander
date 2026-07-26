"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import DataTable, { type Column } from "@/components/DataTable";
import type { Category, Paginated, Product } from "@/lib/types";

function stockStatus(p: Product): string {
  if (!p.is_active) return "hidden";
  if (p.stock <= 0) return "out";
  if (p.stock < 10) return "low";
  return "active";
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [p, c] = await Promise.all([
      api.get<Paginated<Product>>("/admin/products?per_page=100"),
      api.get<{ data: Category[] }>("/admin/categories"),
    ]);
    setProducts(p.data);
    setCategories(c.data);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const cats = p.categories ?? (p.category ? [p.category] : []);
      const inCat = !catFilter || cats.some((c) => String(c.id) === catFilter);
      return (!q || p.name.toLowerCase().includes(q)) && inCat;
    });
  }, [products, search, catFilter]);

  const productColumns: Column<Product>[] = [
    {
      header: "",
      width: "0.5fr",
      cell: (p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.image_path ?? "/images/products/placeholder.svg"}
          alt=""
          className="h-9 w-9 rounded-md border border-brand-200 object-cover"
        />
      ),
    },
    { header: "Product", width: "1.6fr", cell: (p) => <span className="font-semibold">{p.name}</span> },
    {
      header: "Categories",
      width: "1.4fr",
      cell: (p) => {
        const cats = p.categories ?? (p.category ? [p.category] : []);
        return cats.length ? (
          <span className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <span key={c.id} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                {c.name}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-brand-400">—</span>
        );
      },
    },
    { header: "Price", width: "0.7fr", cell: (p) => money(p.price) },
    { header: "Stock", width: "0.5fr", cell: (p) => p.stock },
    { header: "Status", width: "0.8fr", cell: (p) => <StatusBadge status={stockStatus(p)} /> },
    {
      header: "",
      width: "0.7fr",
      className: "text-right",
      cell: (p) => (
        <Link href={`/admin/products/${p.id}`} className="font-semibold text-brand-600" onClick={(e) => e.stopPropagation()}>
          Edit
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-brand-900">Products</h1>
        {tab === "products" && (
          <Button size="sm" onClick={() => router.push("/admin/products/new")}>
            + Add product
          </Button>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-6 border-b border-brand-100">
        <TabBtn active={tab === "products"} onClick={() => setTab("products")}>
          Products ({products.length})
        </TabBtn>
        <TabBtn active={tab === "categories"} onClick={() => setTab("categories")}>
          Categories ({categories.length})
        </TabBtn>
      </div>

      {tab === "products" ? (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              className="input max-w-xs flex-1"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input w-auto cursor-pointer">
              <option value="">Category: All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="text-brand-400">Loading…</p>
          ) : (
            <DataTable
              columns={productColumns}
              rows={filtered}
              rowKey={(p) => p.id}
              onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
              minWidth={640}
              empty="No products."
            />
          )}
        </>
      ) : (
        <CategoryManager categories={categories} onChanged={load} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold ${
        active ? "border-brand-600 text-brand-700" : "border-transparent text-brand-400"
      }`}
    >
      {children}
    </button>
  );
}

function CategoryManager({ categories, onChanged }: { categories: Category[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post("/admin/categories", { name });
      setName("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await api.put(`/admin/categories/${editing.id}`, {
        name: editing.name,
        show_on_home: editing.show_on_home ?? false,
      });
      setEditing(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(files: FileList) {
    if (!editing || files.length === 0) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("image", files[0]);
      const res = await api.upload<{ data: Category }>(`/admin/categories/${editing.id}/image`, form);
      setEditing(res.data);
      onChanged();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function toggleHome(c: Category) {
    await api.put(`/admin/categories/${c.id}`, { show_on_home: !c.show_on_home });
    onChanged();
  }

  async function remove(id: number) {
    if (!confirm("Delete this category?")) return;
    await api.delete(`/admin/categories/${id}`);
    onChanged();
  }

  const columns: Column<Category>[] = [
    {
      header: "",
      width: "0.5fr",
      cell: (c) =>
        c.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image_path} alt="" className="h-9 w-9 rounded-md border border-brand-200 object-cover" />
        ) : (
          <span className="block h-9 w-9 rounded-md border border-dashed border-brand-200 bg-brand-50" />
        ),
    },
    { header: "Category", width: "1.4fr", cell: (c) => <span className="font-semibold">{c.name}</span> },
    { header: "Slug", width: "1fr", cell: (c) => <span className="font-mono text-xs text-brand-400">{c.slug}</span> },
    { header: "Products", width: "0.6fr", cell: (c) => c.products_count ?? 0 },
    {
      header: "On home",
      width: "0.8fr",
      cell: (c) => (
        <button
          onClick={() => toggleHome(c)}
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            c.show_on_home ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-500"
          }`}
        >
          {c.show_on_home ? "Shown" : "Hidden"}
        </button>
      ),
    },
    {
      header: "",
      width: "0.8fr",
      className: "text-right",
      cell: (c) => (
        <span className="space-x-3 whitespace-nowrap">
          <button onClick={() => setEditing(c)} className="font-semibold text-brand-600">
            Edit
          </button>
          <button onClick={() => remove(c.id)} className="font-semibold text-rose-500">
            Delete
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex flex-wrap gap-2.5">
        <input className="input max-w-xs flex-1" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button size="sm" type="submit" disabled={busy}>
          Add
        </Button>
      </form>
      <DataTable columns={columns} rows={categories} rowKey={(c) => c.id} minWidth={620} empty="No categories." />

      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveEdit} className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="font-serif text-lg font-semibold text-brand-900">Edit category</h2>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-brand-500">Name</div>
              <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </div>

            <label className="flex items-center gap-2 text-sm text-brand-700">
              <input
                type="checkbox"
                checked={editing.show_on_home ?? false}
                onChange={(e) => setEditing({ ...editing, show_on_home: e.target.checked })}
              />
              Show on home page (“Shop by category”)
            </label>

            <div>
              <div className="mb-1.5 text-xs font-semibold text-brand-500">Image</div>
              {editing.image_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editing.image_path} alt="" className="mb-2 h-28 w-full rounded-lg border border-brand-100 object-cover" />
              ) : (
                <div className="mb-2 flex h-28 items-center justify-center rounded-lg border border-dashed border-brand-200 bg-brand-50 text-xs text-brand-400">
                  No image yet
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="rounded-lg border border-dashed border-brand-400 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                {busy ? "Uploading…" : "＋ Upload image"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && uploadImage(e.target.files)}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={busy}>
                Save
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
