<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OrderMail;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\DeliveryQuoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * @group Orders
 *
 * Customer order endpoints. Orders can be placed by a signed-in customer or by
 * a guest (no account). A guest order returns a one-time `guest_token`; pass it
 * back as `token` to view that order or upload its receipt. Signed-in customers
 * use their Bearer token as usual and only ever see their own orders.
 */
class OrderController extends Controller
{
    /**
     * Resolve the signed-in user, if any.
     *
     * These endpoints are public so guests can order, which means the default
     * (session) guard is in play — the Sanctum guard must be named explicitly
     * for the Bearer token to be read.
     */
    private function currentUser(Request $request): ?\App\Models\User
    {
        return $request->user('sanctum');
    }

    /**
     * Allow access to an order by its owner, or by a guest holding its token.
     */
    private function authorizeOrder(Request $request, Order $order): void
    {
        $user = $this->currentUser($request);

        if ($user && $order->user_id === $user->id) {
            return;
        }

        $token = $request->header('X-Order-Token')
            ?? $request->query('token')
            ?? $request->input('token');

        abort_unless($order->matchesGuestToken($token !== null ? (string) $token : null), 403);
    }
    /**
     * List my orders
     *
     * @authenticated
     */
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()
            ->with('items')
            ->latest()
            ->paginate(10);

        return response()->json($orders);
    }

    /**
     * Place an order
     *
     * Creates an order from a list of product/quantity pairs. Prices and stock
     * are validated server-side against the chosen size variant (when given) or
     * the product. Card orders are placed as `paid`; bank transfers as
     * `awaiting_payment` until an admin verifies the uploaded receipt.
     *
     * Send a Bearer token to place the order against that account. Without one
     * the order is placed as a guest: `guest_email` is then required, and the
     * response includes a one-time `guest_token` for viewing that order.
     *
     * @bodyParam guest_email string Required when not signed in. Where the order confirmation is sent. Example: guest@example.com
     * @bodyParam items object[] required Line items. Example: [{"product_id":1,"variant_id":2,"quantity":2}]
     * @bodyParam items[].product_id int required Example: 1
     * @bodyParam items[].variant_id int Size variant id. Example: 2
     * @bodyParam items[].quantity int required Example: 2
     * @bodyParam recipient_name string required Example: Jane Doe
     * @bodyParam phone string Example: +60123456789
     * @bodyParam shipping_address string Required unless delivery_method is pickup. Example: 12 Jalan Bunga, 50000 KL
     * @bodyParam purchaser_name string required Who is buying. Example: John Buyer
     * @bodyParam purchaser_phone string required Buyer's phone. Example: +60123456789
     * @bodyParam recipient_name string required Who the flowers are sent to. Example: Jane Doe
     * @bodyParam phone string required Recipient's phone. Example: +60198765432
     * @bodyParam shipping_address string Required unless delivery_method is pickup. Example: 12 Jalan Bunga, 50000 KL
     * @bodyParam delivery_method string One of standard, same_day, pickup, courier. Example: courier
     * @bodyParam delivery_date date Required when delivery_method is standard. Example: 2026-07-01
     * @bodyParam card_message string required Gift card message. Example: Happy birthday, with love.
     * @bodyParam payment_method string One of card, bank. Example: bank
     * @bodyParam notes string Example: Please deliver before noon.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);

        $data = $request->validate([
            'guest_email' => [Rule::requiredIf($user === null), 'nullable', 'email', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'purchaser_name' => ['required', 'string', 'max:255'],
            'purchaser_phone' => ['required', 'string', 'max:50'],
            'recipient_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'shipping_address' => ['required_unless:delivery_method,pickup', 'nullable', 'string', 'max:1000'],
            'delivery_method' => ['nullable', Rule::in(['standard', 'same_day', 'pickup', 'courier'])],
            'delivery_date' => ['required_if:delivery_method,standard', 'nullable', 'date', 'after_or_equal:today'],
            'card_message' => ['required', 'string', 'max:500'],
            'payment_method' => ['nullable', Rule::in(['card', 'bank'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $delivery = $data['delivery_method'] ?? 'standard';
        $payment = $data['payment_method'] ?? 'card';
        $settings = PaymentSetting::current();

        // The chosen delivery method must be enabled in settings.
        $deliveryEnabled = match ($delivery) {
            'same_day' => $settings->delivery_same_day_enabled,
            'pickup' => $settings->delivery_pickup_enabled,
            'courier' => $settings->delivery_courier_enabled,
            default => $settings->delivery_standard_enabled,
        };
        abort_unless($deliveryEnabled, 422, 'That delivery option is not available.');

        // Courier delivery is priced live from the distance to the address; the
        // fee is always recomputed here rather than trusting the client.
        $courier = null;
        $distanceKm = null;
        if ($delivery === 'courier') {
            $quote = app(DeliveryQuoteService::class)->quote($data['shipping_address']);
            abort_unless($quote['best'], 422, 'Could not price courier delivery for that address.');
            $shipping = (float) $quote['best']['fee'];
            $courier = $quote['best']['courier'];
            $distanceKm = $quote['distance_km'];
        } else {
            $shipping = match ($delivery) {
                'same_day' => (float) $settings->fee_same_day,
                'pickup' => (float) $settings->fee_pickup,
                default => (float) $settings->fee_standard,
            };
        }

        // Guests get a one-time secret so they can come back to the order.
        $guestToken = $user ? null : Str::random(48);

        $order = DB::transaction(function () use ($data, $user, $guestToken, $delivery, $payment, $shipping, $courier, $distanceKm) {
            $subtotal = 0;
            $lines = [];

            foreach ($data['items'] as $item) {
                /** @var Product $product */
                $product = Product::where('is_active', true)->lockForUpdate()->findOrFail($item['product_id']);

                // Resolve price + stock from the variant when supplied, else the product.
                $variant = null;
                if (! empty($item['variant_id'])) {
                    /** @var ProductVariant $variant */
                    $variant = ProductVariant::where('product_id', $product->id)
                        ->lockForUpdate()
                        ->findOrFail($item['variant_id']);
                }

                $unitPrice = $variant ? $variant->price : $product->price;
                $available = $variant ? $variant->stock : $product->stock;
                $label = $product->name.($variant ? " — {$variant->size}" : '');

                abort_if($available < $item['quantity'], 422, "Insufficient stock for {$label}.");

                $lineTotal = $unitPrice * $item['quantity'];
                $subtotal += $lineTotal;

                $lines[] = [
                    'product_id' => $product->id,
                    'variant_id' => $variant?->id,
                    'variant_label' => $variant?->size,
                    'product_name' => $label,
                    'unit_price' => $unitPrice,
                    'quantity' => $item['quantity'],
                    'line_total' => $lineTotal,
                ];

                if ($variant) {
                    $variant->decrement('stock', $item['quantity']);
                } else {
                    $product->decrement('stock', $item['quantity']);
                }
            }

            $order = Order::create([
                'number' => Order::generateNumber(),
                'user_id' => $user?->id,
                'guest_email' => $user ? null : $data['guest_email'],
                'guest_token' => $guestToken,
                'status' => $payment === 'bank' ? 'awaiting_payment' : 'paid',
                'delivery_method' => $delivery,
                'delivery_courier' => $courier,
                'delivery_distance_km' => $distanceKm,
                'payment_method' => $payment,
                'subtotal' => $subtotal,
                'shipping' => $shipping,
                'total' => $subtotal + $shipping,
                'purchaser_name' => $data['purchaser_name'],
                'purchaser_phone' => $data['purchaser_phone'],
                'recipient_name' => $data['recipient_name'],
                'phone' => $data['phone'],
                'shipping_address' => $data['shipping_address'] ?? null,
                'delivery_date' => $delivery === 'standard' ? ($data['delivery_date'] ?? null) : null,
                'card_message' => $data['card_message'],
                'notes' => $data['notes'] ?? null,
            ]);

            $order->items()->createMany($lines);

            return $order;
        });

        // Card orders are paid immediately, so confirm them; bank transfers are
        // only acknowledged as received until an admin verifies the receipt.
        $this->emailCustomer($order, $order->status === 'paid' ? 'confirmed' : 'received', $user?->email ?? $order->guest_email);

        $order->load('items');

        // The guest token is hidden by default and surfaced only here, to the
        // guest who just placed the order.
        if ($guestToken) {
            $order->makeVisible('guest_token');
        }

        return response()->json(['data' => $order], 201);
    }

    /**
     * Send an order email, swallowing any transport error so a mail outage
     * never blocks order placement or a status update.
     */
    public static function emailCustomer(Order $order, string $type, ?string $email): void
    {
        if (! $email) {
            return;
        }

        try {
            Mail::to($email)->send(new OrderMail($order->loadMissing('items'), $type));
        } catch (\Throwable $e) {
            Log::warning("Order email ({$type}) failed for {$order->number}: ".$e->getMessage());
        }
    }

    /**
     * Show an order
     *
     * Readable by the customer who owns it (Bearer token) or by a guest passing
     * the `token` returned when the order was placed.
     *
     * @urlParam order int required Example: 1
     * @queryParam token string The guest_token, for orders placed without an account. Example: 3f9a…
     */
    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);

        return response()->json(['data' => $order->load('items')]);
    }

    /**
     * Upload a bank-transfer receipt
     *
     * Attaches proof of payment to a bank-transfer order. The order stays
     * `awaiting_payment` until an admin verifies it.
     *
     * @urlParam order int required Example: 1
     * @bodyParam receipt file required Image or PDF of the transfer receipt.
     * @bodyParam token string The guest_token, for orders placed without an account. Example: 3f9a…
     */
    public function uploadReceipt(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);

        $request->validate([
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $path = $request->file('receipt')->store('receipts', 'public');
        $order->update(['payment_proof_path' => $path]);

        return response()->json(['data' => $order->load('items')]);
    }
}
