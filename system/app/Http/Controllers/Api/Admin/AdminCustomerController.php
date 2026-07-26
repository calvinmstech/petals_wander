<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Admin · Customers
 *
 * Customer directory and profiles. Requires the `admin` role.
 * @authenticated
 */
class AdminCustomerController extends Controller
{
    /**
     * List customers
     *
     * Customers with their order counts and lifetime spend.
     *
     * @queryParam search string Match name or email. Example: amira
     * @queryParam sort string One of spend, orders, name, recent. Example: spend
     */
    public function index(Request $request): JsonResponse
    {
        $paidStatuses = ['paid', 'shipped', 'completed'];

        $query = User::role('customer')
            ->withCount('orders')
            ->withSum(['orders as spent' => fn ($q) => $q->whereIn('status', $paidStatuses)], 'total');

        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('name', 'ilike', "%{$search}%")
                ->orWhere('email', 'ilike', "%{$search}%"));
        }

        match ($request->query('sort')) {
            'orders' => $query->orderByDesc('orders_count'),
            'name' => $query->orderBy('name'),
            'recent' => $query->latest(),
            default => $query->orderByDesc('spent'),
        };

        $customers = $query->paginate((int) $request->query('per_page', 20));

        return response()->json($customers);
    }

    /**
     * Show customer
     *
     * Profile with full order history.
     *
     * @urlParam user int required Example: 2
     */
    public function show(User $user): JsonResponse
    {
        abort_unless($user->hasRole('customer'), 404);

        $user->load(['orders' => fn ($q) => $q->with('items')->latest()]);
        $user->loadCount('orders');

        return response()->json(['data' => $user]);
    }
}
