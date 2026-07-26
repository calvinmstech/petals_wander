<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;

/**
 * @group Storefront
 *
 * Public store settings consumed by the checkout.
 */
class SettingController extends Controller
{
    /**
     * Payment & delivery info
     *
     * The bank-transfer details and delivery fees shown at checkout. Account
     * details are only returned when bank transfer is enabled.
     *
     * @unauthenticated
     */
    public function payment(): JsonResponse
    {
        $s = PaymentSetting::current();

        return response()->json([
            'data' => [
                'bank_enabled' => $s->bank_enabled,
                'card_enabled' => $s->card_enabled,
                'delivery_standard_enabled' => $s->delivery_standard_enabled,
                'delivery_same_day_enabled' => $s->delivery_same_day_enabled,
                'delivery_pickup_enabled' => $s->delivery_pickup_enabled,
                'delivery_courier_enabled' => $s->delivery_courier_enabled,
                'bank_name' => $s->bank_enabled ? $s->bank_name : null,
                'account_number' => $s->bank_enabled ? $s->account_number : null,
                'account_name' => $s->bank_enabled ? $s->account_name : null,
                'instructions' => $s->bank_enabled ? $s->instructions : null,
                'qr_path' => $s->bank_enabled ? $s->qr_path : null,
                'fee_standard' => (float) $s->fee_standard,
                'fee_same_day' => (float) $s->fee_same_day,
                'fee_pickup' => (float) $s->fee_pickup,
            ],
        ]);
    }

    /**
     * Home page content
     *
     * Editable hero, promo banner and value-prop copy + images shown on the
     * storefront home page.
     *
     * @unauthenticated
     */
    public function home(): JsonResponse
    {
        return response()->json(['data' => SiteSetting::current()]);
    }
}
