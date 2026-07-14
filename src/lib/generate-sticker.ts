import { del, put } from "@vercel/blob";
import OpenAI, { toFile } from "openai";
import { randomUUID } from "node:crypto";
import { saveDesign } from "@/lib/db";
import { generationSizeFor, prepareArtwork } from "@/lib/prepare-artwork";
import { getPrintOption } from "@/lib/print-options";
import { paidFlowReadiness } from "@/lib/runtime";
import type { GenerateInput } from "@/lib/schemas";

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

export class GenerationConfigurationError extends Error {}

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
  const referenceRule = input.referenceImageUrls.length
    ? "The uploaded images are AUTHORITATIVE visual references, not loose inspiration. Preserve the referenced subject's identity, silhouette, anatomy, pose, proportions, colors, clothing, equipment, and defining details unless the user's brief explicitly requests a change. Change only what the user requests."
    : "There are no reference images. Derive every creative decision from the user's brief; do not substitute a generic mascot, icon, or unrelated subject.";

  return [
    "Create exactly one print-ready sticker illustration.",
    `PRIMARY CREATIVE BRIEF — follow every explicit detail literally: “${input.prompt}”`,
    referenceRule,
    "Before rendering, internally identify the requested subject, action, pose, expression, clothing, colors, held objects, object condition, and spatial relationships. The final image must visibly satisfy each applicable item.",
    "Do not replace the requested subject with a symbol, flower, abstract icon, cute face, or generic mascot. Do not soften, simplify, or contradict requested traits such as strong, mean, broken, split, damaged, two-handed, or all-black.",
    `Intended Printify product: ${canvas.productTitle}. Final print canvas is ${canvas.width} by ${canvas.height} pixels, aspect ratio ${(canvas.width / canvas.height).toFixed(3)}.`,
    "Keep the complete requested composition centered inside the middle 82% of the canvas. No requested body part, equipment, or white sticker border may be cropped or touch an edge.",
    "Add only the clean white contour needed for a die-cut sticker. Do not introduce extra objects, words, logos, scenery, decorative motifs, or visual themes that the brief did not request.",
    "No mockup, hand holding the sticker, wall, product photo, sticker sheet, presentation shadow, watermark, or signature.",
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
  if (!process.env.OPENAI_API_KEY) {
    throw new GenerationConfigurationError(
      "OpenAI image generation is not configured. Add OPENAI_API_KEY to Vercel and redeploy.",
    );
  }

  const request = {
    model,
    prompt: artPrompt,
    n: 1,
    size: generationSizeFor(printOption.width, printOption.height),
    quality: (process.env.OPENAI_IMAGE_QUALITY || "high") as "low" | "medium" | "high",
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
    const canPersist = Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.DATABASE_URL);
    if (!canPersist) {
      return {
        id,
        imageUrl: `data:image/png;base64,${artwork.toString("base64")}`,
        artPrompt,
        purchasable: false,
        notice: "This is a real OpenAI result. Connect both Vercel Blob and Neon to save it and enable checkout.",
        printOption,
      };
    }

    const blob = await put(`designs/${id}.png`, artwork, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });

    await saveDesign({
      id,
      prompt: input.prompt,
      art_prompt: artPrompt,
      style: "prompt_only",
      shape: "die_cut",
      image_url: blob.url,
      variant_id: printOption.variantId,
      print_canvas_width: printOption.width,
      print_canvas_height: printOption.height,
      print_area: printOption.position,
      decoration_method: printOption.decorationMethod,
      subject_count: 1,
      reference_urls: input.referenceImageUrls,
    });

    const readiness = paidFlowReadiness();
    return {
      id,
      imageUrl: blob.url,
      artPrompt,
      purchasable: readiness.ready,
      notice: readiness.ready
        ? undefined
        : `Artwork generated and saved. Checkout is waiting for: ${readiness.missing.join(", ")}.`,
      printOption,
    };
  } finally {
    if (input.referenceImageUrls.length) {
      await del(input.referenceImageUrls).catch((error) =>
        console.error("Reference cleanup failed", error),
      );
    }
  }
}
