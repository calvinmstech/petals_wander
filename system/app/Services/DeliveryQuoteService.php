<?php

namespace App\Services;

use App\Models\PaymentSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Prices courier delivery (Grab / Lalamove) from the distance between the store
 * and the customer address.
 *
 * Distance is resolved via the Google Distance Matrix API when a key is set;
 * otherwise it falls back to a straight-line (haversine) estimate when we can
 * geocode both points, and finally to a configured default distance so checkout
 * keeps working without any Google credentials.
 *
 * Each courier fee = max(min_fee, base_fee + per_km * distance_km). The cheaper
 * of the enabled couriers wins. This mirrors the shape of the real courier
 * quotation APIs, so a live integration can later replace estimateCouriers().
 */
class DeliveryQuoteService
{
    /**
     * @return array{distance_km: float, source: string, quotes: array<int, array{courier: string, label: string, fee: float}>, best: array{courier: string, label: string, fee: float}|null}
     */
    public function quote(string $destination): array
    {
        $settings = PaymentSetting::current();

        [$distanceKm, $source] = $this->resolveDistanceKm($settings, $destination);

        $quotes = $this->estimateCouriers($settings, $distanceKm);
        $best = $quotes ? collect($quotes)->sortBy('fee')->first() : null;

        return [
            'distance_km' => round($distanceKm, 2),
            'source' => $source,
            'quotes' => $quotes,
            'best' => $best,
        ];
    }

    /**
     * @return array<int, array{courier: string, label: string, fee: float}>
     */
    private function estimateCouriers(PaymentSetting $s, float $distanceKm): array
    {
        $min = (float) $s->courier_min_fee;

        $price = fn (float $base, float $perKm): float => round(max($min, $base + $perKm * $distanceKm), 2);

        return [
            ['courier' => 'lalamove', 'label' => 'Lalamove', 'fee' => $price((float) $s->lalamove_base_fee, (float) $s->lalamove_per_km)],
            ['courier' => 'grab', 'label' => 'Grab', 'fee' => $price((float) $s->grab_base_fee, (float) $s->grab_per_km)],
        ];
    }

    /**
     * @return array{0: float, 1: string} [distance_km, source]
     */
    private function resolveDistanceKm(PaymentSetting $s, string $destination): array
    {
        $origin = trim((string) $s->store_address) !== ''
            ? (string) $s->store_address
            : ($s->store_lat !== null && $s->store_lng !== null ? "{$s->store_lat},{$s->store_lng}" : null);

        $key = (string) config('services.google_maps.key');

        if ($key !== '' && $origin) {
            $km = $this->googleDistanceKm($key, $origin, $destination);
            if ($km !== null) {
                return [$km, 'google'];
            }

            $km = $this->haversineViaGeocode($key, $s, $destination);
            if ($km !== null) {
                return [$km, 'haversine'];
            }
        }

        // No key or every lookup failed — use the admin-configured default so the
        // customer still gets a deterministic quote.
        return [(float) $s->courier_default_km, 'default'];
    }

    private function googleDistanceKm(string $key, string $origin, string $destination): ?float
    {
        try {
            $res = Http::timeout(6)->get('https://maps.googleapis.com/maps/api/distancematrix/json', [
                'origins' => $origin,
                'destinations' => $destination,
                'units' => 'metric',
                'key' => $key,
            ]);

            $element = $res->json('rows.0.elements.0');
            if (($element['status'] ?? null) === 'OK' && isset($element['distance']['value'])) {
                return $element['distance']['value'] / 1000;
            }
        } catch (\Throwable $e) {
            Log::warning('Google Distance Matrix failed: '.$e->getMessage());
        }

        return null;
    }

    private function haversineViaGeocode(string $key, PaymentSetting $s, string $destination): ?float
    {
        // Origin coordinates: prefer the stored lat/lng, else geocode the address.
        $origin = ($s->store_lat !== null && $s->store_lng !== null)
            ? ['lat' => (float) $s->store_lat, 'lng' => (float) $s->store_lng]
            : ($s->store_address ? $this->geocode($key, (string) $s->store_address) : null);

        $dest = $this->geocode($key, $destination);

        if (! $origin || ! $dest) {
            return null;
        }

        return $this->haversine($origin['lat'], $origin['lng'], $dest['lat'], $dest['lng']);
    }

    /**
     * @return array{lat: float, lng: float}|null
     */
    private function geocode(string $key, string $address): ?array
    {
        try {
            $res = Http::timeout(6)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                'address' => $address,
                'key' => $key,
            ]);

            $loc = $res->json('results.0.geometry.location');
            if (isset($loc['lat'], $loc['lng'])) {
                return ['lat' => (float) $loc['lat'], 'lng' => (float) $loc['lng']];
            }
        } catch (\Throwable $e) {
            Log::warning('Google Geocoding failed: '.$e->getMessage());
        }

        return null;
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371.0; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
