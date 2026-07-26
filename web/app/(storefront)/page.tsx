"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { ButtonLink } from "@/components/Button";
import Marquee from "@/components/Marquee";
import type { Category, HomeSettings, Paginated, Product } from "@/lib/types";

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [home, setHome] = useState<HomeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Paginated<Product>>("/products?featured=true&per_page=4"),
      api.get<{ data: Category[] }>("/categories?home=true"),
      api.get<{ data: HomeSettings }>("/settings/home"),
    ])
      .then(([p, c, h]) => {
        setFeatured(p.data);
        setCategories(c.data);
        setHome(h.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const valueProps = home?.value_props ?? [];

  return (
    <div>
      {/* Announcement marquee (editable in admin → Settings → Home) */}
      {home?.marquee_enabled && home.marquee_text?.trim() && (
        <Marquee text={home.marquee_text.trim()} />
      )}

      {/* Hero — image with a soft left-to-right overlay so the copy stays readable */}
      <section className="relative overflow-hidden border-b border-brand-100">
        {home?.hero_image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={home.hero_image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[70%_35%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/10 md:to-transparent" />
          </>
        )}
        {!home?.hero_image && <div className="absolute inset-0 bg-haze" />}

        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-xl">
            {home?.hero_eyebrow && (
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
                {home.hero_eyebrow}
              </div>
            )}
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-brand-700 sm:text-5xl">
              {home?.hero_title ?? "Flowers for calm moments & gifting"}
            </h1>
            {home?.hero_subtitle && (
              <p className="mt-4 max-w-md text-brand-600">{home.hero_subtitle}</p>
            )}
            <ButtonLink href={home?.hero_cta_href || "/shop"} className="mt-7">
              {home?.hero_cta_label || "Shop the collection"}
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {/* Category tiles */}
        <section>
          <SectionHead eyebrow="Browse" title="Shop by category" sub="Find the perfect arrangement for any moment." />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(categories.length ? categories : Array.from({ length: 4 })).map((c, i) => {
              const cat = c as Category | undefined;
              return (
                <Link
                  key={cat?.id ?? i}
                  href={cat ? `/shop?category=${cat.slug}` : "/shop"}
                  className="group relative block h-28 overflow-hidden rounded-lg border border-brand-200"
                >
                  {cat?.image_path ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cat.image_path}
                      alt={cat.name}
                      className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-100 to-brand-300 transition group-hover:scale-105" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-900/60 to-transparent pb-2 pt-6 text-center text-sm font-semibold text-white">
                    {cat?.name ?? "—"}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Featured products */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <SectionHead eyebrow="Most loved" title="Featured bouquets" sub="Our florists' picks this week." />
            <Link href="/shop" className="whitespace-nowrap text-sm font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          {loading ? (
            <p className="text-brand-400">Loading flowers…</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* Promo banner */}
        <section className="overflow-hidden rounded-xl border border-brand-100">
          <div className="flex flex-wrap">
            <div className="min-h-[200px] flex-1 basis-60 overflow-hidden">
              {home?.promo_image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={home.promo_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-brand-200 to-brand-400" />
              )}
            </div>
            <div className="flex flex-1 basis-64 flex-col justify-center bg-haze px-8 py-8">
              {home?.promo_eyebrow && (
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
                  {home.promo_eyebrow}
                </div>
              )}
              <h3 className="mt-2 font-serif text-2xl font-semibold text-brand-900">
                {home?.promo_title ?? "Small, medium or large."}
              </h3>
              {home?.promo_subtitle && (
                <p className="mt-2 text-sm leading-relaxed text-brand-600">{home.promo_subtitle}</p>
              )}
              <ButtonLink href={home?.promo_cta_href || "/shop"} size="sm" className="mt-4 self-start">
                {home?.promo_cta_label || "Explore collections"}
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* Value props */}
        {valueProps.length > 0 && (
          <section className="grid gap-px overflow-hidden rounded-xl border border-brand-100 bg-brand-100 sm:grid-cols-3">
            {valueProps.map((v, i) => (
              <div key={i} className="bg-mist px-6 py-5">
                <div className="text-sm font-semibold text-brand-900">{v.title}</div>
                {v.sub && <div className="mt-1 text-xs text-brand-400">{v.sub}</div>}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{eyebrow}</div>
      <h2 className="mt-1 font-serif text-2xl font-semibold text-brand-900">{title}</h2>
      {sub && <p className="mt-1 text-sm text-brand-400">{sub}</p>}
    </div>
  );
}
