// Botanical line-art mark for Petal Wanders (matches the studio logo style).
export default function Logo({
  className = "h-7 w-7",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M24 44 C24 32 24 20 24 8" />
      <path d="M24 16 C18 14 13 16 11 21 C17 22 22 20 24 16 Z" />
      <path d="M24 16 C30 14 35 16 37 21 C31 22 26 20 24 16 Z" />
      <path d="M24 26 C19 25 15 27 13 31 C18 32 22 30 24 26 Z" />
      <path d="M24 26 C29 25 33 27 35 31 C30 32 26 30 24 26 Z" />
      <circle cx="24" cy="7" r="2.2" />
    </svg>
  );
}
