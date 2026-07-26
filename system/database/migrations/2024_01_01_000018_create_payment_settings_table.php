<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('bank_enabled')->default(true);
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('account_name')->nullable();
            $table->text('instructions')->nullable();
            $table->string('qr_path')->nullable();
            $table->boolean('card_enabled')->default(true);
            $table->boolean('delivery_standard_enabled')->default(true);
            $table->boolean('delivery_same_day_enabled')->default(true);
            $table->boolean('delivery_pickup_enabled')->default(true);
            $table->decimal('fee_standard', 10, 2)->default(8);
            $table->decimal('fee_same_day', 10, 2)->default(14);
            $table->decimal('fee_pickup', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_settings');
    }
};
