import { paidFlowReadiness } from "@/lib/runtime";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

const requiredColumns = {
  designs: [
    "id", "prompt", "art_prompt", "style", "shape", "image_url", "status",
    "variant_id", "print_canvas_width", "print_canvas_height", "print_area",
    "decoration_method", "subject_count", "reference_urls",
  ],
  orders: [
    "id", "design_id", "stripe_session_id", "pack_id", "quantity", "amount_cents",
    "status", "customer_email", "shipping_name", "shipping_address",
    "printify_order_id", "tracking_url", "fulfillment_error",
  ],
} as const;

async function databaseHealth() {
  if (!process.env.DATABASE_URL) return { ready: false, error: "DATABASE_URL is missing" };
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('designs', 'orders')
    ` as Array<{ table_name: string; column_name: string }>;
    const found = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
    const missing = Object.entries(requiredColumns).flatMap(([table, columns]) =>
      columns
        .filter((column) => !found.has(`${table}.${column}`))
        .map((column) => `${table}.${column}`),
    );
    return { ready: missing.length === 0, missing };
  } catch (error) {
    console.error("Database health check failed", error);
    return { ready: false, error: "Database connection or schema check failed" };
  }
}

export async function GET() {
  const readiness = paidFlowReadiness();
  const database = await databaseHealth();
  const ready = readiness.ready && database.ready;
  return Response.json(
    { status: ready ? "ready" : "setup_required", missing: readiness.missing, database },
    { headers: { "Cache-Control": "no-store" } },
  );
}
