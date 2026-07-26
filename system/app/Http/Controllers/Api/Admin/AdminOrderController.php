<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @group Admin · Orders
 *
 * Order oversight and fulfilment. Requires the `admin` role.
 * @authenticated
 */
class AdminOrderController extends Controller
{
    /**
     * List all orders
     *
     * @queryParam status string Filter by status. Example: pending
     * @queryParam date_from date Only orders created on/after this date (Y-m-d). Example: 2026-06-01
     * @queryParam date_to date Only orders created on/before this date (Y-m-d). Example: 2026-06-30
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::query()->with('user:id,name,email', 'items.product:id,image_path');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($from = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        return response()->json($query->latest()->paginate((int) $request->query('per_page', 20)));
    }

    /**
     * Show order (admin)
     *
     * @urlParam order int required Example: 1
     */
    public function show(Order $order): JsonResponse
    {
        return response()->json(['data' => $order->load('user:id,name,email', 'items.product:id,image_path')]);
    }

    /**
     * Update order status
     *
     * @urlParam order int required Example: 1
     * @bodyParam status string required One of pending, paid, shipped, completed, cancelled. Example: shipped
     */
    public function update(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['awaiting_payment', 'pending', 'paid', 'shipped', 'ready', 'completed', 'cancelled', 'refunded'])],
        ]);

        $previous = $order->status;
        $order->update($data);

        // Notify the customer when the order is freshly marked paid or shipped.
        if ($order->status !== $previous) {
            $type = match ($order->status) {
                'paid' => 'confirmed',
                'shipped' => 'shipped',
                'ready' => 'ready',
                default => null,
            };

            if ($type) {
                // Guest orders have no user; they are notified at guest_email.
                $order->loadMissing('user:id,name,email');
                \App\Http\Controllers\Api\OrderController::emailCustomer($order, $type, $order->customerEmail());
            }
        }

        return response()->json(['data' => $order]);
    }

    /**
     * Dashboard metrics
     *
     * Summary counters for the admin landing page.
     */
    public function dashboard(): JsonResponse
    {
        $paidStatuses = ['paid', 'shipped', 'completed'];

        // Daily revenue for the last 30 days (fills gaps with 0).
        $since = now()->subDays(29)->startOfDay();
        $byDay = Order::query()
            ->whereIn('status', $paidStatuses)
            ->where('created_at', '>=', $since)
            ->get(['total', 'created_at'])
            ->groupBy(fn ($o) => $o->created_at->toDateString())
            ->map(fn ($group) => (float) $group->sum('total'));

        $salesSeries = collect(range(0, 29))->map(function ($i) use ($since, $byDay) {
            $date = $since->copy()->addDays($i)->toDateString();

            return ['date' => $date, 'total' => round($byDay->get($date, 0), 2)];
        })->values();

        $topProducts = \App\Models\OrderItem::query()
            ->selectRaw('product_name, SUM(line_total) as revenue, SUM(quantity) as units')
            ->groupBy('product_name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'orders_total' => Order::count(),
                'orders_30d' => Order::where('created_at', '>=', $since)->count(),
                'orders_pending' => Order::whereIn('status', ['pending', 'awaiting_payment'])->count(),
                'revenue_total' => (float) Order::whereIn('status', $paidStatuses)->sum('total'),
                'revenue_30d' => (float) Order::whereIn('status', $paidStatuses)->where('created_at', '>=', $since)->sum('total'),
                'products_total' => Product::count(),
                'products_out_of_stock' => Product::where('stock', 0)->count(),
                'customers_total' => User::role('customer')->count(),
                'sales_series' => $salesSeries,
                'top_products' => $topProducts,
                'recent_orders' => Order::with('user:id,name,email')->latest()->limit(5)->get(),
            ],
        ]);
    }
}
