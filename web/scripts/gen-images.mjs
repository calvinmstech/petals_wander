// Generates soft dusty-blue bouquet illustrations (SVG) for the hero banner and
// product cards. Pure vector — no external assets. Run: node scripts/gen-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const C = {
  navy: "#33485f",
  dusty: "#7d9fbc",
  dustyDark: "#5d809f",
  powder: "#b8cde0",
  pale: "#dce8f1",
  paler: "#eaf1f7",
  white: "#fbfcfe",
  cream: "#f3efe8",
  sage: "#a9bdac",
  sageDark: "#8aa48f",
  ribbon: "#7ea3c4",
  ctrBlue: "#9bb6d2",
  ctrGold: "#e7dcc2",
};

function flower(cx, cy, r, petal, ctr, petals = 11) {
  let s = `<g transform="translate(${cx},${cy})">`;
  s += `<g fill="${petal}">`;
  for (let i = 0; i < petals; i++) {
    const a = ((360 / petals) * i).toFixed(1);
    s += `<ellipse rx="${(r * 0.6).toFixed(1)}" ry="${(r * 0.3).toFixed(1)}" cx="${(r * 0.72).toFixed(1)}" cy="0" transform="rotate(${a})"/>`;
  }
  s += `</g><circle r="${(r * 0.34).toFixed(1)}" fill="${ctr}"/></g>`;
  return s;
}

// little berry/filler cluster
function filler(cx, cy, color) {
  let s = `<g fill="${color}">`;
  const pts = [[0, 0], [10, -6], [-9, -5], [6, 8], [-7, 7], [14, 4]];
  for (const [dx, dy] of pts) s += `<circle cx="${cx + dx}" cy="${cy + dy}" r="4.2"/>`;
  return s + `</g>`;
}

function leaf(cx, cy, a, color, len = 46) {
  return `<g transform="translate(${cx},${cy}) rotate(${a})"><path d="M0 0 Q ${len * 0.45} -13 ${len} 0 Q ${len * 0.45} 13 0 0 Z" fill="${color}"/><line x1="2" y1="0" x2="${len - 4}" y2="0" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/></g>`;
}

function bouquet({ w = 600, h = 600, bg, wrap, wrapShade, ribbon, blooms, leafColor = C.sage }) {
  const cx = w / 2;
  const bottom = h - 40;
  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  // backdrop
  svg += `<defs><radialGradient id="bgg" cx="50%" cy="42%" r="70%">`;
  svg += `<stop offset="0%" stop-color="${C.white}"/><stop offset="100%" stop-color="${bg}"/></radialGradient></defs>`;
  svg += `<rect width="${w}" height="${h}" rx="28" fill="url(#bgg)"/>`;

  // greenery fan behind
  const topY = h * 0.46;
  svg += leaf(cx - 70, topY - 10, 196, leafColor, 70);
  svg += leaf(cx + 70, topY - 10, -16, leafColor, 70);
  svg += leaf(cx - 40, topY - 55, 232, C.sageDark, 60);
  svg += leaf(cx + 40, topY - 55, -52, C.sageDark, 60);
  svg += leaf(cx, topY - 70, 270, leafColor, 56);

  // wrapping cone
  svg += `<path d="M${cx - 150},${topY + 6} L${cx + 150},${topY + 6} L${cx + 56},${bottom} L${cx - 56},${bottom} Z" fill="${wrap}"/>`;
  svg += `<path d="M${cx - 150},${topY + 6} L${cx},${topY + 18} L${cx - 56},${bottom} Z" fill="${wrapShade}" opacity="0.55"/>`;
  svg += `<path d="M${cx + 150},${topY + 6} L${cx},${topY + 18} L${cx + 56},${bottom} Z" fill="${C.white}" opacity="0.18"/>`;

  // blooms cluster
  for (const b of blooms) {
    svg += flower(cx + b.x, topY + b.y, b.r, b.petal, b.ctr, b.petals ?? 11);
  }
  // a couple of fillers
  svg += filler(cx - 92, topY - 6, C.pale);
  svg += filler(cx + 96, topY + 4, C.pale);

  // ribbon knot
  svg += `<g transform="translate(${cx},${bottom - 4})" fill="${ribbon}">`;
  svg += `<path d="M0,0 L-46,-18 L-40,18 Z"/><path d="M0,0 L46,-18 L40,18 Z"/><circle r="9"/></g>`;

  svg += `</svg>`;
  return svg;
}

// Bloom palettes per product
const blue = (x, y, r = 40) => ({ x, y, r, petal: C.powder, ctr: C.ctrBlue });
const dust = (x, y, r = 40) => ({ x, y, r, petal: C.dusty, ctr: C.ctrBlue });
const whiteRose = (x, y, r = 42) => ({ x, y, r, petal: C.white, ctr: C.ctrGold, petals: 13 });

const products = {
  "hydrangea-bouquet": {
    bg: C.pale, wrap: C.powder, wrapShade: C.dusty, ribbon: C.ribbon,
    blooms: [blue(-58, 8, 52), blue(56, 14, 48), whiteRose(-6, -42, 40), blue(0, 56, 40), whiteRose(70, -24, 34)],
  },
  "white-rose-elegance": {
    bg: C.cream, wrap: C.paler, wrapShade: C.pale, ribbon: C.dusty,
    blooms: [whiteRose(-54, 6, 50), whiteRose(54, 12, 48), whiteRose(0, -44, 44), whiteRose(-8, 56, 40), blue(72, -20, 30)],
  },
  "calm-blue-posy": {
    bg: C.paler, wrap: C.pale, wrapShade: C.powder, ribbon: C.ribbon,
    blooms: [dust(-50, 8, 46), whiteRose(48, 10, 44), blue(-2, -40, 42), whiteRose(-58, -30, 32), dust(60, -34, 32)],
  },
  "eucalyptus-blooms": {
    bg: C.paler, wrap: C.paler, wrapShade: C.pale, ribbon: C.sageDark, leafColor: C.sage,
    blooms: [whiteRose(-44, 10, 46), whiteRose(50, 16, 44), blue(2, -38, 38), whiteRose(64, -26, 30)],
  },
  "serene-white-lilies": {
    bg: C.cream, wrap: C.white, wrapShade: C.pale, ribbon: C.dusty,
    blooms: [whiteRose(-50, 4, 54), whiteRose(52, 12, 50), whiteRose(2, -46, 46), whiteRose(-4, 58, 38)],
  },
  "dusty-blue-delight": {
    bg: C.pale, wrap: C.dusty, wrapShade: C.dustyDark, ribbon: C.dustyDark,
    blooms: [dust(-56, 8, 50), dust(54, 14, 48), dust(0, -42, 44), whiteRose(-10, 56, 36), blue(70, -22, 32)],
  },
  "powder-blue-roses": {
    bg: C.paler, wrap: C.powder, wrapShade: C.dusty, ribbon: C.ribbon,
    blooms: [blue(-52, 6, 50), whiteRose(52, 12, 46), blue(0, -42, 44), blue(-6, 56, 38), whiteRose(70, -22, 32)],
  },
  "sympathy-in-white": {
    bg: C.paler, wrap: C.white, wrapShade: C.pale, ribbon: C.sageDark, leafColor: C.sage,
    blooms: [whiteRose(-52, 6, 50), whiteRose(54, 12, 48), whiteRose(0, -44, 46), whiteRose(-8, 56, 38)],
  },
  placeholder: {
    bg: C.paler, wrap: C.pale, wrapShade: C.powder, ribbon: C.ribbon,
    blooms: [blue(-44, 8, 46), whiteRose(48, 12, 44), blue(2, -38, 38)],
  },
};

mkdirSync("public/images/products", { recursive: true });

for (const [slug, cfg] of Object.entries(products)) {
  writeFileSync(`public/images/products/${slug}.svg`, bouquet(cfg));
}

// Hero — larger, lusher bouquet on an airy gradient
const hero = bouquet({
  w: 680,
  h: 600,
  bg: C.pale,
  wrap: C.powder,
  wrapShade: C.dusty,
  ribbon: C.ribbon,
  blooms: [
    blue(-78, 10, 58), blue(70, 20, 54), whiteRose(-8, -52, 50),
    whiteRose(-66, -34, 38), dust(64, -42, 38), blue(2, 66, 44), whiteRose(96, -8, 34),
  ],
});
writeFileSync("public/images/hero-bouquet.svg", hero);

console.log("Generated", Object.keys(products).length, "product images + hero");
