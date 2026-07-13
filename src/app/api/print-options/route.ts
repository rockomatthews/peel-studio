import { getPrintOptions } from "@/lib/print-options";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const options = await getPrintOptions();
    return Response.json({ options });
  } catch (error) {
    console.error("Printify catalog lookup failed", error);
    return Response.json(
      { error: "Sticker print options are temporarily unavailable." },
      { status: 503 },
    );
  }
}
