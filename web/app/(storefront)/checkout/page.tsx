"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { cart, type CartItem } from "@/lib/cart";
import { getAuth, setAuth, type AuthState } from "@/lib/auth";
import { money } from "@/lib/format";
import Button from "@/components/Button";
import type { DeliveryQuote, HomeSettings, Order, PaymentSettings } from "@/lib/types";

type Delivery = "standard" | "same_day" | "pickup" | "courier";
type Payment = "card" | "bank";

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [auth, setAuthLocal] = useState<AuthState | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);

  // auth toggle (only when logged out): check out as a guest, or sign in / register.
  const [authMode, setAuthMode] = useState<"guest" | "register" | "login">("guest");
  const [creds, setCreds] = useState({ name: "", email: "", password: "" });
  const [guestEmail, setGuestEmail] = useState("");

  const [delivery, setDelivery] = useState<Delivery>("standard");
  const [payment, setPayment] = useState<Payment>("card");
  const [purchaser, setPurchaser] = useState({ name: "", phone: "" });
  const [recipient, setRecipient] = useState({ name: "", phone: "" });
  const [address, setAddress] = useState({ street: "", city: "", postcode: "" });
  const [deliveryDate, setDeliveryDate] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const [terms, setTerms] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const receiptRef = useRef<HTMLInputElement>(null);

  // Standard delivery is "next day" — earliest selectable date is tomorrow.
  const [minDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));

  // Live courier (Grab / Lalamove) quote, priced by distance to the address.
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const current = cart.items();
    if (current.length === 0) {
      router.replace("/cart");
      return;
    }
    setItems(current);
    const a = getAuth();
    setAuthLocal(a);
    if (a) {
      setCreds((c) => ({ ...c, name: a.user.name, email: a.user.email }));
      setPurchaser((p) => ({ ...p, name: p.name || a.user.name }));
    }
    api
      .get<{ data: PaymentSettings }>("/settings/payment")
      .then((res) => {
        setSettings(res.data);
        if (!res.data.card_enabled && res.data.bank_enabled) setPayment("bank");
        // Default to the first enabled delivery option.
        const enabled: Delivery[] = [
          ...(res.data.delivery_standard_enabled ? (["standard"] as const) : []),
          ...(res.data.delivery_same_day_enabled ? (["same_day"] as const) : []),
          ...(res.data.delivery_courier_enabled ? (["courier"] as const) : []),
          ...(res.data.delivery_pickup_enabled ? (["pickup"] as const) : []),
        ];
        if (enabled.length && !enabled.includes("standard")) setDelivery(enabled[0]);
      })
      .catch(() => {});
    api
      .get<{ data: HomeSettings }>("/settings/home")
      .then((res) => setTerms(res.data.delivery_terms ?? ""))
      .catch(() => {});
  }, [router]);

  const needAddress = delivery !== "pickup";
  const fullAddress = `${address.street}, ${address.city} ${address.postcode}`.trim();
  const addressComplete = Boolean(address.street && address.city && address.postcode);

  // Fetch a live courier quote (debounced) whenever the address changes while
  // courier delivery is selected. The order endpoint recomputes the fee anyway.
  useEffect(() => {
    if (delivery !== "courier") {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    if (!addressComplete) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    setQuoteError(null);
    const t = setTimeout(() => {
      api
        .post<{ data: DeliveryQuote }>("/delivery/quote", { address: fullAddress })
        .then((res) => !cancelled && setQuote(res.data))
        .catch((err) => {
          if (cancelled) return;
          setQuote(null);
          setQuoteError(err instanceof ApiError ? err.message : "Could not price delivery for that address.");
        })
        .finally(() => !cancelled && setQuoting(false));
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [delivery, addressComplete, fullAddress]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const fee =
    delivery === "courier"
      ? quote?.best?.fee ?? 0
      : settings == null
      ? delivery === "same_day"
        ? 14
        : delivery === "pickup"
        ? 0
        : 8
      : delivery === "same_day"
      ? settings.fee_same_day
      : delivery === "pickup"
      ? settings.fee_pickup
      : settings.fee_standard;
  // Block placing a courier order until we have a priced quote.
  const courierPending = delivery === "courier" && !quote;

  // Native form validation runs first (required fields + the T&C checkbox);
  // then we show a confirmation step before actually charging/placing.
  function reviewOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowConfirm(true);
  }

  async function submitOrder() {
    setError(null);
    setSubmitting(true);
    try {
      // Guest checkout skips auth entirely; sign-in / register authenticate
      // inline so the order lands on the customer's account.
      let session = getAuth();
      const asGuest = !session && authMode === "guest";
      if (!session && !asGuest) {
        const path = authMode === "login" ? "/auth/login" : "/auth/register";
        const payload =
          authMode === "login"
            ? { email: creds.email, password: creds.password }
            : creds;
        session = await api.post<AuthState>(path, payload);
        setAuth(session);
        setAuthLocal(session);
      }

      const shipping_address = needAddress
        ? `${address.street}, ${address.city} ${address.postcode}`.trim()
        : null;

      const res = await api.post<{ data: Order }>("/orders", {
        ...(asGuest ? { guest_email: guestEmail } : {}),
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id ?? null,
          quantity: i.quantity,
        })),
        purchaser_name: purchaser.name,
        purchaser_phone: purchaser.phone,
        recipient_name: recipient.name,
        phone: recipient.phone,
        shipping_address,
        delivery_method: delivery,
        delivery_date: delivery === "standard" ? deliveryDate : null,
        card_message: cardMessage,
        payment_method: payment,
      });

      const order = res.data;

      // Attach the bank-transfer receipt if one was chosen. Guests authorize the
      // upload with the one-time token returned alongside the order.
      const file = receiptRef.current?.files?.[0];
      if (payment === "bank" && file) {
        const form = new FormData();
        form.append("receipt", file);
        if (order.guest_token) form.append("token", order.guest_token);
        await api.upload(`/orders/${order.id}/receipt`, form).catch(() => {});
      }

      cart.clear();
      if (asGuest && order.guest_token) {
        // Guests have no account to return to; the token is their only handle on
        // the order, so it lives in the confirmation URL.
        router.push(`/order/${order.id}?token=${encodeURIComponent(order.guest_token)}`);
      } else {
        router.push(`/account?placed=${order.number}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not place order.");
      setSubmitting(false);
      setShowConfirm(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-serif text-2xl font-semibold text-brand-900">Checkout</h1>

      <form onSubmit={reviewOrder} className="mt-6 flex flex-wrap items-start gap-7">
        <div className="min-w-0 flex-1 basis-80">
          {error && (
            <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
          )}

          {/* Account */}
          {auth ? (
            <Section title="Account">
              <p className="text-sm text-brand-600">
                Signed in as <strong>{auth.user.email}</strong>
              </p>
            </Section>
          ) : (
            <Section title="Account">
              <div className="mb-3 flex gap-2">
                <Segment active={authMode === "guest"} onClick={() => setAuthMode("guest")}>
                  Guest checkout
                </Segment>
                <Segment active={authMode === "login"} onClick={() => setAuthMode("login")}>
                  Sign in
                </Segment>
                <Segment active={authMode === "register"} onClick={() => setAuthMode("register")}>
                  Create account
                </Segment>
              </div>

              {authMode === "guest" ? (
                <>
                  <input
                    className="input"
                    type="email"
                    placeholder="Email address"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                  />
                  <p className="mt-1.5 text-xs text-brand-400">
                    No account needed. We&apos;ll email your order confirmation and a link to track it.
                  </p>
                </>
              ) : (
                <>
                  {authMode === "register" && (
                    <input
                      className="input mb-2.5"
                      placeholder="Full name"
                      value={creds.name}
                      onChange={(e) => setCreds({ ...creds, name: e.target.value })}
                      required
                    />
                  )}
                  <input
                    className="input mb-2.5"
                    type="email"
                    placeholder="Email address"
                    value={creds.email}
                    onChange={(e) => setCreds({ ...creds, email: e.target.value })}
                    required
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Password"
                    value={creds.password}
                    onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                    required
                  />
                </>
              )}
            </Section>
          )}

          {/* Delivery */}
          <Section title="Delivery option">
            <div className="space-y-2">
              {settings?.delivery_standard_enabled !== false && (
                <OptionRow active={delivery === "standard"} onClick={() => setDelivery("standard")} label="Standard — next day" right={money(settings?.fee_standard ?? 8)} />
              )}
              {settings?.delivery_same_day_enabled !== false && (
                <OptionRow active={delivery === "same_day"} onClick={() => setDelivery("same_day")} label="Same-day (order before 2pm)" right={money(settings?.fee_same_day ?? 14)} />
              )}
              {settings?.delivery_courier_enabled !== false && (
                <OptionRow
                  active={delivery === "courier"}
                  onClick={() => setDelivery("courier")}
                  label="Courier (Grab / Lalamove)"
                  right={quote?.best ? money(quote.best.fee) : "By distance"}
                />
              )}
              {settings?.delivery_pickup_enabled !== false && (
                <OptionRow active={delivery === "pickup"} onClick={() => setDelivery("pickup")} label="Self-pickup at store" right={(settings?.fee_pickup ?? 0) === 0 ? "Free" : money(settings!.fee_pickup)} />
              )}
            </div>

            {delivery === "courier" && (
              <div className="mt-3 rounded-lg border border-brand-200 bg-mist p-3.5">
                {!addressComplete ? (
                  <p className="text-xs text-brand-500">
                    Enter the recipient&apos;s full address below to get a live Grab / Lalamove delivery price.
                  </p>
                ) : quoting ? (
                  <p className="text-xs text-brand-500">Calculating delivery price…</p>
                ) : quoteError ? (
                  <p className="text-xs text-rose-600">{quoteError}</p>
                ) : quote ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-brand-600">
                        {quote.distance_km} km from store
                      </span>
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        Cheapest: {quote.best?.label}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {quote.quotes.map((q) => {
                        const isBest = q.courier === quote.best?.courier;
                        return (
                          <div
                            key={q.courier}
                            className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm ${
                              isBest ? "bg-brand-100 font-semibold text-brand-800" : "text-brand-600"
                            }`}
                          >
                            <span>{q.label}{isBest ? " ✓" : ""}</span>
                            <span className="font-medium">{money(q.fee)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-brand-400">
                      We book the cheaper courier for you. Final price is confirmed when the order is placed.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {delivery === "standard" && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-semibold text-brand-500">Delivery date</label>
                <input
                  type="date"
                  className="input"
                  min={minDate}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-brand-400">Standard orders are delivered from the next day onwards.</p>
              </div>
            )}
          </Section>

          {/* Recipient */}
          <Section title="Send to (recipient)">
            <div className="grid grid-cols-2 gap-2.5">
              <input className="input" placeholder="Recipient name" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} required />
              <input className="input" placeholder="Recipient phone" value={recipient.phone} onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })} required />
            </div>
            {needAddress ? (
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <input className="input col-span-2" placeholder="Street address" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} required />
                <input className="input" placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
                <input className="input" placeholder="Postcode" value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value })} required />
              </div>
            ) : (
              <p className="mt-2.5 rounded-lg bg-mist px-3 py-2.5 text-sm leading-relaxed text-brand-600">
                Pickup at <strong>Petals Wander Studio</strong> · 12 Jalan Bunga, KL.
                Mon–Sat, 10am–7pm. We&apos;ll notify the recipient when it&apos;s ready.
              </p>
            )}
          </Section>

          {/* Purchaser */}
          <Section title="Your details (purchaser)">
            <div className="grid grid-cols-2 gap-2.5">
              <input className="input" placeholder="Your name" value={purchaser.name} onChange={(e) => setPurchaser({ ...purchaser, name: e.target.value })} required />
              <input className="input" placeholder="Your phone" value={purchaser.phone} onChange={(e) => setPurchaser({ ...purchaser, phone: e.target.value })} required />
            </div>
          </Section>

          {/* Gift card message */}
          <Section title="Gift card message">
            <textarea
              className="input min-h-[80px]"
              placeholder="Write the message we'll print on the gift card…"
              maxLength={500}
              value={cardMessage}
              onChange={(e) => setCardMessage(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-brand-400">{cardMessage.length}/500 — printed on the card included with the flowers.</p>
          </Section>

          {/* Payment */}
          <Section title="Payment">
            <div className="mb-3 space-y-2">
              {settings?.card_enabled !== false && (
                <OptionRow active={payment === "card"} onClick={() => setPayment("card")} label="Credit / debit card" right="Instant" />
              )}
              {settings?.bank_enabled !== false && (
                <OptionRow active={payment === "bank"} onClick={() => setPayment("bank")} label="Bank transfer" right="Manual approval" />
              )}
            </div>

            {payment === "card" && (
              <div>
                <input className="input mb-2.5" placeholder="Card number" />
                <div className="grid grid-cols-2 gap-2.5">
                  <input className="input" placeholder="MM / YY" />
                  <input className="input" placeholder="CVC" />
                </div>
              </div>
            )}

            {payment === "bank" && settings && (
              <div className="rounded-lg border border-brand-200 bg-mist p-4">
                <div className="mb-2.5 text-sm font-semibold text-brand-800">Transfer to</div>
                <DetailRow label="Bank" value={settings.bank_name ?? "—"} />
                <DetailRow label="Account" value={settings.account_number ?? "—"} mono />
                <DetailRow label="Name" value={settings.account_name ?? "—"} />
                {settings.qr_path && (
                  <div className="mt-3 flex flex-col items-center border-t border-brand-100 pt-3">
                    <div className="mb-2 text-xs font-semibold text-brand-500">Scan to pay</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.qr_path}
                      alt="Scan to pay"
                      className="h-44 w-44 rounded-lg border border-brand-200 bg-white object-contain p-2"
                    />
                  </div>
                )}
                <div className="mt-3 border-t border-brand-100 pt-2.5">
                  <div className="mb-1.5 text-xs font-semibold text-brand-500">Upload payment proof</div>
                  <input
                    ref={receiptRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="block w-full text-xs text-brand-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700"
                  />
                </div>
                <p className="mt-3 rounded-lg bg-brand-100 px-3 py-2.5 text-xs leading-relaxed text-brand-700">
                  Your order is placed as <strong>Awaiting payment</strong>. An admin verifies the
                  transfer, then marks it paid to release for fulfilment.
                </p>
              </div>
            )}
          </Section>

          {/* Delivery terms */}
          {terms.trim() !== "" && (
            <Section title="Delivery terms & conditions">
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-brand-200 bg-mist p-3.5 text-xs leading-relaxed text-brand-600">
                {terms}
              </div>
              <label className="mt-2.5 flex cursor-pointer items-start gap-2.5 text-sm text-brand-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-brand-600"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                />
                <span>I have read and agree to the delivery terms &amp; conditions.</span>
              </label>
            </Section>
          )}
        </div>

        {/* summary */}
        <aside className="w-full flex-none rounded-xl border border-brand-100 bg-mist p-5 md:w-72">
          <h2 className="mb-3.5 font-semibold text-brand-900">Order Summary</h2>
          <ul className="space-y-1.5 text-sm">
            {items.map((i) => (
              <li key={`${i.product_id}:${i.variant_id ?? ""}`} className="flex justify-between text-brand-600">
                <span className="min-w-0 truncate">
                  {i.name}
                  {i.variant_label ? ` (${i.variant_label})` : ""} <span className="text-brand-400">× {i.quantity}</span>
                </span>
                <span className="ml-2 flex-none font-medium text-brand-800">{money(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-brand-100 pt-3 text-sm text-brand-600">
            <div className="flex justify-between py-0.5">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Delivery{delivery === "courier" && quote?.best ? ` · ${quote.best.label}` : ""}</span>
              <span>
                {courierPending ? (quoting ? "Calculating…" : "Enter address") : fee === 0 ? "Free" : money(fee)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-brand-100 pt-2 text-base font-bold text-brand-900">
              <span>Total</span>
              <span>{courierPending ? "—" : money(subtotal + fee)}</span>
            </div>
          </div>
          <Button type="submit" className="mt-4 w-full" disabled={courierPending}>
            {courierPending && quoting ? "Pricing delivery…" : "Place order"}
          </Button>
        </aside>
      </form>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !submitting && setShowConfirm(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-brand-100 px-5 py-4">
              <h2 className="font-serif text-xl font-semibold text-brand-900">Confirm your order</h2>
              <p className="mt-0.5 text-xs text-brand-400">Please review before we place it.</p>
            </div>
            <div className="space-y-2 px-5 py-4 text-sm">
              <ConfirmRow label="Send to" value={`${recipient.name}${recipient.phone ? ` · ${recipient.phone}` : ""}`} />
              <ConfirmRow
                label="Delivery"
                value={
                  delivery === "standard"
                    ? `Standard${deliveryDate ? ` · ${new Date(deliveryDate).toLocaleDateString()}` : ""}`
                    : delivery === "same_day"
                    ? "Same-day"
                    : delivery === "courier"
                    ? `Courier${quote?.best ? ` · ${quote.best.label}` : ""}`
                    : "Self-pickup"
                }
              />
              {needAddress && address.street && <ConfirmRow label="Address" value={`${address.street}, ${address.city} ${address.postcode}`} />}
              <ConfirmRow label="Payment" value={payment === "card" ? "Card" : "Bank transfer"} />
              {cardMessage && <ConfirmRow label="Card note" value={`“${cardMessage}”`} />}
              <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-bold text-brand-900">
                <span>Total</span>
                <span>{money(subtotal + fee)}</span>
              </div>
            </div>
            <div className="flex gap-2.5 border-t border-brand-100 px-5 py-4">
              <Button type="button" variant="secondary" className="flex-1" disabled={submitting} onClick={() => setShowConfirm(false)}>
                Back
              </Button>
              <Button type="button" className="flex-1" disabled={submitting} onClick={submitOrder}>
                {submitting ? "Placing…" : "Confirm & place order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-brand-600">
      <span className="flex-none text-brand-400">{label}</span>
      <span className="min-w-0 text-right font-medium text-brand-800">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-3 font-semibold text-brand-900">{title}</h2>
      {children}
    </div>
  );
}

function Segment({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border py-2.5 text-center text-xs font-semibold transition ${
        active ? "border-brand-600 bg-brand-100 text-brand-700" : "border-brand-200 bg-white text-brand-600"
      }`}
    >
      {children}
    </button>
  );
}

function OptionRow({ active, onClick, label, right }: { active: boolean; onClick: () => void; label: string; right: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-3 text-left text-sm transition ${
        active ? "border-2 border-brand-600 bg-brand-100 font-semibold text-brand-700" : "border-brand-200 bg-white text-brand-600"
      }`}
    >
      <span>{label}</span>
      <span className="font-semibold">{right}</span>
    </button>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-xs text-brand-600">
      <span>{label}</span>
      <span className={`text-brand-800 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
