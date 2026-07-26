// Pill for order / product status. Maps each status to a soft colour.

const MAP: Record<string, string> = {
  // order statuses
  awaiting_payment: "bg-amber-100 text-amber-700",
  pending: "bg-brand-100 text-brand-700",
  paid: "bg-emerald-100 text-emerald-700",
  shipped: "bg-sky-100 text-sky-700",
  ready: "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-600",
  refunded: "bg-rose-100 text-rose-600",
  // product statuses
  active: "bg-emerald-100 text-emerald-700",
  low: "bg-amber-100 text-amber-700",
  out: "bg-rose-100 text-rose-600",
  hidden: "bg-gray-100 text-gray-500",
};

const LABELS: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  ready: "Order ready",
};

export default function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase();
  const tone = MAP[key] ?? "bg-brand-100 text-brand-600";
  const label = LABELS[key] ?? status.replace(/_/g, " ");
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tone}`}
    >
      {label}
    </span>
  );
}
