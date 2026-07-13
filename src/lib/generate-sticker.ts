import { put } from "@vercel/blob";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { saveDesign } from "@/lib/db";
import type { GenerateInput } from "@/lib/schemas";

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const styleDirection: Record<GenerateInput["style"], string> = {
  bold: "bold mascot illustration, thick confident outlines, punchy color blocking",
  retro: "vintage screen-print illustration, limited warm palette, subtle ink texture",
  minimal: "minimal vector icon, few precise shapes, crisp negative space",
  weird: "cute surreal mascot, charmingly odd details, expressive and playful",
};

export function buildArtPrompt(input: GenerateInput) {
  return [
    `Create one original sticker illustration of: ${input.prompt}.`,
    `Visual direction: ${styleDirection[input.style]}.`,
    `Sticker shape intent: ${input.shape}.`,
    "Centered composition with a clear silhouette, generous safe margin, and a clean white kiss-cut border.",
    "Transparent background outside the sticker. No mockup, no hand, no wall, no product photo, no sheet of multiple stickers.",
    "Avoid copyrighted characters, brand logos, celebrity likenesses, watermarks, and illegible filler text.",
    "Production-ready square artwork, high contrast, readable at three inches.",
  ].join(" ");
}

export async function generateSticker(input: GenerateInput) {
  const id = randomUUID();
  const artPrompt = buildArtPrompt(input);
  const liveReady = Boolean(
    process.env.OPENAI_API_KEY &&
      process.env.BLOB_READ_WRITE_TOKEN &&
      process.env.DATABASE_URL,
  );

  if (!liveReady) {
    return {
      id,
      imageUrl: "/demo-sticker.svg",
      artPrompt,
      demo: true,
      purchasable: false,
    };
  }

  const result = await getOpenAI().images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
    prompt: artPrompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
    background: "transparent",
    output_format: "png",
  });

  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI did not return image data");

  const blob = await put(`designs/${id}.png`, Buffer.from(base64, "base64"), {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
  });

  await saveDesign({
    id,
    prompt: input.prompt,
    art_prompt: artPrompt,
    style: input.style,
    shape: input.shape,
    image_url: blob.url,
  });

  return {
    id,
    imageUrl: blob.url,
    artPrompt,
    demo: false,
    purchasable: true,
  };
}
