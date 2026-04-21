import { NextRequest, NextResponse } from "next/server";
import { getUploadsContainer } from "@/lib/upload-storage";
import { checkAccess } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allow only UUID-style filenames with safe extensions to prevent path traversal.
const SAFE_NAME = /^[a-f0-9-]{8,}\.(jpg|jpeg|png|webp|gif)$/i;

// Image loads are far more frequent than uploads, so allow a higher budget.
const IMAGE_RATE_LIMIT = Number(process.env.API_IMAGE_RATE_LIMIT ?? 120);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const gate = checkAccess(req, "image", IMAGE_RATE_LIMIT);
  if (gate) return gate;

  const { name } = await params;
  const decoded = decodeURIComponent(name);
  if (!SAFE_NAME.test(decoded)) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const container = getUploadsContainer();
  if (!container) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  try {
    const blob = container.getBlockBlobClient(decoded);
    const download = await blob.download();
    const stream = download.readableStreamBody;
    if (!stream) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const headers: Record<string, string> = {
      "Content-Type": download.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    if (download.contentLength !== undefined) {
      headers["Content-Length"] = String(download.contentLength);
    }
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode === 404 ? 404 : 500;
    if (status !== 404) {
      console.error("[image]", err instanceof Error ? err.message : err);
    }
    return NextResponse.json({ error: "Not found" }, { status });
  }
}
