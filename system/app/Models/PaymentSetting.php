<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    protected $fillable = [
        'bank_enabled',
        'bank_name',
        'account_number',
        'account_name',
        'instructions',
        'qr_path',
        'card_enabled',
        'delivery_standard_enabled',
        'delivery_same_day_enabled',
        'delivery_pickup_enabled',
        'delivery_courier_enabled',
        'store_address',
        'store_lat',
        'store_lng',
        'lalamove_base_fee',
        'lalamove_per_km',
        'grab_base_fee',
        'grab_per_km',
        'courier_min_fee',
        'courier_default_km',
        'fee_standard',
        'fee_same_day',
        'fee_pickup',
    ];

    protected $casts = [
        'bank_enabled' => 'boolean',
        'card_enabled' => 'boolean',
        'delivery_standard_enabled' => 'boolean',
        'delivery_same_day_enabled' => 'boolean',
        'delivery_pickup_enabled' => 'boolean',
        'delivery_courier_enabled' => 'boolean',
        'store_lat' => 'decimal:7',
        'store_lng' => 'decimal:7',
        'lalamove_base_fee' => 'decimal:2',
        'lalamove_per_km' => 'decimal:2',
        'grab_base_fee' => 'decimal:2',
        'grab_per_km' => 'decimal:2',
        'courier_min_fee' => 'decimal:2',
        'courier_default_km' => 'decimal:2',
        'fee_standard' => 'decimal:2',
        'fee_same_day' => 'decimal:2',
        'fee_pickup' => 'decimal:2',
    ];

    /**
     * The single settings row, created with sensible defaults if missing.
     */
    public static function current(): self
    {
        return static::firstOrCreate([], [
            'bank_enabled' => true,
            'bank_name' => 'Maybank',
            'account_number' => '5124 8830 1199',
            'account_name' => 'Petals Wander Sdn Bhd',
            'instructions' => 'Transfer the total and use your order number as the reference. Upload your receipt to confirm.',
            'card_enabled' => true,
            'delivery_courier_enabled' => true,
            'store_address' => '12 Jalan Bunga, 50000 Kuala Lumpur',
            'store_lat' => 3.1570,
            'store_lng' => 101.7123,
            'lalamove_base_fee' => 5,
            'lalamove_per_km' => 1.20,
            'grab_base_fee' => 6,
            'grab_per_km' => 1.00,
            'courier_min_fee' => 5,
            'courier_default_km' => 8,
            'fee_standard' => 8,
            'fee_same_day' => 14,
            'fee_pickup' => 0,
        ]);
    }
}
