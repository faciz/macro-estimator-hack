import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { BlobServiceClient } from "@azure/storage-blob";
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

/**
 * Persist an uploaded image and return its public URL.
 * Uses Azure Blob Storage when AZURE_STORAGE_ACCOUNT is set; otherwise writes
 * to the local public/uploads folder (suitable only for dev).
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
    return blob.url;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  return `/uploads/${fileName}`;
}
