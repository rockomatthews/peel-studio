import { z } from "zod";

export const generateSchema = z.object({
  prompt: z.string().trim().min(8, "Give us a little more detail.").max(800),
  variantId: z.number().int().positive(),
  referenceImageUrls: z.array(z.url().max(2048)).max(3).default([]),
});

export const checkoutSchema = z.object({
  designId: z.string().uuid(),
  packId: z.enum(["one", "three", "five"]),
});

export type GenerateInput = z.infer<typeof generateSchema>;
