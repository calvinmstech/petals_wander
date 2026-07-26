// "Fly to cart" animation — clones the product image and arcs it from the
// source element up to the navbar cart icon (the element with id="cart-target").
// Purely cosmetic and self-cleaning; safe to call on every add-to-cart.

export function flyToCart(source: HTMLElement | null, imageSrc?: string | null): void {
  if (typeof window === "undefined" || !source || !imageSrc) return;

  const target = document.getElementById("cart-target");
  if (!target) return;

  // Respect users who prefer reduced motion.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return;

  const size = Math.min(96, Math.max(56, from.width));
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const dx = to.left + to.width / 2 - (startX + size / 2);
  const dy = to.top + to.height / 2 - (startY + size / 2);

  const clone = document.createElement("img");
  clone.src = imageSrc;
  clone.alt = "";
  clone.style.cssText = [
    "position:fixed",
    `left:${startX}px`,
    `top:${startY}px`,
    `width:${size}px`,
    `height:${size}px`,
    "object-fit:cover",
    "border-radius:14px",
    "box-shadow:0 10px 30px rgba(46,66,87,0.28)",
    "z-index:60",
    "pointer-events:none",
    "will-change:transform,opacity",
  ].join(";");
  document.body.appendChild(clone);

  const anim = clone.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1, offset: 0 },
      {
        // lift through an arc midpoint
        transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(0.7)`,
        opacity: 0.95,
        offset: 0.55,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(0.12)`,
        opacity: 0.2,
        offset: 1,
      },
    ],
    { duration: 750, easing: "cubic-bezier(0.45, 0, 0.55, 1)" }
  );

  anim.onfinish = () => clone.remove();
  anim.oncancel = () => clone.remove();
}
