# Peel Studio

An autonomous custom-sticker storefront built with Next.js, OpenAI image generation, Stripe Checkout, Printify fulfillment, Neon Postgres, and Vercel Blob.

## Customer flow

1. A customer describes a sticker and chooses an art direction.
2. OpenAI generates transparent, print-ready PNG artwork.
3. The PNG is saved to Vercel Blob and the design record is saved to Postgres.
4. Stripe Checkout collects payment, name, phone, email, and shipping address.
5. A signed Stripe webhook submits the paid order to Printify.
6. Printify creates the custom product during order submission, then optionally sends it directly to production.
7. Printify webhooks update production, shipment, tracking, and delivery status.

Webhook fulfillment is idempotent: the Stripe Checkout Session ID is unique locally and is also used as Printify's external order ID. Failed Stripe webhook responses return `500`, so Stripe retries the fulfillment automatically.

## Run locally in preview mode

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. With no service credentials, the full interface runs in preview mode with sample artwork and checkout disabled.

## Production setup

Copy `.env.example` to `.env.local` and add the credentials when ready. Never commit `.env.local`.

### 1. Vercel storage

Create a Vercel project for this repo. Add:

- a Vercel Blob store, which provides `BLOB_READ_WRITE_TOKEN`
- Neon from the Vercel Marketplace, which provides `DATABASE_URL`

Run [`db/001_init.sql`](db/001_init.sql) against the Neon database once.

### 2. OpenAI

Add `OPENAI_API_KEY`. `OPENAI_IMAGE_MODEL` defaults to `gpt-image-1.5`, which supports transparent PNG output. The OpenAI client is initialized only at request time, so builds remain safe before the key is connected.

### 3. Stripe

Add Stripe through the Vercel Marketplace or add `STRIPE_SECRET_KEY` manually. Register this endpoint in Stripe:

```text
https://YOUR_DOMAIN/api/webhooks/stripe
```

Listen for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copy the endpoint signing secret to `STRIPE_WEBHOOK_SECRET`. Stripe Checkout is configured to collect shipping address, email, phone, and terms acceptance.

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 4. Printify

Create an API-connected shop and a personal access token with these scopes:

- `shops.read`
- `catalog.read`
- `orders.read`
- `orders.write`

Choose a sticker blueprint, print provider, and variant from the Printify catalog. Put those numeric IDs into `PRINTIFY_BLUEPRINT_ID`, `PRINTIFY_PRINT_PROVIDER_ID`, and `PRINTIFY_VARIANT_ID`. The selected variant must support the placeholder in `PRINTIFY_PRINT_AREA` (usually `front`).

Useful API checks:

```bash
curl -H "Authorization: Bearer $PRINTIFY_API_TOKEN" https://api.printify.com/v1/shops.json
curl -H "Authorization: Bearer $PRINTIFY_API_TOKEN" https://api.printify.com/v1/catalog/blueprints.json
curl -H "Authorization: Bearer $PRINTIFY_API_TOKEN" https://api.printify.com/v1/catalog/blueprints/BLUEPRINT_ID/print_providers.json
curl -H "Authorization: Bearer $PRINTIFY_API_TOKEN" https://api.printify.com/v1/catalog/blueprints/BLUEPRINT_ID/print_providers/PROVIDER_ID/variants.json
```

Create Printify webhook subscriptions pointing to:

```text
https://YOUR_DOMAIN/api/webhooks/printify?secret=YOUR_PRINTIFY_WEBHOOK_SECRET
```

Recommended topics:

- `order:updated`
- `order:sent-to-production`
- `order:shipment:created`
- `order:shipment:delivered`

Leave `PRINTIFY_AUTO_SEND_TO_PRODUCTION=false` for test orders. When the selected product, retail price, shipping coverage, margins, tax setup, and Printify billing method have all been verified, set it to `true` for immediate hands-off production.

## Launch checklist

- Replace the starter privacy policy and terms with business-specific, legally reviewed documents.
- Confirm the selected Printify variant's print area, resolution, product cost, shipping cost, and supported countries.
- Reprice the packs in `src/lib/catalog.ts` after calculating OpenAI, Stripe, Printify, shipping, replacement, and tax costs.
- Configure Stripe tax behavior for the jurisdictions where the business has obligations.
- Run at least one end-to-end Stripe test-mode order and one controlled Printify sample order.
- Add support contact details and a refund/reprint process before accepting live orders.
- Verify `/api/health` returns `{"status":"ready"}` on the production domain.

## Commands

```bash
npm run dev
npm run lint
npm run build
```
