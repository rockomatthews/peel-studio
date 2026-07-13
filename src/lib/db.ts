import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sqlClient: NeonQueryFunction<false, false> | null = null;

export function getSql() {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    sqlClient = neon(url);
  }
  return sqlClient;
}

export type DesignRecord = {
  id: string;
  prompt: string;
  art_prompt: string;
  style: string;
  shape: string;
  image_url: string;
  status: string;
  variant_id: number;
  print_canvas_width: number;
  print_canvas_height: number;
  print_area: string;
  decoration_method: string;
  subject_count: number;
  reference_urls: string[];
};

export type OrderRecord = {
  id: string;
  design_id: string;
  stripe_session_id: string;
  pack_id: string;
  quantity: number;
  amount_cents: number;
  status: string;
  printify_order_id: string | null;
  tracking_url: string | null;
  fulfillment_error: string | null;
};

export async function saveDesign(input: Omit<DesignRecord, "status">) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO designs (
      id, prompt, art_prompt, style, shape, image_url, status,
      variant_id, print_canvas_width, print_canvas_height, print_area, decoration_method,
      subject_count, reference_urls
    )
    VALUES (
      ${input.id}, ${input.prompt}, ${input.art_prompt}, ${input.style}, ${input.shape}, ${input.image_url}, 'ready',
      ${input.variant_id}, ${input.print_canvas_width}, ${input.print_canvas_height},
      ${input.print_area}, ${input.decoration_method},
      ${input.subject_count}, ${JSON.stringify(input.reference_urls)}::jsonb
    )
    RETURNING id
  `;
  return rows[0] as { id: string };
}

export async function getDesign(id: string) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM designs WHERE id = ${id} LIMIT 1`;
  return (rows[0] as DesignRecord | undefined) ?? null;
}

export async function createOrder(input: {
  id: string;
  designId: string;
  stripeSessionId: string;
  packId: string;
  quantity: number;
  amountCents: number;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO orders (id, design_id, stripe_session_id, pack_id, quantity, amount_cents, status)
    VALUES (${input.id}, ${input.designId}, ${input.stripeSessionId}, ${input.packId}, ${input.quantity}, ${input.amountCents}, 'checkout_created')
    ON CONFLICT (stripe_session_id) DO NOTHING
  `;
}

export async function getOrderBySession(sessionId: string) {
  const sql = getSql();
  const rows = await sql`SELECT * FROM orders WHERE stripe_session_id = ${sessionId} LIMIT 1`;
  return (rows[0] as OrderRecord | undefined) ?? null;
}
