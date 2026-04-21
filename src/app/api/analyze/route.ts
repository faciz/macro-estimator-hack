import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { getBearerTokenProvider } from "@azure/identity";
import { DefaultAzureCredential } from "@azure/identity";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { MealAnalysis } from "@/lib/types";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function getClient() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  if (!endpoint) throw new Error("Missing required env var: AZURE_OPENAI_ENDPOINT");
  if (!deployment) throw new Error("Missing required env var: AZURE_OPENAI_DEPLOYMENT");
  const credential = new DefaultAzureCredential();
  const azureADTokenProvider = getBearerTokenProvider(
    credential,
    "https://cognitiveservices.azure.com/.default"
  );
  return new AzureOpenAI({
    endpoint,
    azureADTokenProvider,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
    deployment,
  });
}

function isValidAnalysis(obj: unknown): obj is MealAnalysis {
  if (typeof obj !== "object" || obj === null) return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.name === "string" &&
    typeof a.calories === "number" && Number.isFinite(a.calories) && (a.calories as number) >= 0 &&
    typeof a.protein === "number" && Number.isFinite(a.protein) && (a.protein as number) >= 0 &&
    typeof a.carbs === "number" && Number.isFinite(a.carbs) && (a.carbs as number) >= 0 &&
    typeof a.fat === "number" && Number.isFinite(a.fat) && (a.fat as number) >= 0 &&
    Array.isArray(a.items)
  );
}

const SYSTEM_PROMPT = `You are a nutrition expert and meal analyzer. When given an image of food, you must respond with ONLY valid JSON matching this exact schema — no markdown, no explanation:

{
  "name": "<concise meal name>",
  "calories": <integer kcal>,
  "protein": <integer grams>,
  "carbs": <integer grams>,
  "fat": <integer grams>,
  "items": ["<ingredient or item 1>", "<ingredient or item 2>", ...]
}

Base your estimates on typical serving sizes visible in the image. If multiple dishes are present, sum all macros and list all items. Always return reasonable estimates — never refuse to analyze.`;

async function generateThumbnail(mealName: string, items: string[]): Promise<string> {
  const imageDeployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT;
  const endpoint = process.env.AZURE_OPENAI_IMAGE_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT;
  if (!imageDeployment || !endpoint) return "";
  try {
    const credential = new DefaultAzureCredential();
    const azureADTokenProvider = getBearerTokenProvider(credential, "https://cognitiveservices.azure.com/.default");
    const imageClient = new AzureOpenAI({
      endpoint,
      azureADTokenProvider,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
      deployment: imageDeployment,
    });
    const prompt = `Professional food photography of ${mealName} featuring ${items.slice(0, 5).join(", ")}. Natural lighting, clean presentation, appetizing, top-down view.`;
    const response = await imageClient.images.generate({
      model: imageDeployment,
      prompt,
      n: 1,
      size: "1024x1024",
    });
    const imageData = response.data?.[0];
    if (!imageData) return "";
    let buffer: Buffer;
    if (imageData.b64_json) {
      buffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData.url) {
      const imgRes = await fetch(imageData.url);
      buffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      return "";
    }
    const fileName = `${crypto.randomUUID()}.jpg`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);
    return `/uploads/${fileName}`;
  } catch (err) {
    console.warn("[generateThumbnail]", err instanceof Error ? err.message : err);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const userContext = typeof formData.get("context") === "string" ? (formData.get("context") as string).trim() : "";

    if (!file && !userContext) {
      return NextResponse.json({ error: "Provide an image or context text" }, { status: 400 });
    }

    let imageUrl = "";
    let base64 = "";
    let mimeType = "";

    if (file && file instanceof Blob) {
      // D-03: Validate MIME type
      mimeType = file.type;
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` },
          { status: 400 }
        );
      }

      // D-03: Validate file size
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `Image exceeds 10 MB limit (received ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
          { status: 400 }
        );
      }

      // D-07: Save image to public/uploads/
      const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(path.join(uploadDir, fileName), buffer);
      imageUrl = `/uploads/${fileName}`;
      base64 = buffer.toString("base64");
    }

    // D-02: getClient() validates env vars and throws descriptive errors
    const client = getClient();

    const userMessageContent: Parameters<typeof client.chat.completions.create>[0]["messages"][number]["content"] =
      base64
        ? [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
            { type: "text", text: userContext ? `Analyze this meal and return the nutrition JSON. Additional context from the user: ${userContext}` : "Analyze this meal and return the nutrition JSON." },
          ]
        : userContext ? `Analyze this meal description and return the nutrition JSON. Meal description: ${userContext}` : "Analyze this meal and return the nutrition JSON.";

    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessageContent },
      ],
      max_completion_tokens: 512,
      temperature: 0.2,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/```(?:json)?\n?/g, "").trim();
    const parsed: unknown = JSON.parse(cleaned);

    // D-05: Validate AI response schema
    if (!isValidAnalysis(parsed)) {
      return NextResponse.json(
        { error: "AI returned an unexpected response format. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ...parsed, imageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
