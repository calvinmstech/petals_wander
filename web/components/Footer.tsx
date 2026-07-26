import Link from "next/link";

type FooterLink = { label: string; href?: string };
const COLUMNS: { title: string; links: FooterLink[] }[] = [
  { title: "Shop", links: [{ label: "Bouquets" }, { label: "Plants" }, { label: "Gifts" }] },
  {
    title: "Help",
    links: [{ label: "Delivery", href: "/delivery" }, { label: "Returns" }, { label: "FAQ" }],
  },
  { title: "Company", links: [{ label: "About" }, { label: "Contact" }, { label: "Stores" }] },
];

export default function Footer() {
  return (
    <footer className="border-t border-brand-100 bg-haze">
      {/* Newsletter */}
      <div className="border-b border-brand-100 px-4 py-8 text-center">
        <p className="font-semibold text-brand-900">Join our newsletter</p>
        <form className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2.5">
          <input className="input min-w-[240px] flex-1" placeholder="your@email.com" />
          <button
            type="submit"
            className="rounded-lg bg-brand-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
          >
            Subscribe
          </button>
        </form>
      </div>

      {/* Columns */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4">
        <div>
          <div className="font-serif text-lg font-semibold text-brand-900">Petals Wander</div>
          <p className="mt-1.5 text-xs text-brand-400">Flowers for every moment.</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="mb-2 text-xs font-semibold text-brand-900">{col.title}</div>
            <ul className="space-y-1.5 text-xs text-brand-400">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href ?? "/shop"} className="hover:text-brand-600">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
