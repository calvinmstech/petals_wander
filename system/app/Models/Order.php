<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'number',
        'user_id',
        'guest_email',
        'guest_token',
        'status',
        'delivery_method',
        'delivery_courier',
        'delivery_distance_km',
        'payment_method',
        'payment_proof_path',
        'subtotal',
        'shipping',
        'total',
        'purchaser_name',
        'purchaser_phone',
        'recipient_name',
        'phone',
        'shipping_address',
        'delivery_date',
        'card_message',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping' => 'decimal:2',
        'total' => 'decimal:2',
        'delivery_distance_km' => 'decimal:2',
        'delivery_date' => 'date:Y-m-d',
    ];

    /**
     * The guest token is a capability, not order data: it is only ever returned
     * once, in the response to the guest who placed the order.
     */
    protected $hidden = ['guest_token'];

    /**
     * Where order email goes: the account holder, or the guest who ordered.
     */
    public function customerEmail(): ?string
    {
        return $this->user?->email ?? $this->guest_email;
    }

    /**
     * Whether $token is this order's guest capability.
     */
    public function matchesGuestToken(?string $token): bool
    {
        return $this->guest_token !== null
            && $token !== null
            && hash_equals($this->guest_token, $token);
    }

    /**
     * Build a sequential order number: PW + YYYYMMDD + 4-digit daily sequence.
     * Example: PW202606300001
     */
    public static function generateNumber($date = null): string
    {
        $date = $date ? Carbon::parse($date) : now();
        $prefix = 'PW'.$date->format('Ymd');
        $seq = static::where('number', 'like', $prefix.'%')->count() + 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
