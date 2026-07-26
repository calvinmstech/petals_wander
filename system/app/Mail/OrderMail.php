<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  Order  $order  The order this email is about.
     * @param  string  $type  One of: received, confirmed, shipped, ready.
     */
    public function __construct(public Order $order, public string $type)
    {
    }

    public function envelope(): Envelope
    {
        $number = $this->order->number;

        $subject = match ($this->type) {
            'confirmed' => "Your order {$number} is confirmed",
            'shipped' => "Your order {$number} is on its way",
            'ready' => "Your order {$number} is ready",
            default => "We've received your order {$number}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        [$heading, $intro] = match ($this->type) {
            'confirmed' => ['Payment received 🎉', 'Thank you — we have confirmed your payment and your order is now being prepared.'],
            'shipped' => ['Your flowers are on their way 🌸', 'Good news! Your order has been handed to our courier and is on the way to its recipient.'],
            'ready' => ['Your order is ready 🌼', 'Your order is prepared and ready. If you chose self-pickup, it is ready for collection at our studio; otherwise it is packed and ready to go.'],
            default => $this->order->payment_method === 'bank'
                ? ['Thank you for your order!', 'We have received your order and it is awaiting payment verification. Once we confirm your bank transfer, we will start preparing it.']
                : ['Thank you for your order!', 'We have received your order and payment, and we are getting it ready.'],
        };

        return new Content(
            view: 'emails.order',
            with: [
                'order' => $this->order,
                'heading' => $heading,
                'intro' => $intro,
                'accountUrl' => rtrim((string) env('FRONTEND_URL', 'http://localhost:8015'), '/').'/account',
            ],
        );
    }
}
