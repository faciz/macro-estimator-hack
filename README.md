# Macro Estimator

A Next.js app that estimates the macronutrients (calories, protein, carbs, fat) of a meal from a photo, using Azure OpenAI vision models. Tracks daily intake against user-defined goals.

## Features

- Upload meal photos and get AI-estimated macros via Azure OpenAI (GPT-4o vision)
- Optional AI-generated thumbnails via `gpt-image-1`
- Daily summary with progress against macro goals
- Photo storage in Azure Blob Storage (with local filesystem fallback)
- Optional auth via Microsoft Entra ID and/or Google (NextAuth v5)
- Per-IP rate limiting and shared-secret API protection

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- TypeScript, Tailwind CSS, Radix UI
- Azure OpenAI (chat + image)
- Azure Blob Storage (`@azure/storage-blob`, keyless via `DefaultAzureCredential`)
- NextAuth.js v5

## Getting Started

### Prerequisites

- Node.js 20+
- An Azure subscription with:
  - An Azure OpenAI resource and a vision-capable deployment (e.g. `gpt-4o`)
  - Optional: an Azure OpenAI image deployment (`gpt-image-1`)
  - Optional: an Azure Storage account with a blob container
- Azure CLI signed in (`az login`) for keyless local development

### Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Azure endpoints + deployment names
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See [.env.example](.env.example) for the full list. Required:

| Variable | Description |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint |
| `AZURE_OPENAI_DEPLOYMENT` | Vision-capable chat deployment name |
| `AZURE_OPENAI_API_VERSION` | API version (e.g. `2024-12-01-preview`) |

Optional: image generation, blob storage, auth, and API hardening — see comments in `.env.example`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on `0.0.0.0:3000` |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

VS Code tasks and debug launch configurations are provided in [.vscode/](.vscode/).

## Project Structure

```
src/
  app/              # Next.js App Router pages + API routes
    api/
      analyze/      # POST: estimate macros from a photo
      thumbnail/    # POST: generate a thumbnail image
      image/[name]/ # GET: serve uploaded image
      auth/         # NextAuth handlers
  components/       # React UI components
  lib/              # Storage, rate limiting, types, utilities
  auth.ts           # NextAuth config
  middleware.ts     # Auth gating
public/uploads/     # Local fallback for uploaded photos
```

## Deployment

Standard Next.js deployment (Azure App Service, Vercel, container, etc.). Ensure the runtime identity has the **Storage Blob Data Contributor** role on the storage account and **Cognitive Services OpenAI User** on the Azure OpenAI resource when running keyless.

## License

Private / unlicensed.
