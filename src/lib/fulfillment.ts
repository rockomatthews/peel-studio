import type Stripe from "stripe";
import { getDesign, getOrderBySession, getSql } from "@/lib/db";
import {
  sendPrintifyOrderToProduction,
  submitPrintifyOrder,
} from "@/lib/printify";
import { getStripe } from "@/lib/stripe";

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts.shift() || "Customer",
    lastName: parts.join(" ") || "Customer",
  };
}

export async function fulfillCheckout(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status === "unpaid") return { status: "awaiting_payment" };

  let order = await getOrderBySession(sessionId);
  if (!order) throw new Error(`No local order for Stripe session ${sessionId}`);
  if (["submitted", "in_production", "shipped", "delivered"].includes(order.status)) {
    return { status: order.status, printifyOrderId: order.printify_order_id };
  }

  const shipping = session.collected_information?.shipping_details;
  const customer = session.customer_details;
  if (!shipping?.address) throw new Error("Paid checkout is missing a shipping address");
  if (!customer?.email) throw new Error("Paid checkout is missing a customer email");
  if (!shipping.address.country || !shipping.address.line1) {
    throw new Error("Paid checkout has an incomplete shipping address");
  }
  const address = shipping.address;
  const country = shipping.address.country;
  const addressLine1 = shipping.address.line1;
  const customerEmail = customer.email;

  const sql = getSql();
  const claimed = await sql`
    UPDATE orders
    SET status = 'fulfilling', fulfillment_attempted_at = NOW(),
        customer_email = ${customerEmail}, shipping_name = ${shipping.name},
        shipping_address = ${JSON.stringify(address)}::jsonb,
        updated_at = NOW()
    WHERE stripe_session_id = ${sessionId}
      AND (
        status IN ('checkout_created', 'fulfillment_failed')
        OR (status = 'fulfilling' AND fulfillment_attempted_at < NOW() - INTERVAL '10 minutes')
      )
    RETURNING id
  `;

  if (!claimed.length) {
    order = await getOrderBySession(sessionId);
    return { status: order?.status || "fulfilling", printifyOrderId: order?.printify_order_id };
  }

  try {
    const design = await getDesign(order.design_id);
    if (!design) throw new Error(`Design ${order.design_id} no longer exists`);

    let printifyOrderId = order.printify_order_id;
    if (!printifyOrderId) {
      const { firstName, lastName } = splitName(shipping.name);
      const created = await submitPrintifyOrder({
        externalId: session.id,
        imageUrl: design.image_url,
        quantity: order.quantity,
        address: {
          first_name: firstName,
          last_name: lastName,
          email: customerEmail,
          phone: customer.phone || "",
          country,
          region: address.state || "",
          address1: addressLine1,
          address2: address.line2 || "",
          city: address.city || "",
          zip: address.postal_code || "",
        },
      });
      printifyOrderId = created.id;
      await sql`
        UPDATE orders SET printify_order_id = ${printifyOrderId}, status = 'submitted', updated_at = NOW()
        WHERE stripe_session_id = ${sessionId}
      `;
    }

    let status = "submitted";
    if (process.env.PRINTIFY_AUTO_SEND_TO_PRODUCTION === "true") {
      await sendPrintifyOrderToProduction(printifyOrderId);
      status = "in_production";
    }

    await sql`
      UPDATE orders
      SET status = ${status}, fulfillment_error = NULL, updated_at = NOW()
      WHERE stripe_session_id = ${sessionId}
    `;
    return { status, printifyOrderId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fulfillment error";
    await sql`
      UPDATE orders
      SET status = 'fulfillment_failed', fulfillment_error = ${message.slice(0, 1000)}, updated_at = NOW()
      WHERE stripe_session_id = ${sessionId}
    `;
    throw error;
  }
}

export type StripeCheckoutSession = Stripe.Checkout.Session;
