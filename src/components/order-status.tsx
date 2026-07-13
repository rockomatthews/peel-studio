"use client";

import { Check, LoaderCircle, PackageCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";

const copy: Record<string, { title: string; text: string }> = {
  checkout_created: { title: "Payment received", text: "We’re preparing your artwork for the printer." },
  fulfilling: { title: "Sending to the printer", text: "Your order is moving into Printify now." },
  submitted: { title: "Order submitted", text: "Printify has your custom sticker order." },
  in_production: { title: "Your stickers are printing", text: "The presses are doing their thing." },
  shipped: { title: "Your stickers shipped", text: "They’re officially on the move." },
  delivered: { title: "Delivered", text: "Go stick something great." },
  fulfillment_failed: { title: "We’re reviewing your order", text: "Payment is safe. The print handoff needs attention." },
};

export function OrderStatus({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState("fulfilling");
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      const response = await fetch(`/api/orders/${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      if (response.ok && active) {
        const body = await response.json();
        setStatus(body.status || "fulfilling");
        setTrackingUrl(body.trackingUrl || null);
      }
    }
    poll();
    const timer = window.setInterval(poll, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [sessionId]);

  const message = copy[status] || copy.fulfilling;
  const Icon = status === "shipped" ? Truck : status === "delivered" ? PackageCheck : status === "in_production" || status === "submitted" ? Check : LoaderCircle;

  return (
    <div className="success-status">
      <span className="success-icon"><Icon className={status === "fulfilling" ? "spin" : ""} size={28} /></span>
      <p className="eyebrow">Order confirmed</p><h1>{message.title}</h1><p>{message.text}</p>
      {trackingUrl && <a className="checkout-button" href={trackingUrl} target="_blank" rel="noreferrer">Track your package <Truck size={18} /></a>}
      <small>Order reference: {sessionId.slice(-10)}</small>
    </div>
  );
}
