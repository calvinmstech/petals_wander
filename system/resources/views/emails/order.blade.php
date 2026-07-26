<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $heading }}</title>
</head>
<body style="margin:0; padding:0; background:#eef2f5; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#2e4257;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f5; padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e0e6ec;">
                    <tr>
                        <td style="background:#33597a; padding:22px 28px;">
                            <div style="font-size:20px; font-weight:700; color:#ffffff; letter-spacing:0.5px;">Petals Wander</div>
                            <div style="font-size:12px; color:#cdd6de;">Floral Studio</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px;">
                            <h1 style="margin:0 0 8px; font-size:22px; color:#2e4257;">{{ $heading }}</h1>
                            <p style="margin:0 0 6px; font-size:14px; color:#5a86a8;">Hi {{ $order->purchaser_name ?? $order->recipient_name ?? 'there' }},</p>
                            <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:#5a6b7c;">{{ $intro }}</p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e6ec; border-radius:10px; margin-bottom:18px;">
                                <tr>
                                    <td style="padding:14px 16px; border-bottom:1px solid #eef3f7;">
                                        <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#93a5b4;">Order number</span><br>
                                        <span style="font-size:15px; font-weight:700; color:#2e4257;">{{ $order->number }}</span>
                                    </td>
                                </tr>
                                @foreach ($order->items as $item)
                                    <tr>
                                        <td style="padding:10px 16px; border-bottom:1px solid #eef3f7; font-size:14px; color:#2e4257;">
                                            {{ $item->product_name }} &times; {{ $item->quantity }}
                                            <span style="float:right; font-weight:600;">RM {{ number_format($item->line_total, 2) }}</span>
                                        </td>
                                    </tr>
                                @endforeach
                                <tr>
                                    <td style="padding:10px 16px; font-size:13px; color:#5a6b7c;">
                                        Subtotal <span style="float:right;">RM {{ number_format($order->subtotal, 2) }}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:0 16px 10px; font-size:13px; color:#5a6b7c;">
                                        Delivery <span style="float:right;">RM {{ number_format($order->shipping, 2) }}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 16px; border-top:1px solid #e0e6ec; font-size:15px; font-weight:700; color:#2e4257;">
                                        Total <span style="float:right;">RM {{ number_format($order->total, 2) }}</span>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
                                <tr>
                                    <td valign="top" style="width:50%; padding-right:8px;">
                                        <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#93a5b4;">Send to</span><br>
                                        <span style="font-size:14px; color:#2e4257;">{{ $order->recipient_name ?? '—' }}</span><br>
                                        @if ($order->phone)<span style="font-size:13px; color:#5a6b7c;">{{ $order->phone }}</span><br>@endif
                                        @if ($order->shipping_address)<span style="font-size:13px; color:#5a6b7c;">{{ $order->shipping_address }}</span>@endif
                                    </td>
                                    <td valign="top" style="width:50%; padding-left:8px;">
                                        <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#93a5b4;">Delivery</span><br>
                                        <span style="font-size:14px; color:#2e4257; text-transform:capitalize;">{{ str_replace('_', ' ', $order->delivery_method ?? 'standard') }}</span><br>
                                        @if ($order->delivery_date)<span style="font-size:13px; color:#5a6b7c;">{{ \Illuminate\Support\Carbon::parse($order->delivery_date)->format('d M Y') }}</span>@endif
                                    </td>
                                </tr>
                            </table>

                            @if ($order->card_message)
                                <div style="background:#f4f7f9; border-radius:10px; padding:14px 16px; margin-bottom:18px;">
                                    <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#93a5b4;">Gift card message</span><br>
                                    <span style="font-size:14px; font-style:italic; color:#2e4257;">&ldquo;{{ $order->card_message }}&rdquo;</span>
                                </div>
                            @endif

                            <a href="{{ $accountUrl }}" style="display:inline-block; background:#5a86a8; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; padding:11px 22px; border-radius:9px;">View my orders</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 28px; background:#f4f7f9; font-size:12px; color:#93a5b4;">
                            You're receiving this email because an order was placed at Petals Wander.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
