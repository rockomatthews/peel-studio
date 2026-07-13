import { requireEnv } from "@/lib/runtime";

const API_BASE = "https://api.printify.com/v1";

type PrintifyAddress = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  address1: string;
  address2: string;
  city: string;
  zip: string;
};

async function printifyRequest<T>(path: string, init: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireEnv("PRINTIFY_API_TOKEN")}`,
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": "Peel-Studio/1.0",
      ...init.headers,
    },
    cache: "no-store",
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Printify ${response.status}: ${body.slice(0, 500)}`);
  }
  return (body ? JSON.parse(body) : {}) as T;
}

export async function submitPrintifyOrder(input: {
  externalId: string;
  imageUrl: string;
  quantity: number;
  address: PrintifyAddress;
}) {
  const shopId = requireEnv("PRINTIFY_SHOP_ID");
  return printifyRequest<{ id: string }>(`/shops/${shopId}/orders.json`, {
    method: "POST",
    body: JSON.stringify({
      external_id: input.externalId,
      label: `Peel ${input.externalId.slice(-8)}`,
      line_items: [
        {
          print_provider_id: Number(requireEnv("PRINTIFY_PRINT_PROVIDER_ID")),
          blueprint_id: Number(requireEnv("PRINTIFY_BLUEPRINT_ID")),
          variant_id: Number(requireEnv("PRINTIFY_VARIANT_ID")),
          print_areas: {
            [process.env.PRINTIFY_PRINT_AREA || "front"]: input.imageUrl,
          },
          quantity: input.quantity,
          external_id: `${input.externalId}-art`,
        },
      ],
      shipping_method: Number(process.env.PRINTIFY_SHIPPING_METHOD || "1"),
      send_shipping_notification: true,
      address_to: input.address,
    }),
  });
}

export async function sendPrintifyOrderToProduction(orderId: string) {
  const shopId = requireEnv("PRINTIFY_SHOP_ID");
  return printifyRequest<{ id: string }>(
    `/shops/${shopId}/orders/${orderId}/send_to_production.json`,
    { method: "POST" },
  );
}
