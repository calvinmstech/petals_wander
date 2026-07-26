<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Guest orders have no account behind them.
            $table->foreignId('user_id')->nullable()->change();
            $table->string('guest_email')->nullable()->after('user_id');
            // Secret handed to the guest so they can view the order and upload a
            // receipt without an account. Acts as the capability for that order.
            $table->string('guest_token', 64)->nullable()->after('guest_email');
            $table->index('guest_token');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['guest_token']);
            $table->dropColumn(['guest_email', 'guest_token']);
            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};
