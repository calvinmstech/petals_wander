<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * @group Admin · Settings
 *
 * Store-wide payment & delivery settings. Requires the `admin` role.
 * @authenticated
 */
class AdminSettingController extends Controller
{
    /**
     * Get payment settings
     */
    public function show(): JsonResponse
    {
        return response()->json(['data' => PaymentSetting::current()]);
    }

    /**
     * Update payment settings
     *
     * @bodyParam bank_enabled boolean Example: true
     * @bodyParam bank_name string Example: Maybank
     * @bodyParam account_number string Example: 5124 8830 1199
     * @bodyParam account_name string Example: Petals Wander Sdn Bhd
     * @bodyParam instructions string Example: Use your order number as the reference.
     * @bodyParam card_enabled boolean Example: true
     * @bodyParam fee_standard number Example: 8
     * @bodyParam fee_same_day number Example: 14
     * @bodyParam fee_pickup number Example: 0
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bank_enabled' => ['boolean'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'account_number' => ['nullable', 'string', 'max:60'],
            'account_name' => ['nullable', 'string', 'max:120'],
            'instructions' => ['nullable', 'string', 'max:1000'],
            'qr_path' => ['nullable', 'string', 'max:1000'],
            'card_enabled' => ['boolean'],
            'delivery_standard_enabled' => ['boolean'],
            'delivery_same_day_enabled' => ['boolean'],
            'delivery_pickup_enabled' => ['boolean'],
            'delivery_courier_enabled' => ['boolean'],
            'store_address' => ['nullable', 'string', 'max:255'],
            'store_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'store_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'lalamove_base_fee' => ['numeric', 'min:0'],
            'lalamove_per_km' => ['numeric', 'min:0'],
            'grab_base_fee' => ['numeric', 'min:0'],
            'grab_per_km' => ['numeric', 'min:0'],
            'courier_min_fee' => ['numeric', 'min:0'],
            'courier_default_km' => ['numeric', 'min:0'],
            'fee_standard' => ['numeric', 'min:0'],
            'fee_same_day' => ['numeric', 'min:0'],
            'fee_pickup' => ['numeric', 'min:0'],
        ]);

        $settings = PaymentSetting::current();
        $settings->update($data);

        return response()->json(['data' => $settings]);
    }

    /**
     * Upload the bank-transfer QR code
     *
     * Customers scan this image at checkout to pay. Replaces any existing QR.
     *
     * @bodyParam image file required The QR image file.
     */
    public function uploadPaymentQr(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:5120'],
        ]);

        $path = $request->file('image')->store('payment', 'public');

        $settings = PaymentSetting::current();
        $settings->update(['qr_path' => Storage::disk('public')->url($path)]);

        return response()->json(['data' => $settings]);
    }

    /**
     * Get home page content
     */
    public function showHome(): JsonResponse
    {
        return response()->json(['data' => SiteSetting::current()]);
    }

    /**
     * Update home page content
     *
     * Editable hero, promo banner and value-prop copy shown on the storefront.
     *
     * @bodyParam hero_title string Example: Flowers for calm moments & gifting
     * @bodyParam value_props object[] Example: [{"title":"Same-day delivery","sub":"Order before 2pm"}]
     */
    public function updateHome(Request $request): JsonResponse
    {
        $data = $request->validate([
            'hero_eyebrow' => ['nullable', 'string', 'max:160'],
            'hero_title' => ['nullable', 'string', 'max:160'],
            'hero_subtitle' => ['nullable', 'string', 'max:500'],
            'hero_cta_label' => ['nullable', 'string', 'max:60'],
            'hero_cta_href' => ['nullable', 'string', 'max:200'],
            'promo_eyebrow' => ['nullable', 'string', 'max:160'],
            'promo_title' => ['nullable', 'string', 'max:160'],
            'promo_subtitle' => ['nullable', 'string', 'max:500'],
            'promo_cta_label' => ['nullable', 'string', 'max:60'],
            'promo_cta_href' => ['nullable', 'string', 'max:200'],
            'value_props' => ['nullable', 'array', 'max:6'],
            'value_props.*.title' => ['required', 'string', 'max:120'],
            'value_props.*.sub' => ['nullable', 'string', 'max:160'],
            'delivery_care' => ['nullable', 'string', 'max:1000'],
            'delivery_terms' => ['nullable', 'string', 'max:2000'],
            'marquee_enabled' => ['boolean'],
            'marquee_text' => ['nullable', 'string', 'max:300'],
            'whatsapp_number' => ['nullable', 'string', 'max:30'],
        ]);

        $settings = SiteSetting::current();
        $settings->update($data);

        return response()->json(['data' => $settings]);
    }

    /**
     * Upload a home page image
     *
     * @bodyParam slot string required Which image: hero or promo. Example: hero
     * @bodyParam image file required The image file.
     */
    public function uploadHomeImage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slot' => ['required', Rule::in(['hero', 'promo'])],
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:5120'],
        ]);

        $path = $request->file('image')->store('home', 'public');
        $column = $data['slot'] === 'hero' ? 'hero_image' : 'promo_image';

        $settings = SiteSetting::current();
        $settings->update([$column => Storage::disk('public')->url($path)]);

        return response()->json(['data' => $settings]);
    }
}
