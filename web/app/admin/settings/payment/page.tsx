"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import SettingsNav from "@/components/SettingsNav";
import type { PaymentSettings } from "@/lib/types";

type Tab = "bank" | "card" | "delivery";

export default function PaymentSettingsPage() {
  const [tab, setTab] = useState<Tab>("bank");
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<{ data: PaymentSettings }>("/admin/settings/payment")
      .then((res) => setSettings(res.data))
      .catch(() => {});
  }, []);

  function patch(p: Partial<PaymentSettings>) {
    setSettings((s) => (s ? { ...s, ...p } : s));
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api.put<{ data: PaymentSettings }>("/admin/settings/payment", settings);
      setSettings(res.data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function uploadQr(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingQr(true);
    try {
      const form = new FormData();
      form.append("image", files[0]);
      const res = await api.upload<{ data: PaymentSettings }>("/admin/settings/payment/qr", form);
      setSettings(res.data);
    } finally {
      setUploadingQr(false);
      if (qrRef.current) qrRef.current.value = "";
    }
  }

  async function removeQr() {
    if (!settings) return;
    const next = { ...settings, qr_path: null };
    setSettings(next);
    const res = await api.put<{ data: PaymentSettings }>("/admin/settings/payment", next);
    setSettings(res.data);
  }

  if (!settings) return <p className="text-brand-400">Loading…</p>;

  return (
    <div className="space-y-5">
      <SettingsNav />
      <div>
        <h1 className="font-serif text-2xl font-semibold text-brand-900">Payment settings</h1>
        <p className="mt-0.5 text-sm text-brand-400">
          Manage the bank account and fees shown to customers at checkout.
        </p>
      </div>

      {/* tabs */}
      <div className="flex gap-6 border-b border-brand-100">
        <Tab label="Bank transfer" active={tab === "bank"} onClick={() => setTab("bank")} />
        <Tab label="Card gateway" active={tab === "card"} onClick={() => setTab("card")} />
        <Tab label="Delivery fees" active={tab === "delivery"} onClick={() => setTab("delivery")} />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-1 basis-80 rounded-xl border border-brand-100 bg-white p-5">
          {tab === "bank" && (
            <>
              <div className="mb-3.5 flex items-center justify-between">
                <div className="text-sm font-semibold text-brand-900">Bank account details</div>
                <Toggle on={settings.bank_enabled} onChange={(v) => patch({ bank_enabled: v })} />
              </div>
              <Field label="Bank name">
                <input className="input" value={settings.bank_name ?? ""} onChange={(e) => patch({ bank_name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account number">
                  <input className="input font-mono" value={settings.account_number ?? ""} onChange={(e) => patch({ account_number: e.target.value })} />
                </Field>
                <Field label="Account name">
                  <input className="input" value={settings.account_name ?? ""} onChange={(e) => patch({ account_name: e.target.value })} />
                </Field>
              </div>
              <Field label="Payment instructions">
                <textarea className="input min-h-[64px]" value={settings.instructions ?? ""} onChange={(e) => patch({ instructions: e.target.value })} />
              </Field>

              <div className="mt-1">
                <span className="mb-1.5 block text-xs font-semibold text-brand-500">QR code (DuitNow / bank)</span>
                <p className="mb-2 text-xs text-brand-400">Customers scan this at checkout to pay. PNG, JPG or SVG.</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-28 w-28 flex-none items-center justify-center overflow-hidden rounded-lg border border-brand-100 bg-brand-50">
                    {settings.qr_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={settings.qr_path} alt="Payment QR" className="h-full w-full object-contain" />
                    ) : (
                      <span className="px-2 text-center text-xs text-brand-400">No QR yet</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => qrRef.current?.click()}
                      disabled={uploadingQr}
                      className="block rounded-lg border border-dashed border-brand-400 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      {uploadingQr ? "Uploading…" : settings.qr_path ? "Replace QR" : "＋ Upload QR"}
                    </button>
                    {settings.qr_path && (
                      <button type="button" onClick={removeQr} className="block text-xs font-semibold text-rose-500">
                        Remove
                      </button>
                    )}
                    <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadQr(e.target.files)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "card" && (
            <>
              <div className="mb-3.5 flex items-center justify-between">
                <div className="text-sm font-semibold text-brand-900">Card payments</div>
                <Toggle on={settings.card_enabled} onChange={(v) => patch({ card_enabled: v })} />
              </div>
              <p className="text-sm text-brand-500">
                When enabled, customers can pay instantly by card at checkout. (Gateway keys are
                managed via environment configuration.)
              </p>
            </>
          )}

          {tab === "delivery" && (
            <>
              <div className="mb-1 text-sm font-semibold text-brand-900">Delivery options</div>
              <p className="mb-3.5 text-xs text-brand-400">Tick the options offered at checkout and set each fee.</p>
              <div className="space-y-2.5">
                <DeliveryRow
                  label="Standard — next day"
                  enabled={settings.delivery_standard_enabled}
                  onToggle={(v) => patch({ delivery_standard_enabled: v })}
                  fee={settings.fee_standard}
                  onFee={(v) => patch({ fee_standard: v })}
                />
                <DeliveryRow
                  label="Same-day (order before 2pm)"
                  enabled={settings.delivery_same_day_enabled}
                  onToggle={(v) => patch({ delivery_same_day_enabled: v })}
                  fee={settings.fee_same_day}
                  onFee={(v) => patch({ fee_same_day: v })}
                />
                <DeliveryRow
                  label="Self-pickup at store"
                  enabled={settings.delivery_pickup_enabled}
                  onToggle={(v) => patch({ delivery_pickup_enabled: v })}
                  fee={settings.fee_pickup}
                  onFee={(v) => patch({ fee_pickup: v })}
                />
              </div>

              {/* Dynamic courier pricing */}
              <div className="mt-5 border-t border-brand-100 pt-4">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-sm font-semibold text-brand-900">Courier delivery (Grab / Lalamove)</div>
                  <Toggle on={settings.delivery_courier_enabled ?? false} onChange={(v) => patch({ delivery_courier_enabled: v })} />
                </div>
                <p className="mb-3 text-xs text-brand-400">
                  Priced by driving distance to the customer. We quote both couriers and charge the cheaper.
                  Distance uses the Google Distance Matrix API when <code className="font-mono">GOOGLE_MAPS_API_KEY</code> is
                  set, otherwise the fallback distance below.
                </p>

                <Field label="Store pickup address (distance origin)">
                  <input
                    className="input"
                    value={settings.store_address ?? ""}
                    onChange={(e) => patch({ store_address: e.target.value })}
                    placeholder="12 Jalan Bunga, 50000 Kuala Lumpur"
                  />
                </Field>

                <div className="mb-1 text-xs font-semibold text-brand-500">Pricing formula: max(min fee, base + per-km × distance)</div>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Lalamove base fee" value={settings.lalamove_base_fee} onChange={(v) => patch({ lalamove_base_fee: v })} />
                  <NumField label="Lalamove per km" value={settings.lalamove_per_km} onChange={(v) => patch({ lalamove_per_km: v })} />
                  <NumField label="Grab base fee" value={settings.grab_base_fee} onChange={(v) => patch({ grab_base_fee: v })} />
                  <NumField label="Grab per km" value={settings.grab_per_km} onChange={(v) => patch({ grab_per_km: v })} />
                  <NumField label="Minimum fee" value={settings.courier_min_fee} onChange={(v) => patch({ courier_min_fee: v })} />
                  <NumField label="Fallback distance (km)" value={settings.courier_default_km} onChange={(v) => patch({ courier_default_km: v })} />
                </div>
              </div>
            </>
          )}

          <div className="mt-4 flex items-center justify-end gap-3">
            {saved && <span className="text-xs text-emerald-600">Saved ✓</span>}
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        {/* live preview */}
        <div className="w-full flex-none rounded-xl border border-brand-100 bg-mist p-4 md:w-64">
          <div className="mb-2.5 text-xs font-semibold text-brand-500">Customer sees</div>
          <div className="rounded-lg border border-brand-100 bg-white p-3.5">
            {settings.bank_enabled ? (
              <>
                <div className="mb-2 text-sm font-semibold text-brand-800">Transfer to</div>
                <Preview label="Bank" value={settings.bank_name || "—"} />
                <Preview label="Account no." value={settings.account_number || "—"} mono />
                <Preview label="Account name" value={settings.account_name || "—"} />
                {settings.qr_path && (
                  <div className="mt-2 border-t border-brand-100 pt-2.5">
                    <div className="mb-1.5 text-[10px] uppercase tracking-wide text-brand-400">Scan to pay</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.qr_path} alt="Payment QR" className="h-28 w-28 rounded-md border border-brand-100 object-contain" />
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-brand-400">Bank transfer is disabled.</p>
            )}
          </div>
          <p className="mt-2.5 font-mono text-[11px] leading-relaxed text-brand-400">
            Saved values feed the checkout bank-transfer panel live.
          </p>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold ${
        active ? "border-brand-600 text-brand-700" : "border-transparent text-brand-400"
      }`}
    >
      {label}
    </button>
  );
}

function DeliveryRow({
  label,
  enabled,
  onToggle,
  fee,
  onFee,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  fee: number;
  onFee: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-100 px-3.5 py-2.5">
      <span className={`flex-1 text-sm font-medium ${enabled ? "text-brand-800" : "text-brand-400"}`}>{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-brand-400">$</span>
        <input
          className="input w-24"
          type="number"
          step="0.01"
          value={fee}
          disabled={!enabled}
          onChange={(e) => onFee(Number(e.target.value))}
        />
      </div>
      <Toggle on={enabled} onChange={onToggle} />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number | string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-brand-500">{label}</span>
      <input
        className="input"
        type="number"
        step="0.01"
        min="0"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
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

function Preview({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] uppercase tracking-wide text-brand-400">{label}</div>
      <div className={`text-xs font-semibold text-brand-800 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
