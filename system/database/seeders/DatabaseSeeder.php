<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Roles
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $customer = Role::firstOrCreate(['name' => 'customer']);

        // Users (idempotent so re-seeding is safe)
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@petalwanders.test'],
            ['name' => 'Petal Wanders Admin', 'password' => Hash::make('password')]
        );
        $adminUser->syncRoles([$admin]);

        $customerUser = User::firstOrCreate(
            ['email' => 'customer@petalwanders.test'],
            ['name' => 'Jane Customer', 'password' => Hash::make('password')]
        );
        $customerUser->syncRoles([$customer]);

        // A few more demo customers so the admin Customers table has data.
        $demoCustomers = collect([
            ['Amira Tan', 'amira@mail.com'],
            ['Ben Lee', 'ben@mail.com'],
            ['Chloe Wong', 'chloe@mail.com'],
            ['Daniel Ng', 'daniel@mail.com'],
        ])->map(function ($entry) use ($customer) {
            [$name, $email] = $entry;
            $u = User::firstOrCreate(['email' => $email], ['name' => $name, 'password' => Hash::make('password')]);
            $u->syncRoles([$customer]);

            return $u;
        });

        // Payment settings (bank-transfer details shown at checkout)
        PaymentSetting::current();

        // Home page content (hero, promo banner, value props)
        \App\Models\SiteSetting::current();

        // Categories — [description, image]
        $categories = collect([
            'Bouquets' => ['Hand-tied bouquets for every occasion.', '/images/products/hydrangea-bouquet.svg'],
            'Roses' => ['Classic and premium roses.', '/images/products/white-rose-elegance.svg'],
            'Plants' => ['Potted plants and succulents.', '/images/products/eucalyptus-blooms.svg'],
            'Occasions' => ['Birthday, anniversary and sympathy arrangements.', '/images/products/serene-white-lilies.svg'],
        ])->map(fn ($meta, $name) => Category::updateOrCreate(
            ['slug' => Str::slug($name)],
            ['name' => $name, 'description' => $meta[0], 'image_path' => $meta[1], 'show_on_home' => true, 'is_active' => true]
        ));

        // Sample products — [name, slug, category, price, stock, featured]
        // Slugs match the generated illustrations in web/public/images/products.
        $samples = [
            ['Blue Hydrangea Bouquet', 'hydrangea-bouquet', 'Bouquets', 139.00, 30, true],
            ['White Rose Elegance', 'white-rose-elegance', 'Roses', 159.00, 24, true],
            ['Calm Blue Posy', 'calm-blue-posy', 'Bouquets', 99.00, 35, true],
            ['Eucalyptus & Blooms', 'eucalyptus-blooms', 'Bouquets', 89.00, 40, false],
            ['Serene White Lilies', 'serene-white-lilies', 'Occasions', 149.00, 18, true],
            ['Dusty Blue Delight', 'dusty-blue-delight', 'Bouquets', 129.00, 26, true],
            ['Powder Blue Roses', 'powder-blue-roses', 'Roses', 169.00, 20, false],
            ['Sympathy in White', 'sympathy-in-white', 'Occasions', 210.00, 12, false],
        ];

        $products = collect();
        foreach ($samples as [$name, $slug, $catName, $price, $stock, $featured]) {
            $product = Product::updateOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $categories[$catName]->id,
                    'name' => $name,
                    'description' => "{$name} — a calm, dusty-blue arrangement, hand-tied with fresh seasonal blooms and delivered with care.",
                    'price' => $price,
                    'stock' => $stock,
                    'is_active' => true,
                    'is_featured' => $featured,
                    'image_path' => "/images/products/{$slug}.svg",
                ]
            );

            // Bind to categories (many-to-many). Primary is the listed category;
            // featured products are also surfaced under "Occasions".
            $catIds = collect([$categories[$catName]->id]);
            if ($featured && $catName !== 'Occasions') {
                $catIds->push($categories['Occasions']->id);
            }
            $product->categories()->sync($catIds->unique()->all());

            // Product images — first is the default (mirrored to products.image_path).
            $product->images()->delete();
            foreach ([
                ["/images/products/{$slug}.svg", true],
                ['/images/products/eucalyptus-blooms.svg', false],
            ] as $i => [$path, $isDefault]) {
                $product->images()->create(['path' => $path, 'is_default' => $isDefault, 'position' => $i]);
            }

            // Size variants (S/M/L) — each is its own SKU with its own price & stock.
            $prefix = strtoupper(Str::substr(str_replace('-', '', $slug), 0, 4));
            $product->variants()->delete();
            foreach ([
                ['Small', 'S', round($price * 0.8, 2), (int) ceil($stock * 0.5)],
                ['Medium', 'M', $price, (int) ceil($stock * 0.35)],
                ['Large', 'L', round($price * 1.3, 2), (int) ceil($stock * 0.15)],
            ] as $i => [$size, $code, $vPrice, $vStock]) {
                $product->variants()->create([
                    'size' => $size,
                    'sku' => "{$prefix}-{$code}",
                    'price' => $vPrice,
                    'stock' => $vStock,
                    'is_active' => true,
                    'position' => $i,
                ]);
            }

            $products->push($product);
        }

        // Related products — link each product to the next two (wraps around).
        $products->values()->each(function (Product $product, int $i) use ($products) {
            $count = $products->count();
            $relatedIds = [
                $products[($i + 1) % $count]->id,
                $products[($i + 2) % $count]->id,
            ];
            $product->related()->sync($relatedIds);
        });

        // Demo orders spanning every status so the admin screens have data.
        $this->seedOrders($products, $demoCustomers);
    }

    private function seedOrders($products, $customers): void
    {
        if (Order::exists()) {
            return; // keep re-seeds idempotent
        }

        $specs = [
            ['awaiting_payment', 'bank', 'standard', 0],
            ['pending', 'card', 'standard', 1],
            ['shipped', 'card', 'same_day', 2],
            ['paid', 'bank', 'pickup', 3],
            ['refunded', 'card', 'standard', 0],
            ['completed', 'card', 'same_day', 1],
        ];

        foreach ($specs as $n => [$status, $payment, $delivery, $custIdx]) {
            $buyer = $customers[$custIdx % $customers->count()];
            $picks = $products->random(min(2, $products->count()));

            $subtotal = 0;
            $lines = [];
            foreach ($picks as $product) {
                $variant = $product->variants->first();
                $qty = random_int(1, 3);
                $unit = $variant ? $variant->price : $product->price;
                $subtotal += $unit * $qty;
                $lines[] = [
                    'product_id' => $product->id,
                    'variant_id' => $variant?->id,
                    'variant_label' => $variant?->size,
                    'product_name' => $product->name.($variant ? " — {$variant->size}" : ''),
                    'unit_price' => $unit,
                    'quantity' => $qty,
                    'line_total' => $unit * $qty,
                ];
            }

            $shipping = match ($delivery) {
                'same_day' => 14,
                'pickup' => 0,
                default => 8,
            };

            $createdAt = now()->subDays($n * 3);

            $order = $buyer->orders()->create([
                'number' => Order::generateNumber($createdAt),
                'status' => $status,
                'delivery_method' => $delivery,
                'payment_method' => $payment,
                'subtotal' => $subtotal,
                'shipping' => $shipping,
                'total' => $subtotal + $shipping,
                'purchaser_name' => $buyer->name,
                'purchaser_phone' => '+60 12-345 '.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
                'recipient_name' => 'Recipient '.($n + 1),
                'phone' => '+60 19-876 '.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
                'shipping_address' => $delivery === 'pickup' ? null : '12 Jalan Bunga, 50000 Kuala Lumpur',
                'delivery_date' => $delivery === 'standard' ? now()->addDays($n + 1)->toDateString() : null,
                'card_message' => 'Wishing you joy and bright blooms — with love. 🌸',
                'created_at' => $createdAt,
            ]);
            $order->items()->createMany($lines);
        }
    }
}
