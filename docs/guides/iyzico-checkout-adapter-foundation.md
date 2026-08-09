# iyzico Checkout Form Adapter Foundation

## Current Status

The iyzico Checkout Form transport and durable orchestration foundation are
implemented but intentionally disabled. They are not connected to checkout
routes, UI, webhooks, fulfillment, or production configuration.
`adapterAvailable=false` remains the activation boundary.

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

The browser callback and its `token` are not payment proof. The orchestration
retrieves the Checkout Form result server-side and verifies the order/conversation
reference, token, exact price, paid price, and currency. It stores a minimized
verification record containing provider payment reference, payment/risk status,
amount, currency, and verification time. Retrieve does not mark the order paid or
run fulfillment while webhook activation remains incomplete.

## Durable Orchestration

- The order row is locked before creating an initialize attempt.
- A live request lease blocks concurrent initialize calls.
- A successful hosted URL is stored server-side so a repeated request resumes the
  same provider session instead of creating another one.
- Token correlation in attempt diagnostics uses SHA-256; raw buyer identity,
  phone, and address values are never persisted or hashed.
- Initialize timeout, transport failure, malformed success response, and expired
  request leases become durable `uncertain` attempts.
- An uncertain attempt opens a reconciliation case and blocks blind retry.
- Callback tokens are compared against the server-owned session reference before
  provider access, then checked again after the order row is locked.
- Exact amount/currency mismatches do not create a verification record.

`providerHostedUrl` and `providerSessionReference` are operational session data,
not public order fields. Future routes must return them only to the authenticated
order owner and must never log them.

## Buyer Data Contract

The request-only buyer data schema and `buyer-data-v1` consent snapshot are now
implemented. National identity, phone, and address values are not persisted or
hashed locally. See `docs/guides/payment-buyer-data-policy.md`.

## Activation Blockers

iyzico Checkout Form requires buyer identity, phone, IP, and address fields. The
application does not collect or persist new fields merely to activate an adapter.
Before route integration, the following need explicit product/legal decisions:

1. Merchant-specific confirmation of every required field.
2. Provider/subprocessor and domestic or cross-border transfer legal review.
3. Just-in-time player UI and a new approved privacy notice version.
4. Guest exclusion and verified registered-account enforcement in orchestration.
5. Real merchant sandbox acceptance and reviewed session-data retention.

Most iyzico API operations are not generally idempotent. A timeout after initialize
becomes an `uncertain` durable attempt and cannot trigger a blind retry that could
create a second provider session.

## Next Slices

1. Merchant-specific legal/privacy and transfer approval.
2. Signature V3 webhook verifier, durable inbox processor, and reconciliation.
3. Owner-only checkout/callback routes and just-in-time buyer-data UI.
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
