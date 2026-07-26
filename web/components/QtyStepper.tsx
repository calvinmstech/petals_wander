"use client";

export default function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1.5" : "px-3.5 py-2.5";
  const set = (n: number) => {
    if (n < min) n = min;
    if (max !== undefined && n > max) n = max;
    onChange(n);
  };

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-brand-200">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => set(value - 1)}
        className={`${pad} text-brand-600 hover:bg-brand-50`}
      >
        −
      </button>
      <span
        className={`border-x border-brand-100 font-semibold ${
          size === "sm" ? "px-2.5 py-1.5 text-sm" : "px-3 py-2.5"
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => set(value + 1)}
        className={`${pad} text-brand-600 hover:bg-brand-50`}
      >
        +
      </button>
    </div>
  );
}
