// Scrolling announcement bar for the storefront. The text is duplicated so the
// CSS translateX(-50%) loop is seamless; hovering pauses it (see globals.css).
export default function Marquee({ text }: { text: string }) {
  return (
    <div className="marquee overflow-hidden border-b border-brand-100 bg-brand-800 py-2 text-white">
      <div className="marquee-track">
        <MarqueeCopy text={text} />
        <MarqueeCopy text={text} aria-hidden />
      </div>
    </div>
  );
}

function MarqueeCopy({ text, ...rest }: { text: string } & React.HTMLAttributes<HTMLSpanElement>) {
  // min-w-full makes each copy span at least the bar width, so the two-copy
  // translateX(-50%) loop stays seamless even for short announcements.
  return (
    <span
      className="flex min-w-full shrink-0 items-center justify-center whitespace-nowrap px-4 text-sm font-medium tracking-wide"
      {...rest}
    >
      {text}
    </span>
  );
}
