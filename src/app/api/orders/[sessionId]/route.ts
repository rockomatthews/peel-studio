import { getOrderBySession } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/orders/[sessionId]">) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId.startsWith("cs_")) return Response.json({ error: "Not found" }, { status: 404 });
    const order = await getOrderBySession(sessionId);
    if (!order) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      status: order.status,
      trackingUrl: order.tracking_url,
      quantity: order.quantity,
    });
  } catch {
    return Response.json({ status: "processing" });
  }
}
