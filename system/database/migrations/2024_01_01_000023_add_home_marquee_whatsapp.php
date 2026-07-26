<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            // Scrolling announcement bar on the storefront home page.
            $table->boolean('marquee_enabled')->default(false)->after('delivery_terms');
            $table->string('marquee_text')->nullable()->after('marquee_enabled');
            // Floating WhatsApp contact button. Stored as a raw phone number;
            // the storefront builds the wa.me link from its digits.
            $table->string('whatsapp_number')->nullable()->after('marquee_text');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn(['marquee_enabled', 'marquee_text', 'whatsapp_number']);
        });
    }
};
