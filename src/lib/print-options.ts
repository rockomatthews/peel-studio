import { printifyRequest } from "@/lib/printify";

export type PrintOption = {
  variantId: number;
  title: string;
  productTitle: string;
  options: Record<string, string>;
  width: number;
  height: number;
  position: string;
  decorationMethod: string;
  preview: boolean;
};

type CatalogVariant = {
  id: number;
  title: string;
  options?: Record<string, string>;
  placeholders?: Array<{
    position: string;
    decoration_method: string;
    width: number;
    height: number;
  }>;
};

type VariantResponse = { variants?: CatalogVariant[] } | CatalogVariant[];
type BlueprintResponse = { title?: string };

const previewOptions: PrintOption[] = [
  {
    variantId: 1,
    title: "Small · 3 in",
    productTitle: "Die-cut sticker",
    options: { size: "3 in" },
    width: 900,
    height: 900,
    position: "front",
    decorationMethod: "digital",
    preview: true,
  },
  {
    variantId: 2,
    title: "Large · 4 in",
    productTitle: "Die-cut sticker",
    options: { size: "4 in" },
    width: 1200,
    height: 1200,
    position: "front",
    decorationMethod: "digital",
    preview: true,
  },
];

let cached: { expires: number; options: PrintOption[] } | null = null;

function configuredVariantIds() {
  return (process.env.PRINTIFY_VARIANT_IDS || process.env.PRINTIFY_VARIANT_ID || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

export async function getPrintOptions() {
  const blueprintId = process.env.PRINTIFY_BLUEPRINT_ID;
  const providerId = process.env.PRINTIFY_PRINT_PROVIDER_ID;
  const token = process.env.PRINTIFY_API_TOKEN;
  const selectedIds = configuredVariantIds();
  if (!blueprintId || !providerId || !token || !selectedIds.length) return previewOptions;
  if (cached && cached.expires > Date.now()) return cached.options;

  const [blueprint, response] = await Promise.all([
    printifyRequest<BlueprintResponse>(`/catalog/blueprints/${blueprintId}.json`),
    printifyRequest<VariantResponse>(
      `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json?show-out-of-stock=0`,
    ),
  ]);
  const variants = Array.isArray(response) ? response : response.variants || [];
  const position = process.env.PRINTIFY_PRINT_AREA || "front";
  const decoration = process.env.PRINTIFY_DECORATION_METHOD;

  const options = variants.flatMap((variant): PrintOption[] => {
    if (!selectedIds.includes(variant.id)) return [];
    const placeholder = variant.placeholders?.find(
      (candidate) =>
        candidate.position === position &&
        (!decoration || candidate.decoration_method === decoration),
    );
    if (!placeholder?.width || !placeholder.height) return [];
    return [
      {
        variantId: variant.id,
        title: variant.title,
        productTitle: blueprint.title || "Custom sticker",
        options: variant.options || {},
        width: placeholder.width,
        height: placeholder.height,
        position: placeholder.position,
        decorationMethod: placeholder.decoration_method,
        preview: false,
      },
    ];
  });

  if (!options.length) {
    throw new Error(
      "Configured Printify variants do not expose the selected print area and decoration method",
    );
  }
  cached = { expires: Date.now() + 10 * 60 * 1000, options };
  return options;
}

export async function getPrintOption(variantId: number) {
  const options = await getPrintOptions();
  const option = options.find((candidate) => candidate.variantId === variantId);
  if (!option) throw new Error("The selected sticker size is not available");
  return option;
}
