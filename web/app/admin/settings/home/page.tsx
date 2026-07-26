"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import SettingsNav from "@/components/SettingsNav";
import type { HomeSettings, ValueProp } from "@/lib/types";

export default function HomeSettingsPage() {
  const [s, setS] = useState<HomeSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const heroRef = useRef<HTMLInputElement>(null);
  const promoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<{ data: HomeSettings }>("/admin/settings/home")
      .then((res) => setS(res.data))
      .catch(() => {});
  }, []);

  function patch(p: Partial<HomeSettings>) {
    setS((cur) => (cur ? { ...cur, ...p } : cur));
    setSaved(false);
  }

  function setProp(i: number, p: Partial<ValueProp>) {
    setS((cur) => {
      if (!cur) return cur;
      const props = [...(cur.value_props ?? [])];
      props[i] = { ...props[i], ...p };
      return { ...cur, value_props: props };
    });
    setSaved(false);
  }

  async function uploadImage(slot: "hero" | "promo", files: FileList | null) {
    if (!files || files.length === 0) return;
    const form = new FormData();
    form.append("slot", slot);
    form.append("image", files[0]);
    const res = await api.upload<{ data: HomeSettings }>("/admin/settings/home/image", form);
    setS(res.data);
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      const res = await api.put<{ data: HomeSettings }>("/admin/settings/home", {
        hero_eyebrow: s.hero_eyebrow,
        hero_title: s.hero_title,
        hero_subtitle: s.hero_subtitle,
        hero_cta_label: s.hero_cta_label,
        hero_cta_href: s.hero_cta_href,
        promo_eyebrow: s.promo_eyebrow,
        promo_title: s.promo_title,
        promo_subtitle: s.promo_subtitle,
        promo_cta_label: s.promo_cta_label,
        promo_cta_href: s.promo_cta_href,
        value_props: s.value_props ?? [],
        delivery_care: s.delivery_care,
        delivery_terms: s.delivery_terms,
        marquee_enabled: s.marquee_enabled ?? false,
        marquee_text: s.marquee_text,
        whatsapp_number: s.whatsapp_number,
      });
      setS(res.data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!s) return <p className="text-brand-400">Loading…</p>;

  const props = s.value_props ?? [];

  return (
    <div className="space-y-5">
      <SettingsNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-brand-900">Home page</h1>
          <p className="mt-0.5 text-sm text-brand-400">Edit the storefront hero, promo banner and value props.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-600">Saved ✓</span>}
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Announcements & contact */}
      <Card title="Announcement bar & WhatsApp">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-brand-500">Show announcement marquee</span>
          <Toggle on={s.marquee_enabled ?? false} onChange={(v) => patch({ marquee_enabled: v })} />
        </div>
        <Field label="Marquee text">
          <input
            className="input"
            placeholder="Free same-day delivery on orders before 2pm 🌸"
            value={s.marquee_text ?? ""}
            onChange={(e) => patch({ marquee_text: e.target.value })}
          />
        </Field>
        <p className="mb-4 text-xs text-brand-400">Scrolls across the top of the home page when enabled.</p>
        <Field label="WhatsApp number">
          <input
            className="input"
            placeholder="60123456789 (country code, no + or spaces)"
            value={s.whatsapp_number ?? ""}
            onChange={(e) => patch({ whatsapp_number: e.target.value })}
          />
        </Field>
        <p className="text-xs text-brand-400">
          Shows a floating WhatsApp button on the home page. Leave empty to hide it.
        </p>
      </Card>

      {/* Hero */}
      <Card title="Hero">
        <ImageRow
          label="Hero image"
          src={s.hero_image}
          onPick={() => heroRef.current?.click()}
          inputRef={heroRef}
          onChange={(f) => uploadImage("hero", f)}
        />
        <Field label="Eyebrow"><input className="input" value={s.hero_eyebrow ?? ""} onChange={(e) => patch({ hero_eyebrow: e.target.value })} /></Field>
        <Field label="Title"><input className="input" value={s.hero_title ?? ""} onChange={(e) => patch({ hero_title: e.target.value })} /></Field>
        <Field label="Subtitle"><textarea className="input min-h-[60px]" value={s.hero_subtitle ?? ""} onChange={(e) => patch({ hero_subtitle: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Button label"><input className="input" value={s.hero_cta_label ?? ""} onChange={(e) => patch({ hero_cta_label: e.target.value })} /></Field>
          <Field label="Button link"><input className="input" placeholder="/shop" value={s.hero_cta_href ?? ""} onChange={(e) => patch({ hero_cta_href: e.target.value })} /></Field>
        </div>
      </Card>

      {/* Promo */}
      <Card title="Promo banner">
        <ImageRow
          label="Promo image"
          src={s.promo_image}
          onPick={() => promoRef.current?.click()}
          inputRef={promoRef}
          onChange={(f) => uploadImage("promo", f)}
        />
        <Field label="Eyebrow"><input className="input" value={s.promo_eyebrow ?? ""} onChange={(e) => patch({ promo_eyebrow: e.target.value })} /></Field>
        <Field label="Title"><input className="input" value={s.promo_title ?? ""} onChange={(e) => patch({ promo_title: e.target.value })} /></Field>
        <Field label="Subtitle"><textarea className="input min-h-[60px]" value={s.promo_subtitle ?? ""} onChange={(e) => patch({ promo_subtitle: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Button label"><input className="input" value={s.promo_cta_label ?? ""} onChange={(e) => patch({ promo_cta_label: e.target.value })} /></Field>
          <Field label="Button link"><input className="input" placeholder="/shop" value={s.promo_cta_href ?? ""} onChange={(e) => patch({ promo_cta_href: e.target.value })} /></Field>
        </div>
      </Card>

      {/* Value props */}
      <Card title="Value props">
        <p className="mb-3 text-xs text-brand-400">The small feature strip below the promo banner.</p>
        <div className="space-y-2.5">
          {props.map((vp, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2.5">
              <input className="input min-w-[160px] flex-1" placeholder="Title" value={vp.title} onChange={(e) => setProp(i, { title: e.target.value })} />
              <input className="input min-w-[160px] flex-1" placeholder="Subtitle" value={vp.sub ?? ""} onChange={(e) => setProp(i, { sub: e.target.value })} />
              <button
                onClick={() => patch({ value_props: props.filter((_, idx) => idx !== i) })}
                className="text-lg text-rose-500"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {props.length < 6 && (
          <button
            onClick={() => patch({ value_props: [...props, { title: "", sub: "" }] })}
            className="mt-3 rounded-lg border border-dashed border-brand-400 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          >
            + Add value prop
          </button>
        )}
      </Card>

      {/* Product page */}
      <Card title="Product page">
        <Field label="“Delivery & care” text">
          <textarea
            className="input min-h-[70px]"
            placeholder="Shown in the Delivery & care section on every product page."
            value={s.delivery_care ?? ""}
            onChange={(e) => patch({ delivery_care: e.target.value })}
          />
        </Field>
      </Card>

      {/* Checkout */}
      <Card title="Checkout">
        <Field label="Delivery terms &amp; conditions">
          <textarea
            className="input min-h-[120px]"
            placeholder="Shown on checkout; customers must tick to accept before placing an order."
            value={s.delivery_terms ?? ""}
            onChange={(e) => patch({ delivery_terms: e.target.value })}
          />
        </Field>
        <p className="text-xs text-brand-400">Customers must agree to this before they can place an order.</p>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-5">
      <div className="mb-3 text-sm font-semibold text-brand-900">{title}</div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex items-center gap-2 text-xs font-medium text-brand-600"
    >
      {on ? "Enabled" : "Disabled"}
      <span className={`relative inline-block h-5 w-9 rounded-full transition ${on ? "bg-brand-600" : "bg-brand-200"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? "right-0.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-xs font-semibold text-brand-500">{label}</span>
      {children}
    </label>
  );
}

function ImageRow({
  label,
  src,
  onPick,
  inputRef,
  onChange,
}: {
  label: string;
  src?: string | null;
  onPick: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-xs font-semibold text-brand-500">{label}</span>
      <div className="flex items-center gap-3">
        <div className="h-20 w-32 overflow-hidden rounded-lg border border-brand-100 bg-brand-50">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-brand-400">No image</div>
          )}
        </div>
        <button
          type="button"
          onClick={onPick}
          className="rounded-lg border border-dashed border-brand-400 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          ＋ Upload
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files)} />
      </div>
    </div>
  );
}
