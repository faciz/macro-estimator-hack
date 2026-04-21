import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { getBearerTokenProvider, DefaultAzureCredential } from "@azure/identity";
import type { MealAnalysis } from "@/lib/types";
import { saveUpload } from "@/lib/upload-storage";
import { checkAccess } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CONTEXT_CHARS = 500;

let chatClient: AzureOpenAI | null = null;
function getChatClient(): AzureOpenAI {
  if (chatClient) return chatClient;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  if (!endpoint) throw new Error("Missing required env var: AZURE_OPENAI_ENDPOINT");
  if (!deployment) throw new Error("Missing required env var: AZURE_OPENAI_DEPLOYMENT");
  const credential = new DefaultAzureCredential();
  const tokenProvider = getBearerTokenProvider(
    credential,
    "https://cognitiveservices.azure.com/.default"
  );
  chatClient = new AzureOpenAI({
    endpoint,
    azureADTokenProvider: tokenProvider,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
    deployment,
  });
  return chatClient;
}

function isValidAnalysis(obj: unknown): obj is MealAnalysis {
  if (typeof obj !== "object" || obj === null) return false;
  const a = obj as Record<string, unknown>;
  const isNonNegNumber = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0;
  return (
    typeof a.name === "string" &&
    isNonNegNumber(a.calories) &&
    isNonNegNumber(a.protein) &&
    isNonNegNumber(a.carbs) &&
    isNonNegNumber(a.fat) &&
    Array.isArray(a.items) &&
    (a.items as unknown[]).every((i) => typeof i === "string")
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

export async function POST(req: NextRequest) {
  const gate = checkAccess(req);
  if (gate) return gate;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const contextRaw = formData.get("context");
    const userContext =
      typeof contextRaw === "string" ? contextRaw.trim().slice(0, MAX_CONTEXT_CHARS) : "";

    if (!file && !userContext) {
      return NextResponse.json({ error: "Provide an image or context text" }, { status: 400 });
    }

    let imageUrl = "";
    let base64 = "";
    let mimeType = "";

    if (file && file instanceof Blob) {
      mimeType = file.type;
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `Image exceeds 10 MB limit (received ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
          { status: 400 }
        );
      }

      const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1]!;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      imageUrl = await saveUpload(buffer, ext, mimeType);
      base64 = buffer.toString("base64");
    }

    const client = getChatClient();

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
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```(?:json)?\n?/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[analyze] JSON parse failed; raw length=", raw.length);
      return NextResponse.json(
        { error: "AI returned an unparseable response. Please try again." },
        { status: 502 }
      );
    }

    if (!isValidAnalysis(parsed)) {
      return NextResponse.json(
        { error: "AI returned an unexpected response format. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ...parsed, imageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Log full detail server-side; return a generic message to the client.
    console.error("[analyze]", message);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
