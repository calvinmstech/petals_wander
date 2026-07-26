<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending'); // awaiting_payment, pending, paid, shipped, completed, cancelled, refunded
            $table->string('delivery_method')->default('standard'); // standard, same_day, pickup
            $table->string('payment_method')->default('card'); // card, bank
            $table->string('payment_proof_path')->nullable();
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('shipping', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            // Purchaser (who is buying)
            $table->string('purchaser_name')->nullable();
            $table->string('purchaser_phone')->nullable();
            // Recipient (who the flowers are sent to). `phone` is the recipient phone.
            $table->string('recipient_name')->nullable();
            $table->string('phone')->nullable();
            $table->text('shipping_address')->nullable();
            $table->date('delivery_date')->nullable();
            $table->text('card_message')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
