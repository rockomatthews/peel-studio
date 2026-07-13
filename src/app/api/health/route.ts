import { paidFlowReadiness } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = paidFlowReadiness();
  return Response.json(
    { status: readiness.ready ? "ready" : "preview", missing: readiness.missing },
    { headers: { "Cache-Control": "no-store" } },
  );
}
