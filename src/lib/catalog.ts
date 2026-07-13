export const stickerStyles = [
  { id: "bold", label: "Bold mascot", hint: "Chunky lines, playful energy" },
  { id: "retro", label: "Retro print", hint: "Sun-faded, screen-print texture" },
  { id: "minimal", label: "Clean icon", hint: "Simple shapes, crisp silhouette" },
  { id: "weird", label: "Cute & weird", hint: "Unexpected, charming character" },
] as const;

export const stickerShapes = ["Die-cut", "Circle", "Rounded square"] as const;

export const packs = [
  { id: "five", label: "5 stickers", quantity: 5, priceCents: 1400 },
  { id: "ten", label: "10 stickers", quantity: 10, priceCents: 2200, featured: true },
  { id: "twenty_five", label: "25 stickers", quantity: 25, priceCents: 3900 },
] as const;

export type PackId = (typeof packs)[number]["id"];

export function getPack(id: string) {
  return packs.find((pack) => pack.id === id);
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}
