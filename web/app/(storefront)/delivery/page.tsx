"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { HomeSettings } from "@/lib/types";

export default function DeliveryTermsPage() {
  const [settings, setSettings] = useState<HomeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: HomeSettings }>("/settings/home")
      .then((res) => setSettings(res.data))
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const care = settings?.delivery_care?.trim() ?? "";
  const terms = settings?.delivery_terms?.trim() ?? "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-4 text-xs text-brand-400">
        <Link href="/" className="hover:text-brand-600">
          Home
        </Link>{" "}
        / <span className="text-brand-600">Delivery &amp; terms</span>
      </nav>

      <h1 className="font-serif text-3xl font-semibold text-brand-900">Delivery &amp; terms</h1>
      <p className="mt-1.5 text-sm text-brand-400">
        How we deliver your flowers and the terms that apply to every order.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-brand-400">Loading…</p>
      ) : (
        <div className="mt-8 space-y-8">
          <Section title="Delivery & care">
            {care !== "" ? (
              <TextBlock text={care} />
            ) : (
              <p className="text-sm leading-relaxed text-brand-600">
                We deliver across the Klang Valley by trusted couriers (Grab / Lalamove). Delivery
                fees are calculated from the distance to your address at checkout, and we always book
                the cheaper courier for you. Self-pickup at our studio is also available.
              </p>
            )}
          </Section>

          <Section title="Terms & conditions">
            {terms !== "" ? (
              <TextBlock text={terms} />
            ) : (
              <p className="text-sm leading-relaxed text-brand-600">
                Our full delivery terms &amp; conditions will appear here. Please contact us if you
                have any questions about a specific order.
              </p>
            )}
          </Section>

          <div className="rounded-xl border border-brand-100 bg-mist p-5 text-sm text-brand-600">
            Ready to order?{" "}
            <Link href="/shop" className="font-semibold text-brand-700 hover:text-brand-900">
              Browse the shop →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-xl font-semibold text-brand-900">{title}</h2>
      {children}
    </section>
  );
}

function TextBlock({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-brand-600">{text}</div>
  );
}
