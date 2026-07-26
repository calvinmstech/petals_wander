<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = [
        'hero_eyebrow',
        'hero_title',
        'hero_subtitle',
        'hero_cta_label',
        'hero_cta_href',
        'hero_image',
        'promo_eyebrow',
        'promo_title',
        'promo_subtitle',
        'promo_cta_label',
        'promo_cta_href',
        'promo_image',
        'value_props',
        'delivery_care',
        'delivery_terms',
        'marquee_enabled',
        'marquee_text',
        'whatsapp_number',
    ];

    protected $casts = [
        'value_props' => 'array',
        'marquee_enabled' => 'boolean',
    ];

    /**
     * The single home-content row, created with the original storefront copy if
     * it doesn't exist yet.
     */
    public static function current(): self
    {
        return static::firstOrCreate([], [
            'hero_eyebrow' => 'Petals Wander · Floral Studio',
            'hero_title' => 'Flowers for calm moments & gifting',
            'hero_subtitle' => 'Thoughtfully designed arrangements for every meaningful occasion — wrapped your way.',
            'hero_cta_label' => 'Shop the collection',
            'hero_cta_href' => '/shop',
            'hero_image' => '/images/hero-bouquet.svg',
            'promo_eyebrow' => 'Choose your size',
            'promo_title' => 'Small, medium or large.',
            'promo_subtitle' => 'Every arrangement comes in three sizes — pick the one that fits the moment on the product page.',
            'promo_cta_label' => 'Explore collections',
            'promo_cta_href' => '/shop',
            'promo_image' => '/images/products/hydrangea-bouquet.svg',
            'value_props' => [
                ['title' => 'Same-day delivery', 'sub' => 'Order before 2pm'],
                ['title' => 'Always fresh', 'sub' => 'Sourced from local growers'],
                ['title' => 'Free gift note', 'sub' => 'Personalise any order'],
            ],
            'delivery_care' => 'Delivered fresh, wrapped in kraft paper with a free gift note. Same-day delivery available before 2pm.',
            'delivery_terms' => "Delivery dates are best-effort and may shift due to weather, traffic or recipient availability. Someone must be present to receive the flowers; if no one is available we may leave them with a neighbour or at reception. Fresh flowers are perishable — substitutions of equal or greater value may be made when a specific stem is unavailable. Please double-check the recipient's address and phone number before placing the order.",
            'marquee_enabled' => true,
            'marquee_text' => 'Free same-day delivery on orders before 2pm · Fresh blooms, wrapped with love 🌸',
            'whatsapp_number' => '',
        ]);
    }
}
