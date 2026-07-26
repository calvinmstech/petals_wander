<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();

            // Hero
            $table->string('hero_eyebrow')->nullable();
            $table->string('hero_title')->nullable();
            $table->text('hero_subtitle')->nullable();
            $table->string('hero_cta_label')->nullable();
            $table->string('hero_cta_href')->nullable();
            $table->string('hero_image')->nullable();

            // Promo banner
            $table->string('promo_eyebrow')->nullable();
            $table->string('promo_title')->nullable();
            $table->text('promo_subtitle')->nullable();
            $table->string('promo_cta_label')->nullable();
            $table->string('promo_cta_href')->nullable();
            $table->string('promo_image')->nullable();

            // Value-prop strip: [{ "title": "...", "sub": "..." }]
            $table->json('value_props')->nullable();

            // Product page — "Delivery & care" accordion copy
            $table->text('delivery_care')->nullable();

            // Checkout — delivery terms & conditions the customer must accept
            $table->text('delivery_terms')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
