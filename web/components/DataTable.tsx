import React from "react";

export type Column<T> = {
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Grid fraction, e.g. "1.3fr" — combined into grid-template-columns. */
  width?: string;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  minWidth?: number;
  empty?: React.ReactNode;
};

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  minWidth = 560,
  empty = "Nothing here yet.",
}: Props<T>) {
  const template = columns.map((c) => c.width ?? "1fr").join(" ");

  return (
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-white">
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          {/* head */}
          <div
            className="grid gap-2 border-b border-brand-100 bg-brand-50 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-brand-400"
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((c, i) => (
              <span key={i} className={c.className}>
                {c.header}
              </span>
            ))}
          </div>
          {/* body */}
          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-brand-400">{empty}</div>
          ) : (
            rows.map((row) => (
              <div
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`grid items-center gap-2 border-b border-brand-50 px-4 py-3 text-sm text-brand-800 last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-brand-50/60" : ""
                }`}
                style={{ gridTemplateColumns: template }}
              >
                {columns.map((c, i) => (
                  <span key={i} className={`min-w-0 truncate ${c.className ?? ""}`}>
                    {c.cell(row)}
                  </span>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
