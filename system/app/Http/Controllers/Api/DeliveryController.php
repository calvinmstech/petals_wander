<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Services\DeliveryQuoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Storefront
 *
 * Live courier delivery pricing consumed by the checkout.
 */
class DeliveryController extends Controller
{
    /**
     * Quote courier delivery
     *
     * Returns a distance-based delivery quote for Grab and Lalamove given the
     * customer's address. The cheaper courier is returned as `best`. Prices are
     * recomputed server-side when the order is placed, so this is display-only.
     *
     * @unauthenticated
     *
     * @bodyParam address string required The delivery address. Example: 8 Jalan Ampang, 50450 Kuala Lumpur
     */
    public function quote(Request $request, DeliveryQuoteService $service): JsonResponse
    {
        $data = $request->validate([
            'address' => ['required', 'string', 'max:1000'],
        ]);

        abort_unless(PaymentSetting::current()->delivery_courier_enabled, 422, 'Courier delivery is not available.');

        return response()->json(['data' => $service->quote($data['address'])]);
    }
}
