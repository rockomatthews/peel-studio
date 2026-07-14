# Peel Studio

An autonomous custom-sticker storefront built with Next.js, OpenAI image generation, Stripe Checkout, Printify fulfillment, Neon Postgres, and Vercel Blob.

## Customer flow

1. A customer describes a sticker and chooses an art direction.
2. OpenAI follows the customer's prompt directly. Customers may supply up to three authoritative reference images; there are no injected style or “vibe” controls.
3. The server isolates the artwork, fits it inside the selected Printify variant's exact placeholder dimensions and safe margin, and exports a transparent PNG.
4. The PNG is saved to Vercel Blob and the selected variant/canvas is frozen in Postgres.
5. Stripe Checkout collects payment, name, phone, email, and shipping address.
6. A signed Stripe webhook submits the paid order to Printify.
7. Printify creates the custom product during order submission, then optionally sends it directly to production.
8. Printify webhooks update production, shipment, tracking, and delivery status.

Webhook fulfillment is idempotent: the Stripe Checkout Session ID is unique locally and is also used as Printify's external order ID. Failed Stripe webhook responses return `500`, so Stripe retries the fulfillment automatically.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The interface loads without credentials, but generation returns an explicit configuration error until `OPENAI_API_KEY` is present. It never substitutes canned sample art for a customer's prompt. With OpenAI configured but Blob or Postgres still missing, it returns the real generated artwork with checkout disabled.

## Production setup

Copy `.env.example` to `.env.local` and add the credentials when ready. Never commit `.env.local`.

### 1. Vercel storage

Create a Vercel project for this repo. Add:

- a Vercel Blob store, which provides `BLOB_READ_WRITE_TOKEN`
- Neon from the Vercel Marketplace, which provides `DATABASE_URL`

The production server creates the required Neon tables automatically before the first paid image generation. The SQL files in [`db`](db) remain available for manual recovery or inspection; use [`db/001_init.sql`](db/001_init.sql) for a new database and [`db/002_print_constraints.sql`](db/002_print_constraints.sql) only for an older installation.

### 2. OpenAI

Add `OPENAI_API_KEY`. The app defaults to `gpt-image-2`, OpenAI's current highest-quality image model. Because that model does not currently emit transparent backgrounds, the app asks for a uniform neutral background, removes only edge-connected background pixels, then trims, scales, pads, and exports an exact-size transparent PNG. `gpt-image-1.5` remains compatible if native transparency is preferred.

Reference images are uploaded directly to Vercel Blob, fetched server-side for the OpenAI edit request, and deleted after the generation attempt. Accepted formats are PNG, JPG, and WebP; the limit is three files at 8 MB each.

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

Choose a sticker blueprint, print provider, and one or more variants from the Printify catalog. Put those numeric IDs into `PRINTIFY_BLUEPRINT_ID`, `PRINTIFY_PRINT_PROVIDER_ID`, and `PRINTIFY_VARIANT_IDS`. Start with one variant until its cost and shipping have been sample-tested. The selected variants must expose the placeholder in `PRINTIFY_PRINT_AREA` (usually `front`).

### How the Printify environment variables work

| Variable | What it controls |
| --- | --- |
| `PRINTIFY_API_TOKEN` | Secret personal access token used as the server-side Bearer credential. Create it with `shops.read`, `catalog.read`, `orders.read`, and `orders.write`; add webhook scopes if subscriptions will be created through the API. Printify personal access tokens currently expire after one year. |
| `PRINTIFY_SHOP_ID` | The numeric API-connected store that receives each paid order. Get it from `GET /v1/shops.json`. It is not the public shop name. |
| `PRINTIFY_BLUEPRINT_ID` | The base catalog product, such as a particular sticker product. A blueprint defines compatible providers and product options. |
| `PRINTIFY_PRINT_PROVIDER_ID` | The company that prints and ships that blueprint. It determines variants, costs, availability, shipping coverage, and printable placeholders. |
| `PRINTIFY_VARIANT_IDS` | Comma-separated allowed SKUs for that blueprint/provider combination. A variant is a concrete option combination such as size, material, or finish. The UI only exposes IDs in this allow-list. |
| `PRINTIFY_PRINT_AREA` | Placeholder position to use, commonly `front`. The app matches this against the selected variant and reads that placeholder's exact `width` and `height`. |
| `PRINTIFY_DECORATION_METHOD` | Optional placeholder filter when a product exposes multiple printing methods at the same position. Leave blank unless the catalog response requires disambiguation. |
| `PRINTIFY_SHIPPING_METHOD` | Shipping tier sent with the order: `1` standard, `2` priority, or `3` Printify Express where supported. Begin with `1`; available methods still depend on the provider/product/destination. |
| `PRINTIFY_AUTO_SEND_TO_PRODUCTION` | `false` creates the Printify order but leaves production manual. `true` immediately sends a paid order to production and can create real Printify charges. |
| `PRINTIFY_WEBHOOK_SECRET` | A random secret you choose and append to the webhook callback URL. This app checks it before accepting Printify status updates. It is not the API token. |
| `PRINT_SAFE_MARGIN` | Internal artwork padding as a fraction of the canvas. The default `0.08` protects 8% on each edge before uploading the exact-size PNG. |

The route `/api/print-options` fetches the configured catalog variants and returns only the allow-listed choices. Generation cannot begin without one of those IDs. The backend then uses the selected placeholder dimensions—not a guessed inch-to-pixel conversion—for prompt composition and final Sharp processing. Variant ID, canvas size, print position, and decoration method are stored with the design, so fulfillment uses the same immutable selection after payment.

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
- If more than one variant is exposed, confirm that the current pack prices remain profitable for every variant; pack pricing is presently shared across sizes.
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
