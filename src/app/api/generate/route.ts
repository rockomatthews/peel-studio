import {
  generateSticker,
  GenerationConfigurationError,
  GenerationPipelineError,
} from "@/lib/generate-sticker";
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
    if (error instanceof GenerationPipelineError) {
      const labels = {
        reference_upload: "loading the reference image",
        openai: "OpenAI image creation",
        artwork_processing: "preparing the print-ready artwork",
        blob_storage: "saving the artwork",
        database: "saving the design record",
      } as const;
      return Response.json(
        {
          error: `Sticker generation failed during ${labels[error.stage]}. No substitute artwork was used.`,
          stage: error.stage,
          ...(error.stage === "openai"
            ? {
                providerStatus: error.providerStatus,
                providerCode: error.providerCode,
                providerType: error.providerType,
                providerParam: error.providerParam,
              }
            : {}),
          ...(error.stage === "blob_storage" && error.safeDetail
            ? { storageError: error.safeDetail }
            : {}),
        },
        { status: 500 },
      );
    }
    return Response.json(
      { error: "OpenAI could not create this sticker. No substitute artwork was used; please try again." },
      { status: 500 },
    );
  }
}
