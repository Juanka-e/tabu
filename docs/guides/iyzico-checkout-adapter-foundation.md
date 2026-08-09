# iyzico Checkout Form Adapter Foundation

## Current Status

The iyzico Checkout Form foundation is implemented but intentionally disabled.
It is not connected to checkout routes, UI, webhooks, fulfillment, or production
configuration. `adapterAvailable=false` remains the activation boundary.

```env
IYZICO_API_KEY=""
IYZICO_SECRET_KEY=""
IYZICO_CHECKOUT_MODE=disabled
```

Only `sandbox` credentials are accepted by the transport foundation. The API host
is fixed in code to `https://sandbox-api.iyzipay.com`; an environment-controlled
base URL is not supported. This prevents provider configuration from becoming an
SSRF surface.

## Implemented Boundary

- Checkout Form initialize and retrieve request contracts.
- Official `IYZWSv2` HMAC-SHA256 authorization construction.
- Exact minor-unit to decimal conversion for the server-owned order amount.
- Fixed initialize/retrieve paths and bounded 1-30 second request timeout.
- 64 KiB response limit and bounded internal error codes.
- Hosted payment URL allowlist limited to HTTPS `iyzipay.com` hosts.
- Constant-time token comparison after equal-length validation.
- Response minimization: provider HTML, card metadata, and error text are not
  returned from the adapter.

The browser callback and its `token` are not payment proof. A future orchestration
layer must retrieve the Checkout Form result server-side and verify at least the
order/conversation reference, token, exact price, paid price, currency,
`paymentStatus`, and `fraudStatus` before fulfillment.

## Activation Blockers

iyzico Checkout Form requires buyer identity, phone, IP, and address fields. The
application does not collect or persist new fields merely to activate an adapter.
Before route integration, the following need explicit product/legal decisions:

1. Which fields are strictly required for the selected product and merchant setup.
2. Privacy notice and consent versioning for each collected field.
3. Encryption, access control, retention, deletion, and support visibility policy.
4. Guest exclusion and verified registered-account requirements.
5. Durable checkout-attempt state for uncertain network outcomes.

Most iyzico API operations are not generally idempotent. A timeout after initialize
must become an `uncertain` durable attempt; it must not trigger a blind retry that
could create a second provider session.

## Next Slices

1. Buyer data and legal/privacy contract decision.
2. Durable Checkout Form initialize/retrieve orchestration and callback endpoint.
3. Signature V3 webhook verifier, durable inbox processor, and reconciliation.
4. Real merchant sandbox acceptance with exact amount/currency proof.
5. Separate reviewed live-mode activation.

Only Signature V3 should be accepted for future webhooks. Deprecated signature
formats are not an acceptable compatibility fallback.

## Official References

- [HMACSHA256 authentication](https://docs.iyzico.com/en/getting-started/preliminaries/authentication/hmacsha256-auth)
- [Idempotency](https://docs.iyzico.com/en/getting-started/preliminaries/idempotency)
- [Checkout Form initialize](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize)
- [Checkout Form retrieve](https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-retrieve)
- [Webhook Signature V3](https://docs.iyzico.com/en/advanced/webhook)
- [Sandbox environment](https://docs.iyzico.com/en/getting-started/preliminaries/sandbox)
