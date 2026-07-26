// Simple client-side cart persisted in localStorage. Emits a window event so the
// navbar badge stays in sync. A line is keyed by product + chosen size variant,
// so the same product in two sizes is two lines.

export type CartItem = {
  product_id: number;
  variant_id?: number | null;
  variant_label?: string | null;
  name: string;
  slug: string;
  price: number;
  image_path?: string | null;
  quantity: number;
};

const KEY = "fw_cart";
export const CART_EVENT = "fw_cart_changed";

// Unique key for a cart line (product + variant).
function lineKey(productId: number, variantId?: number | null): string {
  return `${productId}:${variantId ?? ""}`;
}

function keyOf(item: Pick<CartItem, "product_id" | "variant_id">): string {
  return lineKey(item.product_id, item.variant_id);
}

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

function write(items: CartItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export const cart = {
  items: read,

  count(): number {
    return read().reduce((n, i) => n + i.quantity, 0);
  },

  subtotal(): number {
    return read().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  add(item: Omit<CartItem, "quantity">, quantity = 1): void {
    const items = read();
    const existing = items.find((i) => keyOf(i) === keyOf(item));
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ ...item, quantity });
    }
    write(items);
  },

  setQuantity(productId: number, quantity: number, variantId?: number | null): void {
    let items = read();
    const k = lineKey(productId, variantId);
    if (quantity <= 0) {
      items = items.filter((i) => keyOf(i) !== k);
    } else {
      const item = items.find((i) => keyOf(i) === k);
      if (item) item.quantity = quantity;
    }
    write(items);
  },

  remove(productId: number, variantId?: number | null): void {
    const k = lineKey(productId, variantId);
    write(read().filter((i) => keyOf(i) !== k));
  },

  clear(): void {
    write([]);
  },
};
