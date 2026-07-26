export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_path?: string | null;
  show_on_home?: boolean;
  products_count?: number;
  is_active?: boolean;
};

export type ProductImage = {
  id: number;
  path: string;
  is_default: boolean;
  position?: number;
};

export type ProductVariant = {
  id: number;
  product_id?: number;
  size: string;
  sku: string;
  price: string | number;
  stock: number;
  is_active?: boolean;
  position?: number;
};

export type Product = {
  id: number;
  category_id: number | null;
  category?: Pick<Category, "id" | "name" | "slug"> | null;
  categories?: Pick<Category, "id" | "name" | "slug">[];
  images?: ProductImage[];
  name: string;
  slug: string;
  description?: string | null;
  price: string | number;
  stock: number;
  image_path?: string | null;
  is_active: boolean;
  is_featured: boolean;
  variants?: ProductVariant[];
  variants_count?: number;
  related?: Product[];
};

export type OrderItem = {
  id: number;
  product_id: number | null;
  variant_id?: number | null;
  variant_label?: string | null;
  product_name: string;
  unit_price: string | number;
  quantity: number;
  line_total: string | number;
  product?: { id: number; image_path?: string | null } | null;
};

export type Order = {
  id: number;
  number: string;
  guest_email?: string | null;
  // Returned only in the response to the guest who placed the order.
  guest_token?: string;
  status: string;
  delivery_method?: string;
  delivery_courier?: string | null;
  delivery_distance_km?: string | number | null;
  payment_method?: string;
  payment_proof_path?: string | null;
  subtotal: string | number;
  shipping: string | number;
  total: string | number;
  purchaser_name?: string | null;
  purchaser_phone?: string | null;
  recipient_name?: string | null;
  phone?: string | null;
  shipping_address?: string | null;
  delivery_date?: string | null;
  card_message?: string | null;
  notes?: string | null;
  created_at: string;
  items?: OrderItem[];
  user?: { id: number; name: string; email: string };
};

export type Customer = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  orders_count?: number;
  spent?: string | number | null;
  orders?: Order[];
};

export type PaymentSettings = {
  bank_enabled: boolean;
  card_enabled: boolean;
  delivery_standard_enabled: boolean;
  delivery_same_day_enabled: boolean;
  delivery_pickup_enabled: boolean;
  delivery_courier_enabled?: boolean;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  instructions?: string | null;
  qr_path?: string | null;
  fee_standard: number;
  fee_same_day: number;
  fee_pickup: number;
  // Courier (Grab / Lalamove) — admin-only pricing config.
  store_address?: string | null;
  store_lat?: number | string | null;
  store_lng?: number | string | null;
  lalamove_base_fee?: number | string;
  lalamove_per_km?: number | string;
  grab_base_fee?: number | string;
  grab_per_km?: number | string;
  courier_min_fee?: number | string;
  courier_default_km?: number | string;
};

export type DeliveryQuoteOption = { courier: string; label: string; fee: number };

export type DeliveryQuote = {
  distance_km: number;
  source: "google" | "haversine" | "default" | string;
  quotes: DeliveryQuoteOption[];
  best: DeliveryQuoteOption | null;
};

export type ValueProp = { title: string; sub?: string | null };

export type HomeSettings = {
  hero_eyebrow?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_cta_label?: string | null;
  hero_cta_href?: string | null;
  hero_image?: string | null;
  promo_eyebrow?: string | null;
  promo_title?: string | null;
  promo_subtitle?: string | null;
  promo_cta_label?: string | null;
  promo_cta_href?: string | null;
  promo_image?: string | null;
  value_props?: ValueProp[] | null;
  delivery_care?: string | null;
  delivery_terms?: string | null;
  marquee_enabled?: boolean | null;
  marquee_text?: string | null;
  whatsapp_number?: string | null;
};

export type SalesPoint = { date: string; total: number };

export type DashboardData = {
  orders_total: number;
  orders_30d: number;
  orders_pending: number;
  revenue_total: number;
  revenue_30d: number;
  products_total: number;
  products_out_of_stock: number;
  customers_total: number;
  sales_series: SalesPoint[];
  top_products: { product_name: string; revenue: number; units: number }[];
  recent_orders: Order[];
};

// Laravel paginator shape
export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};
