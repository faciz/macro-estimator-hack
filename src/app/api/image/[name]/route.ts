import { NextRequest, NextResponse } from "next/server";
import { getUploadsContainer } from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allow only UUID-style filenames with safe extensions to prevent path traversal.
const SAFE_NAME = /^[a-f0-9-]{8,}\.(jpg|jpeg|png|webp|gif)$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
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
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": download.contentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode === 404 ? 404 : 500;
    if (status !== 404) {
      console.error("[image]", err instanceof Error ? err.message : err);
    }
    return NextResponse.json({ error: "Not found" }, { status });
  }
}
