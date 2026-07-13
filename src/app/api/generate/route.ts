import { generateSticker } from "@/lib/generate-sticker";
import { generateSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Invalid prompt" },
        { status: 400 },
      );
    }

    const design = await generateSticker(parsed.data);
    return Response.json(design);
  } catch (error) {
    console.error("Sticker generation failed", error);
    return Response.json(
      { error: "We could not create that sticker. Try a different prompt." },
      { status: 500 },
    );
  }
}
