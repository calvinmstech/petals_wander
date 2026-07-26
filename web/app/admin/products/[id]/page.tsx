"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import Button from "@/components/Button";
import type { Category, Paginated, Product, ProductImage, ProductVariant } from "@/lib/types";

type VariantRow = {
  id?: number;
  size: string;
  sku: string;
  price: string;
  stock: string;
  is_active: boolean;
};

function toRow(v: ProductVariant): VariantRow {
  return {
    id: v.id,
    size: v.size,
    sku: v.sku,
    price: String(v.price),
    stock: String(v.stock),
    is_active: v.is_active ?? true,
  };
}

export default function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    is_active: true,
    is_featured: false,
  });
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [relatedIds, setRelatedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ data: Category[] }>("/admin/categories"),
      api.get<Paginated<Product>>("/admin/products?per_page=100"),
    ]).then(([c, p]) => {
      setCategories(c.data);
      setAllProducts(p.data);
    });

    if (!isNew) {
      api
        .get<{ data: Product }>(`/admin/products/${id}`)
        .then((res) => {
          const p = res.data;
          setForm({
            name: p.name,
            description: p.description ?? "",
            price: String(p.price),
            is_active: p.is_active,
            is_featured: p.is_featured,
          });
          setCategoryIds((p.categories ?? []).map((c) => c.id));
          setImages(p.images ?? []);
          setVariants((p.variants ?? []).map(toRow));
          setRelatedIds((p.related ?? []).map((r) => r.id));
        })
        .catch(() => setError("Could not load product."))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  function toggleCategory(cid: number) {
    setCategoryIds((ids) => (ids.includes(cid) ? ids.filter((x) => x !== cid) : [...ids, cid]));
  }

  function addVariant() {
    setVariants((v) => [...v, { size: "", sku: "", price: form.price || "0", stock: "0", is_active: true }]);
  }

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    setVariants((v) => v.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  // --- image management (existing products only) ---
  async function uploadImages(files: FileList) {
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("images[]", f));
      const res = await api.upload<{ data: Product }>(`/admin/products/${id}/images`, form);
      setImages(res.data.images ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function setDefaultImage(imageId: number) {
    const res = await api.patch<{ data: Product }>(`/admin/products/${id}/images/${imageId}/default`);
    setImages(res.data.images ?? []);
  }

  async function deleteImage(imageId: number) {
    const res = await api.delete<{ data: Product }>(`/admin/products/${id}/images/${imageId}`);
    setImages(res.data.images ?? []);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        category_id: categoryIds[0] ?? null,
        category_ids: categoryIds,
        price: Number(form.price || 0),
        stock: variants.length ? variants.reduce((s, v) => s + Number(v.stock || 0), 0) : 0,
        is_active: form.is_active,
        is_featured: form.is_featured,
        variants: variants.map((v) => ({
          size: v.size,
          sku: v.sku,
          price: Number(v.price || 0),
          stock: Number(v.stock || 0),
          is_active: v.is_active,
        })),
        related_ids: relatedIds,
      };

      if (isNew) {
        const res = await api.post<{ data: Product }>("/admin/products", payload);
        // Land on the editor so images can be uploaded against the new id.
        router.push(`/admin/products/${res.data.id}`);
      } else {
        await api.put(`/admin/products/${id}`, payload);
        router.push("/admin/products");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
      setSaving(false);
    }
  }

  if (loading) return <p className="text-brand-400">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="font-mono text-xs text-brand-400">Products / {isNew ? "New" : "Edit"}</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-brand-900">
          {isNew ? "New product" : form.name || "Edit product"}
        </h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push("/admin/products")}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}

      {/* details + sidebar */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1 basis-80 space-y-4">
          <div className="rounded-xl border border-brand-100 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-brand-900">Details</div>
            <Label>Name</Label>
            <input className="input mb-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Label>Description</Label>
            <textarea
              className="input min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* images */}
          <div className="rounded-xl border border-brand-100 bg-white p-4">
            <div className="mb-1 text-sm font-semibold text-brand-900">Images</div>
            <p className="mb-3 text-xs text-brand-400">Upload one or more images. Star marks the default shown on the storefront.</p>
            {isNew ? (
              <p className="rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-500">
                Save the product first, then upload its images here.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={`relative h-24 w-24 overflow-hidden rounded-lg border-2 ${
                        img.is_default ? "border-brand-600" : "border-brand-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.path} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDefaultImage(img.id)}
                        title={img.is_default ? "Default image" : "Set as default"}
                        className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          img.is_default ? "bg-brand-600 text-white" : "bg-white/90 text-brand-500 hover:text-brand-700"
                        }`}
                      >
                        ★
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteImage(img.id)}
                        title="Remove image"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm text-rose-500 hover:bg-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border border-dashed border-brand-300 text-brand-500 hover:bg-brand-50"
                  >
                    <span className="text-2xl leading-none">＋</span>
                    <span className="mt-1 text-[11px]">{uploading ? "Uploading…" : "Upload"}</span>
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && e.target.files.length > 0 && uploadImages(e.target.files)}
                />
              </>
            )}
          </div>
        </div>

        <div className="flex w-full flex-none flex-col gap-3.5 md:w-56">
          <SideCard title="Status">
            <select
              className="input cursor-pointer"
              value={form.is_active ? "active" : "hidden"}
              onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })}
            >
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </select>
            <label className="mt-2.5 flex items-center gap-2 text-sm text-brand-700">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              />
              Featured
            </label>
          </SideCard>
          <SideCard title="Categories">
            <div className="space-y-1.5">
              {categories.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm text-brand-700">
                  <input type="checkbox" checked={categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                  {c.name}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-brand-400">First selected is the primary category.</p>
          </SideCard>
          <SideCard title="Base price">
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-brand-400">Used when a product has no size variants.</p>
          </SideCard>
        </div>
      </div>

      {/* variants */}
      <div className="rounded-xl border border-brand-100 bg-white p-4">
        <div className="mb-1 text-sm font-semibold text-brand-900">Variants — size</div>
        <p className="mb-3 text-xs text-brand-400">Each size is its own SKU with its own price &amp; stock.</p>
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.8fr_0.5fr] gap-2 border-b border-brand-100 pb-2 font-mono text-[11px] uppercase tracking-wide text-brand-400">
              <span>Size</span>
              <span>SKU</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Active</span>
              <span></span>
            </div>
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.8fr_0.5fr] items-center gap-2 border-b border-brand-50 py-2">
                <input className="input" value={v.size} placeholder="Medium" onChange={(e) => updateVariant(i, { size: e.target.value })} />
                <input className="input font-mono" value={v.sku} placeholder="SKU" onChange={(e) => updateVariant(i, { sku: e.target.value })} />
                <input className="input" type="number" step="0.01" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} />
                <input className="input" type="number" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} />
                <input type="checkbox" checked={v.is_active} onChange={(e) => updateVariant(i, { is_active: e.target.checked })} />
                <button onClick={() => setVariants((vs) => vs.filter((_, idx) => idx !== i))} className="text-rose-500">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={addVariant}
          className="mt-3 rounded-lg border border-dashed border-brand-400 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          + Add size variant
        </button>
      </div>

      {/* related */}
      <div className="rounded-xl border border-brand-100 bg-white p-4">
        <div className="text-sm font-semibold text-brand-900">Related products</div>
        <p className="mb-3 mt-0.5 text-xs text-brand-400">Surfaced as “You may also like” on the storefront.</p>
        <div className="flex flex-wrap gap-2">
          {allProducts
            .filter((p) => String(p.id) !== id)
            .map((p) => {
              const on = relatedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    setRelatedIds((ids) => (on ? ids.filter((x) => x !== p.id) : [...ids, p.id]))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    on ? "border-brand-600 bg-brand-100 text-brand-700" : "border-brand-200 text-brand-600 hover:bg-brand-50"
                  }`}
                >
                  {on ? "✓ " : "+ "}
                  {p.name}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold text-brand-500">{children}</div>;
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4">
      <div className="mb-1.5 text-xs font-semibold text-brand-500">{title}</div>
      {children}
    </div>
  );
}
