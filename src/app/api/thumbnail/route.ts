import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { getBearerTokenProvider, DefaultAzureCredential } from "@azure/identity";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name?: unknown; items?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const items = Array.isArray(body.items) ? (body.items as unknown[]).filter((i): i is string => typeof i === "string") : [];

    if (!name) {
      return NextResponse.json({ error: "Missing meal name" }, { status: 400 });
    }

    const imageDeployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT;
    const endpoint = process.env.AZURE_OPENAI_IMAGE_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT;
    if (!imageDeployment || !endpoint) {
      return NextResponse.json({ imageUrl: "" });
    }

    const credential = new DefaultAzureCredential();
    const azureADTokenProvider = getBearerTokenProvider(credential, "https://cognitiveservices.azure.com/.default");
    const imageClient = new AzureOpenAI({
      endpoint,
      azureADTokenProvider,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
      deployment: imageDeployment,
    });

    const prompt = `Professional food photography of ${name}${items.length ? ` featuring ${items.slice(0, 5).join(", ")}` : ""}. Natural lighting, clean presentation, appetizing, top-down view.`;

    const response = await imageClient.images.generate({
      model: imageDeployment,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageData = response.data[0];
    if (!imageData) return NextResponse.json({ imageUrl: "" });

    let buffer: Buffer;
    if (imageData.b64_json) {
      buffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData.url) {
      const imgRes = await fetch(imageData.url);
      buffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      return NextResponse.json({ imageUrl: "" });
    }

    const fileName = `${crypto.randomUUID()}.jpg`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    return NextResponse.json({ imageUrl: `/uploads/${fileName}` });
  } catch (err: unknown) {
    console.warn("[thumbnail]", err instanceof Error ? err.message : err);
    return NextResponse.json({ imageUrl: "" });
  }
}
