import { timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";

function secretMatches(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.PRINTIFY_WEBHOOK_SECRET;
  const received = new URL(request.url).searchParams.get("secret") || "";
  if (!expected || !secretMatches(received, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await request.json()) as {
    type?: string;
    resource?: {
      id?: string;
      data?: { status?: string; carrier?: { tracking_url?: string } };
    };
  };
  const orderId = payload.resource?.id;
  if (!orderId) return Response.json({ received: true });

  const statusMap: Record<string, string> = {
    "order:sent-to-production": "in_production",
    "order:shipment:created": "shipped",
    "order:shipment:delivered": "delivered",
  };
  const nextStatus = statusMap[payload.type || ""] || payload.resource?.data?.status;
  if (nextStatus) {
    const sql = getSql();
    await sql`
      UPDATE orders
      SET status = ${nextStatus},
          tracking_url = COALESCE(${payload.resource?.data?.carrier?.tracking_url || null}, tracking_url),
          updated_at = NOW()
      WHERE printify_order_id = ${orderId}
    `;
  }
  return Response.json({ received: true });
}
