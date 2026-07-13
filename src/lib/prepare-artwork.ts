import sharp from "sharp";
import type { PrintOption } from "@/lib/print-options";

function colorDistanceSquared(
  data: Buffer,
  offset: number,
  background: [number, number, number],
) {
  const red = data[offset] - background[0];
  const green = data[offset + 1] - background[1];
  const blue = data[offset + 2] - background[2];
  return red * red + green * green + blue * blue;
}

async function removeEdgeBackground(input: Buffer) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) return input;

  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  const background = corners.reduce<[number, number, number]>(
    (total, pixel) => {
      const offset = pixel * channels;
      total[0] += data[offset];
      total[1] += data[offset + 1];
      total[2] += data[offset + 2];
      return total;
    },
    [0, 0, 0],
  ).map((value) => Math.round(value / corners.length)) as [number, number, number];

  const thresholdSquared = 72 * 72;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  function enqueue(pixel: number) {
    if (visited[pixel]) return;
    const offset = pixel * channels;
    if (colorDistanceSquared(data, offset, background) > thresholdSquared) return;
    visited[pixel] = 1;
    queue[tail++] = pixel;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixel = queue[head++];
    data[pixel * channels + 3] = 0;
    const x = pixel % width;
    if (x > 0) enqueue(pixel - 1);
    if (x < width - 1) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel < width * (height - 1)) enqueue(pixel + width);
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

export async function prepareArtwork(
  input: Buffer,
  printOption: PrintOption,
  removeOpaqueBackground: boolean,
) {
  const cutout = removeOpaqueBackground ? await removeEdgeBackground(input) : input;
  const marginRatio = Number(process.env.PRINT_SAFE_MARGIN || "0.08");
  const margin = Math.min(0.16, Math.max(0.04, marginRatio));
  const horizontalMargin = Math.round(printOption.width * margin);
  const verticalMargin = Math.round(printOption.height * margin);
  const innerWidth = printOption.width - horizontalMargin * 2;
  const innerHeight = printOption.height - verticalMargin * 2;

  return sharp(cutout)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .resize({
      width: innerWidth,
      height: innerHeight,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      top: verticalMargin,
      bottom: verticalMargin,
      left: horizontalMargin,
      right: horizontalMargin,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(printOption.width, printOption.height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .withMetadata({ density: 300 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export function generationSizeFor(width: number, height: number) {
  const ratio = Math.min(3, Math.max(1 / 3, width / height));
  const targetPixels = 1536 * 1536;
  let generatedWidth = Math.sqrt(targetPixels * ratio);
  let generatedHeight = generatedWidth / ratio;
  const maxEdge = Math.max(generatedWidth, generatedHeight);
  if (maxEdge > 2048) {
    const scale = 2048 / maxEdge;
    generatedWidth *= scale;
    generatedHeight *= scale;
  }
  const round16 = (value: number) => Math.max(16, Math.round(value / 16) * 16);
  return `${round16(generatedWidth)}x${round16(generatedHeight)}`;
}
