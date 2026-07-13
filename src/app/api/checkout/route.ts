import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { getPack } from "@/lib/catalog";
import { createOrder, getDesign } from "@/lib/db";
import { appUrl, paidFlowReadiness } from "@/lib/runtime";
import { checkoutSchema } from "@/lib/schemas";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const readiness = paidFlowReadiness();
    if (!readiness.ready) {
      return Response.json(
        { error: "Checkout is still in preview mode. Connect the production services first." },
        { status: 503 },
      );
    }

    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid checkout" }, { status: 400 });

    const design = await getDesign(parsed.data.designId);
    const pack = getPack(parsed.data.packId);
    if (!design || !pack || design.status !== "ready") {
      return Response.json({ error: "That design is not ready for checkout." }, { status: 404 });
    }

    const allowedCountries = (process.env.SHIPPING_COUNTRIES || "US,CA")
      .split(",")
      .map((country) => country.trim().toUpperCase())
      .filter(Boolean) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.priceCents,
            product_data: {
              name: `Custom sticker pack — ${pack.label}`,
              description: "Your original AI-created sticker, printed and shipped to you.",
              images: [design.image_url],
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: allowedCountries },
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      consent_collection: { terms_of_service: "required" },
      customer_creation: "always",
      client_reference_id: design.id,
      metadata: { design_id: design.id, pack_id: pack.id, quantity: String(pack.quantity) },
      success_url: `${appUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/?checkout=cancelled#studio`,
    });

    await createOrder({
      id: randomUUID(),
      designId: design.id,
      stripeSessionId: session.id,
      packId: pack.id,
      quantity: pack.quantity,
      amountCents: pack.priceCents,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Checkout creation failed", error);
    return Response.json({ error: "Checkout could not be started." }, { status: 500 });
  }
}
