import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { saveUpload } from "./upload-storage";

let imageClient: AzureOpenAI | null = null;

function getImageClient(): AzureOpenAI | null {
  const deployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT;
  const endpoint = process.env.AZURE_OPENAI_IMAGE_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT;
  if (!deployment || !endpoint) return null;
  if (imageClient) return imageClient;

  const credential = new DefaultAzureCredential();
  const tokenProvider = getBearerTokenProvider(
    credential,
    "https://cognitiveservices.azure.com/.default"
  );
  imageClient = new AzureOpenAI({
    endpoint,
    azureADTokenProvider: tokenProvider,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
    deployment,
  });
  return imageClient;
}

/**
 * Generate an AI food photograph for a meal and persist it via saveUpload().
 * Returns the public URL, or "" when image generation is unavailable/failed.
 */
export async function generateMealThumbnail(name: string, items: string[]): Promise<string> {
  const client = getImageClient();
  const deployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT;
  if (!client || !deployment) return "";

  // Clamp untrusted inputs before they hit the prompt
  const safeName = name.trim().slice(0, 120);
  const safeItems = items
    .map((i) => i.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 5);

  const prompt = `Professional food photography of ${safeName}${
    safeItems.length ? ` featuring ${safeItems.join(", ")}` : ""
  }. Natural lighting, clean presentation, appetizing, top-down view.`;

  try {
    const response = await client.images.generate({
      model: deployment,
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
    return await saveUpload(buffer, "jpg", "image/jpeg");
  } catch (err) {
    console.warn("[generateMealThumbnail]", err instanceof Error ? err.message : err);
    return "";
  }
}
