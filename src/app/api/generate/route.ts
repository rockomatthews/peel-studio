import { generateSticker, GenerationConfigurationError } from "@/lib/generate-sticker";
import { generateSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    if (error instanceof GenerationConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return Response.json(
      { error: "OpenAI could not create this sticker. No substitute artwork was used; please try again." },
      { status: 500 },
    );
  }
}
