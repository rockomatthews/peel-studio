import { z } from "zod";

export const generateSchema = z.object({
  prompt: z.string().trim().min(8, "Give us a little more detail.").max(800),
  style: z.enum(["bold", "retro", "minimal", "weird"]),
  shape: z.enum(["Die-cut", "Circle", "Rounded square"]),
});

export const checkoutSchema = z.object({
  designId: z.string().uuid(),
  packId: z.enum(["five", "ten", "twenty_five"]),
});

export type GenerateInput = z.infer<typeof generateSchema>;
