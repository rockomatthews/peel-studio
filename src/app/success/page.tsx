import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { OrderStatus } from "@/components/order-status";
import { fulfillCheckout } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  if (sessionId?.startsWith("cs_") && process.env.STRIPE_SECRET_KEY && process.env.DATABASE_URL) {
    try { await fulfillCheckout(sessionId); } catch (error) { console.error("Landing-page fulfillment attempt failed", error); }
  }
  return (
    <main className="success-page">
      <Link href="/"><BrandMark /></Link>
      {sessionId ? <OrderStatus sessionId={sessionId} /> : <div className="success-status"><h1>Order not found</h1><p>We need a valid checkout reference to show this order.</p></div>}
      <Link href="/" className="back-link">Create another sticker</Link>
    </main>
  );
}
