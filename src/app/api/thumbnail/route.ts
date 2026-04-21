import { NextRequest, NextResponse } from "next/server";
import { generateMealThumbnail } from "@/lib/generate-thumbnail";
import { checkAccess } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NAME = 200;
const MAX_ITEMS = 20;

export async function POST(req: NextRequest) {
  const gate = checkAccess(req);
  if (gate) return gate;

  try {
    const body = (await req.json()) as { name?: unknown; items?: unknown };
    const name =
      typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
    const items = Array.isArray(body.items)
      ? (body.items as unknown[])
          .filter((i): i is string => typeof i === "string")
          .slice(0, MAX_ITEMS)
      : [];

    if (!name) {
      return NextResponse.json({ error: "Missing meal name" }, { status: 400 });
    }

    const imageUrl = await generateMealThumbnail(name, items);
    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.warn("[thumbnail]", err instanceof Error ? err.message : err);
    return NextResponse.json({ imageUrl: "" });
  }
}
