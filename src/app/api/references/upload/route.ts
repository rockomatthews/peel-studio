import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("references/")) throw new Error("Invalid upload path");
        return {
          allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
          cacheControlMaxAge: 60,
          tokenPayload: "sticker-reference",
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    console.error("Reference upload failed", error);
    return Response.json({ error: "Reference upload failed" }, { status: 400 });
  }
}
