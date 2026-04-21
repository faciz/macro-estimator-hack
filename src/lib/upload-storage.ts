import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT;
const STORAGE_CONTAINER = process.env.AZURE_STORAGE_CONTAINER ?? "uploads";

let blobServiceClient: BlobServiceClient | null = null;

function getBlobService(): BlobServiceClient {
  if (!blobServiceClient) {
    blobServiceClient = new BlobServiceClient(
      `https://${STORAGE_ACCOUNT}.blob.core.windows.net`,
      new DefaultAzureCredential()
    );
  }
  return blobServiceClient;
}

export function getUploadsContainer(): ContainerClient | null {
  if (!STORAGE_ACCOUNT) return null;
  return getBlobService().getContainerClient(STORAGE_CONTAINER);
}

export function isBlobStorageEnabled(): boolean {
  return Boolean(STORAGE_ACCOUNT);
}

/**
 * Persist an uploaded image and return a URL the browser can load.
 * Uses Azure Blob Storage (private) behind /api/image/<name> when
 * AZURE_STORAGE_ACCOUNT is set; otherwise writes to public/uploads (dev only).
 */
export async function saveUpload(
  buffer: Buffer,
  ext: string,
  contentType: string
): Promise<string> {
  const fileName = `${crypto.randomUUID()}.${ext}`;

  if (STORAGE_ACCOUNT) {
    const container = getBlobService().getContainerClient(STORAGE_CONTAINER);
    const blob = container.getBlockBlobClient(fileName);
    await blob.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    // Return a same-origin proxy URL so the browser can load private blobs
    // via the server's AAD identity.
    return `/api/image/${encodeURIComponent(fileName)}`;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  return `/uploads/${fileName}`;
}
