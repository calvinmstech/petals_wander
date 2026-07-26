<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            // Dynamic courier delivery (Grab / Lalamove) priced by distance.
            $table->boolean('delivery_courier_enabled')->default(true)->after('delivery_pickup_enabled');
            // Pickup origin used to measure distance to the customer.
            $table->string('store_address')->nullable()->after('delivery_courier_enabled');
            $table->decimal('store_lat', 10, 7)->nullable()->after('store_address');
            $table->decimal('store_lng', 10, 7)->nullable()->after('store_lat');
            // Per-courier pricing formula: max(min, base + per_km * distance_km).
            $table->decimal('lalamove_base_fee', 10, 2)->default(5);
            $table->decimal('lalamove_per_km', 10, 2)->default(1.20);
            $table->decimal('grab_base_fee', 10, 2)->default(6);
            $table->decimal('grab_per_km', 10, 2)->default(1.00);
            $table->decimal('courier_min_fee', 10, 2)->default(5);
            // Fallback distance (km) used when no Google key / geocode fails.
            $table->decimal('courier_default_km', 10, 2)->default(8);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('delivery_courier')->nullable()->after('delivery_method'); // grab, lalamove
            $table->decimal('delivery_distance_km', 10, 2)->nullable()->after('delivery_courier');
        });
    }

    public function down(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            $table->dropColumn([
                'delivery_courier_enabled', 'store_address', 'store_lat', 'store_lng',
                'lalamove_base_fee', 'lalamove_per_km', 'grab_base_fee', 'grab_per_km',
                'courier_min_fee', 'courier_default_km',
            ]);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_courier', 'delivery_distance_km']);
        });
    }
};
