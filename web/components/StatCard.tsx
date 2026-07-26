export default function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: string;
}) {
  const down = delta?.startsWith("−") || delta?.startsWith("-");
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4">
      <p className="text-xs text-brand-400">{label}</p>
      <p className="mt-1.5 font-serif text-3xl font-semibold text-brand-900">{value}</p>
      {delta && (
        <p className={`mt-1 text-xs font-semibold ${down ? "text-rose-500" : "text-brand-600"}`}>
          {delta}
        </p>
      )}
    </div>
  );
}
