export const stickerStyles = [
  { id: "bold", label: "Bold mascot", hint: "Chunky lines, playful energy" },
  { id: "retro", label: "Retro print", hint: "Sun-faded, screen-print texture" },
  { id: "minimal", label: "Clean icon", hint: "Simple shapes, crisp silhouette" },
  { id: "weird", label: "Cute & weird", hint: "Unexpected, charming character" },
] as const;

export const stickerShapes = ["Die-cut", "Circle", "Rounded square"] as const;

export const packs = [
  { id: "one", label: "1 sticker", quantity: 1, priceCents: 1500 },
  { id: "three", label: "3 stickers", quantity: 3, priceCents: 2900, featured: true },
  { id: "five", label: "5 stickers", quantity: 5, priceCents: 4200 },
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
