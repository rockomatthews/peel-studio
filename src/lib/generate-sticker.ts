import { del, put } from "@vercel/blob";
import OpenAI, { toFile } from "openai";
import { randomUUID } from "node:crypto";
import { saveDesign } from "@/lib/db";
import { generationSizeFor, prepareArtwork } from "@/lib/prepare-artwork";
import { getPrintOption } from "@/lib/print-options";
import type { GenerateInput } from "@/lib/schemas";

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

const styleDirection: Record<GenerateInput["style"], string> = {
  bold: "bold mascot illustration, thick confident outlines, punchy color blocking",
  retro: "vintage screen-print illustration, limited warm palette, subtle ink texture",
  minimal: "minimal vector icon, few precise shapes, crisp negative space",
  weird: "cute surreal mascot, charmingly odd details, expressive and playful",
};

function safeReferenceUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".public.blob.vercel-storage.com")
  ) {
    throw new Error("Invalid reference image URL");
  }
  return url;
}

async function loadReferences(urls: string[]) {
  return Promise.all(
    urls.map(async (value, index) => {
      const response = await fetch(safeReferenceUrl(value), { cache: "no-store" });
      if (!response.ok) throw new Error("A reference image could not be loaded");
      const contentType = response.headers.get("content-type") || "image/png";
      if (!contentType.startsWith("image/")) throw new Error("Reference must be an image");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Reference image is too large");
      return toFile(Buffer.from(bytes), `reference-${index + 1}`, { type: contentType });
    }),
  );
}

export function buildArtPrompt(
  input: GenerateInput,
  canvas: { width: number; height: number; productTitle: string },
  opaqueBackground: boolean,
) {
  const subjectRule =
    input.subjectCount === 1
      ? "Exactly ONE primary subject/object. Do not add companions, duplicates, scenery characters, or extra focal objects."
      : "Exactly TWO primary subjects/objects, clearly grouped as one compact sticker composition. Do not add a third subject.";
  const referenceRule = input.referenceImageUrls.length
    ? input.referenceMode === "preserve"
      ? "Use the uploaded images as strict identity references. Preserve their defining shapes, colors, markings, and proportions while converting them into the requested sticker style."
      : "Use the uploaded images as visual inspiration for subject, palette, and character, but create an original sticker composition."
    : "No reference images are provided; follow the text description precisely.";

  return [
    `Create one original sticker illustration of: ${input.prompt}.`,
    subjectRule,
    referenceRule,
    `Visual direction: ${styleDirection[input.style]}.`,
    `Intended Printify product: ${canvas.productTitle}. Final print canvas is ${canvas.width} by ${canvas.height} pixels, aspect ratio ${(canvas.width / canvas.height).toFixed(3)}.`,
    `Sticker shape intent: ${input.shape}. Keep the complete subject centered inside the middle 82% of the canvas. No part of the subject or white border may touch an edge.`,
    "Use a bold, continuous silhouette, sturdy outlines, a clean white kiss-cut border, and no tiny detached pieces or hairline details.",
    "No mockup, hand, wall, product photo, sticker sheet, drop shadow, watermark, signature, brand logo, celebrity, or copyrighted character.",
    "Avoid long text. If the prompt requires words, use at most four large legible words.",
    opaqueBackground
      ? "Place the sticker alone on a perfectly flat, uniform pale gray background (#E8E8E8) extending to every canvas edge. The pale gray must not appear inside the sticker."
      : "Use a fully transparent background outside the sticker.",
  ].join(" ");
}

export async function generateSticker(input: GenerateInput) {
  const id = randomUUID();
  const printOption = await getPrintOption(input.variantId);
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const opaqueBackground = model.startsWith("gpt-image-2");
  const artPrompt = buildArtPrompt(input, printOption, opaqueBackground);
  const liveReady = Boolean(
    process.env.OPENAI_API_KEY && process.env.BLOB_READ_WRITE_TOKEN && process.env.DATABASE_URL,
  );

  if (!liveReady) {
    return {
      id,
      imageUrl: "/demo-sticker.svg",
      artPrompt,
      demo: true,
      purchasable: false,
      printOption,
    };
  }

  const request = {
    model,
    prompt: artPrompt,
    n: 1,
    size: generationSizeFor(printOption.width, printOption.height),
    quality: (process.env.OPENAI_IMAGE_QUALITY || "medium") as "low" | "medium" | "high",
    output_format: "png" as const,
    ...(opaqueBackground ? { background: "opaque" as const } : { background: "transparent" as const }),
  };

  try {
    const result = input.referenceImageUrls.length
      ? await getOpenAI().images.edit({
          ...request,
          image: await loadReferences(input.referenceImageUrls),
          ...(opaqueBackground ? {} : { input_fidelity: "high" as const }),
        })
      : await getOpenAI().images.generate(request);

    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error("OpenAI did not return image data");
    const artwork = await prepareArtwork(
      Buffer.from(base64, "base64"),
      printOption,
      opaqueBackground,
    );
    const blob = await put(`designs/${id}.png`, artwork, {
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
      variant_id: printOption.variantId,
      print_canvas_width: printOption.width,
      print_canvas_height: printOption.height,
      print_area: printOption.position,
      decoration_method: printOption.decorationMethod,
      subject_count: input.subjectCount,
      reference_urls: input.referenceImageUrls,
    });

    return { id, imageUrl: blob.url, artPrompt, demo: false, purchasable: true, printOption };
  } finally {
    if (input.referenceImageUrls.length) {
      await del(input.referenceImageUrls).catch((error) =>
        console.error("Reference cleanup failed", error),
      );
    }
  }
}
