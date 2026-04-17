# Meal Tracker Tech Stack Research

## Research Topics and Questions

1. Best lightweight frontend framework for a hackathon-style SPA (React, Vue, Svelte, etc.)
2. Best AI vision API for meal/food photo analysis (OpenAI Vision, Google Gemini, Anthropic Claude, etc.)
3. Backend approach: Node.js vs Python vs serverless for photo upload + AI analysis
4. Database choice for meal history: SQLite, localStorage, IndexedDB, or lightweight DB
5. API design patterns for photo upload and AI analysis endpoints
6. Database schema design for meal tracking
7. Architecture overview for the full stack
8. Key trade-offs and implementation decisions

---

## 1. Recommended Tech Stack

### AI Vision API: Google Gemini (Gemini 2.5 Flash)

**Winner: Google Gemini** — dominant choice for a hackathon project.

| Criteria | Google Gemini | OpenAI (gpt-4.1-mini) | Anthropic Claude |
|---|---|---|---|
| **Free tier** | YES — Standard tier is free | No free tier | No free tier |
| **Paid input cost** | $0.30 / 1M tokens (image) | $0.75 / 1M tokens | $3.00 / 1M tokens |
| **Structured JSON output** | Native `response_json_schema` with Pydantic/Zod | Native structured output with Pydantic/Zod | No native structured output |
| **Image support** | JPEG, PNG, WEBP, HEIC, HEIF | PNG, JPEG, WEBP, GIF | JPEG, PNG, GIF, WebP |
| **JS SDK** | `@google/genai` (npm) | `openai` (npm) | `@anthropic-ai/sdk` (npm) |
| **Image input method** | Base64 inline or File API | Base64, URL, or File ID | Base64 or URL |
| **Max images/request** | 3,600 | 1,500 | 100-600 depending on model |

**Rationale:**

- **Free tier** is the killer feature for a hackathon — zero cost during development and demos.
- **Structured output** with `response_json_schema` guarantees valid JSON matching your schema (calories, protein, carbs, fats). No parsing hacks needed.
- **Gemini 2.5 Flash** offers the best price/performance balance at $0.30/M tokens (paid tier), with free standard tier available.
- **Model recommendation**: `gemini-2.5-flash` (stable) or `gemini-3-flash-preview` (latest).
- Image tokens: approximately 258 tokens for images ≤384px per side; larger images tiled at 768×768px costing 258 tokens each.

**Key Gemini structured output pattern for food analysis:**

```python
# Python example (same pattern applies in JS/TS)
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional

class FoodItem(BaseModel):
    name: str = Field(description="Name of the food item identified")
    portion_size: str = Field(description="Estimated portion size, e.g. '1 cup', '200g'")
    calories: int = Field(description="Estimated calories in kcal")
    protein_g: float = Field(description="Estimated protein in grams")
    carbs_g: float = Field(description="Estimated carbohydrates in grams")
    fat_g: float = Field(description="Estimated fat in grams")

class MealAnalysis(BaseModel):
    meal_name: str = Field(description="Descriptive name for the overall meal")
    food_items: List[FoodItem]
    total_calories: int
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    confidence: str = Field(description="low, medium, or high confidence estimate")

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        image_part,  # Base64 or uploaded image
        "Analyze this meal photo. Identify each food item and estimate its nutritional content."
    ],
    config={
        "response_mime_type": "application/json",
        "response_json_schema": MealAnalysis.model_json_schema(),
    },
)

result = MealAnalysis.model_validate_json(response.text)
```

**Equivalent JavaScript/TypeScript pattern:**

```typescript
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64ImageData,
      },
    },
    {
      text: "Analyze this meal photo. Identify each food item and estimate nutritional content.",
    },
  ],
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        meal_name: { type: Type.STRING },
        food_items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              calories: { type: Type.INTEGER },
              protein_g: { type: Type.NUMBER },
              carbs_g: { type: Type.NUMBER },
              fat_g: { type: Type.NUMBER },
            },
          },
        },
        total_calories: { type: Type.INTEGER },
        total_protein_g: { type: Type.NUMBER },
        total_carbs_g: { type: Type.NUMBER },
        total_fat_g: { type: Type.NUMBER },
        confidence: { type: Type.STRING },
      },
    },
  },
});
```

---

### Frontend: Next.js (App Router)

**Winner: Next.js** — best unified framework for hackathon speed.

| Framework | Hackathon Speed | Built-in API | SSR/SSG | Ecosystem | Setup Command |
|---|---|---|---|---|---|
| **Next.js** | Excellent | YES (Route Handlers) | Yes | Massive | `npx create-next-app@latest` |
| Vite + React | Good | No (needs separate server) | No | Large | `npm create vite@latest -- --template react-ts` |
| SvelteKit | Good | YES | Yes | Growing | `npx sv create` |
| Vue + Nuxt | Good | YES | Yes | Moderate | `npx nuxi init` |

**Rationale:**

- **Built-in API routes** (`app/api/analyze/route.ts`) — no separate backend server needed. This is the single biggest simplification for a hackathon.
- **One project, one dev server, one deploy** — `npm run dev` starts everything.
- **TypeScript out of the box** — type safety for the meal schema.
- **File-based routing** — zero config for pages like `/`, `/history`, `/dashboard`.
- **React ecosystem** — access to everything: Tailwind CSS, shadcn/ui, React hooks, etc.
- **Server-side API key protection** — API keys in Route Handlers never reach the browser.

**Alternative**: If you prefer a pure SPA architecture, use **Vite + React + a small Express.js backend**. This requires running two servers but keeps the frontend simpler.

---

### UI Styling: Tailwind CSS + shadcn/ui

- **Tailwind CSS** — utility-first, zero time designing a custom design system.
- **shadcn/ui** — beautiful, accessible component library built on Radix UI. Copy-paste components, not a dependency.
- `npx shadcn@latest init` then `npx shadcn@latest add button card input` etc.
- Pre-built components for: Card (meal entries), Button, Dialog (upload modal), Progress (macro bars), Table (meal history).

---

### Database: localStorage (MVP) → SQLite via better-sqlite3 (stretch)

| Option | Setup | Capacity | Query | Server Needed | Best For |
|---|---|---|---|---|---|
| **localStorage** | Zero | ~5-10 MB | Key-value only | No | Hackathon MVP |
| **IndexedDB** | Low | ~50+ MB | Index-based | No | Binary data (photos) |
| **SQLite (better-sqlite3)** | Low | Unlimited | Full SQL | Yes | Production-like |
| **JSON file** | Zero | Unlimited | None | Yes | Quick prototyping |

**Recommendation: localStorage** for the hackathon. Store meals as a JSON array in localStorage. Simple, zero-setup, works offline.

```typescript
// Simple localStorage abstraction
const MEALS_KEY = "macro-estimator-meals";

interface Meal {
  id: string;
  timestamp: string;
  imageDataUrl: string;  // Base64 thumbnail
  mealName: string;
  foodItems: FoodItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  confidence: string;
}

function saveMeal(meal: Meal): void {
  const meals = getMeals();
  meals.push(meal);
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
}

function getMeals(): Meal[] {
  const data = localStorage.getItem(MEALS_KEY);
  return data ? JSON.parse(data) : [];
}

function getMealsForDate(date: string): Meal[] {
  return getMeals().filter(m => m.timestamp.startsWith(date));
}
```

**If you upgrade to SQLite** (for larger datasets or server-side persistence):

```sql
CREATE TABLE meals (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  meal_name TEXT NOT NULL,
  image_path TEXT,
  total_calories INTEGER NOT NULL,
  total_protein_g REAL NOT NULL,
  total_carbs_g REAL NOT NULL,
  total_fat_g REAL NOT NULL,
  confidence TEXT NOT NULL,
  raw_analysis TEXT -- Full JSON response from Gemini
);

CREATE TABLE food_items (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(id),
  name TEXT NOT NULL,
  portion_size TEXT,
  calories INTEGER NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fat_g REAL NOT NULL
);

CREATE INDEX idx_meals_created_at ON meals(created_at);
```

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Browser (SPA)                  │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │  Upload   │  │  Meal    │  │   Dashboard   │ │
│  │  Photo    │  │  History │  │  (Daily/Wkly) │ │
│  └─────┬────┘  └────┬─────┘  └──────┬────────┘ │
│        │             │               │           │
│        │      ┌──────┴───────┐       │           │
│        │      │ localStorage │       │           │
│        │      │  (meals[])   │       │           │
│        │      └──────────────┘       │           │
│        │                                         │
└────────┼─────────────────────────────────────────┘
         │ POST /api/analyze
         │ (multipart/form-data with image)
         ▼
┌─────────────────────────────────────────────────┐
│            Next.js API Route Handler             │
│            (app/api/analyze/route.ts)            │
│                                                  │
│  1. Receive image from request                   │
│  2. Convert to base64                            │
│  3. Call Gemini API with structured output        │
│  4. Return parsed MealAnalysis JSON              │
│                                                  │
│  GEMINI_API_KEY (server-side env var)            │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│           Google Gemini 2.5 Flash API            │
│                                                  │
│  - Image understanding                           │
│  - Structured JSON output (MealAnalysis schema)  │
│  - Free tier (standard) / $0.30/M tokens (paid)  │
└─────────────────────────────────────────────────┘
```

---

## 3. API Design for Photo Analysis Endpoint

### `POST /api/analyze`

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `image` | File (JPEG/PNG/WebP) | The meal photo to analyze |

**Response:** `application/json`

```json
{
  "meal_name": "Grilled Chicken Salad with Rice",
  "food_items": [
    {
      "name": "Grilled chicken breast",
      "portion_size": "150g",
      "calories": 248,
      "protein_g": 46.0,
      "carbs_g": 0.0,
      "fat_g": 5.4
    },
    {
      "name": "Mixed green salad",
      "portion_size": "2 cups",
      "calories": 20,
      "protein_g": 1.5,
      "carbs_g": 3.5,
      "fat_g": 0.3
    },
    {
      "name": "White rice",
      "portion_size": "1 cup cooked",
      "calories": 206,
      "protein_g": 4.3,
      "carbs_g": 44.5,
      "fat_g": 0.4
    }
  ],
  "total_calories": 474,
  "total_protein_g": 51.8,
  "total_carbs_g": 48.0,
  "total_fat_g": 6.1,
  "confidence": "high"
}
```

**Error Response:**

```json
{
  "error": "Failed to analyze image",
  "message": "Could not identify food items in the image"
}
```

### Next.js Route Handler Implementation

```typescript
// app/api/analyze/route.ts
import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const mealSchema = {
  type: Type.OBJECT,
  properties: {
    meal_name: { type: Type.STRING, description: "Descriptive name for the meal" },
    food_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          portion_size: { type: Type.STRING },
          calories: { type: Type.INTEGER },
          protein_g: { type: Type.NUMBER },
          carbs_g: { type: Type.NUMBER },
          fat_g: { type: Type.NUMBER },
        },
        required: ["name", "calories", "protein_g", "carbs_g", "fat_g"],
      },
    },
    total_calories: { type: Type.INTEGER },
    total_protein_g: { type: Type.NUMBER },
    total_carbs_g: { type: Type.NUMBER },
    total_fat_g: { type: Type.NUMBER },
    confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
  },
  required: [
    "meal_name", "food_items", "total_calories",
    "total_protein_g", "total_carbs_g", "total_fat_g", "confidence"
  ],
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("image") as File;

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: { mimeType: file.type, data: base64 },
      },
      {
        text: `Analyze this meal photo. Identify each food item visible and estimate its nutritional content (calories, protein, carbs, fat). Be as accurate as possible with portion size estimation. Provide a confidence level based on image clarity and food identifiability.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: mealSchema,
    },
  });

  const analysis = JSON.parse(response.text!);
  return NextResponse.json(analysis);
}
```

---

## 4. Database Schema for Meals

### localStorage Schema (Recommended for Hackathon)

```typescript
// types/meal.ts
interface FoodItem {
  name: string;
  portionSize?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface Meal {
  id: string;                // crypto.randomUUID()
  createdAt: string;         // ISO 8601 timestamp
  imageDataUrl?: string;     // Base64 data URL for thumbnail (optional, saves space)
  mealName: string;
  foodItems: FoodItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  confidence: string;        // "low" | "medium" | "high"
}

// Stored as: localStorage.setItem("meals", JSON.stringify(meals))
```

### SQLite Schema (If You Upgrade)

See SQL in section 1 above.

---

## 5. Key Implementation Decisions and Trade-offs

### Decision 1: Gemini over OpenAI/Claude

- **Trade-off**: Gemini's food estimation may be slightly less accurate than GPT-4o for some edge cases, but the free tier and native structured output make it unbeatable for hackathon speed and zero cost.
- **Mitigation**: Use a detailed system prompt that asks for conservative estimates and includes portion size calibration hints.

### Decision 2: Next.js over Vite + Separate Backend

- **Trade-off**: Next.js is heavier than a pure Vite SPA, but eliminates the need for a separate Express server and the coordination overhead.
- **Mitigation**: Use Next.js App Router with just client components and a single API route. Ignore SSR features you don't need.

### Decision 3: localStorage over SQLite

- **Trade-off**: No server-side persistence, 5-10MB limit, no multi-device sync. But zero setup.
- **Mitigation**: Keep image thumbnails small (resize before storing). 5MB holds hundreds of meal records without images. Store only small thumbnails.

### Decision 4: Base64 Image Upload (not presigned URL / cloud storage)

- **Trade-off**: Larger request payloads, but eliminates the need for cloud storage setup (S3, GCS).
- **Mitigation**: Resize images client-side before uploading (max 1024px wide). A typical meal photo at 1024px JPEG is 100-200KB base64.

### Decision 5: Client-side Image Resizing

- **Why**: Reduces upload time, reduces Gemini token usage (smaller images = fewer tokens), saves localStorage space.
- **How**: Use Canvas API to resize to max 1024px before converting to base64.

```typescript
function resizeImage(file: File, maxWidth = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = URL.createObjectURL(file);
  });
}
```

### Decision 6: Prompt Engineering for Accuracy

The quality of macro estimates depends heavily on the prompt. Key prompt strategies:

1. **Ask for portion size first** — forces the model to reason about actual quantities.
2. **Request confidence level** — lets the UI communicate uncertainty.
3. **Include calibration context** — "A standard dinner plate is approximately 10 inches / 25cm across."
4. **Ask for individual items** — itemized breakdown is more accurate than lump estimates.

---

## 6. Project Structure

```
macro-estimator-hack/
├── app/
│   ├── layout.tsx              # Root layout with Tailwind
│   ├── page.tsx                # Home page — photo upload + recent meals
│   ├── history/
│   │   └── page.tsx            # Meal history with daily/weekly view
│   └── api/
│       └── analyze/
│           └── route.ts        # POST endpoint for Gemini analysis
├── components/
│   ├── PhotoUpload.tsx         # Upload + camera capture component
│   ├── MealCard.tsx            # Display a single meal entry
│   ├── MacroBar.tsx            # Visual bar for protein/carbs/fat
│   ├── DailySummary.tsx        # Daily totals component
│   └── WeeklySummary.tsx       # Weekly chart/summary
├── lib/
│   ├── meals.ts                # localStorage CRUD operations
│   ├── types.ts                # TypeScript interfaces (Meal, FoodItem)
│   └── image-utils.ts          # Client-side image resizing
├── .env.local                  # GEMINI_API_KEY=your_key_here
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## 7. Implementation Checklist (Hackathon Order)

1. [ ] Scaffold: `npx create-next-app@latest macro-estimator-hack --typescript --tailwind --eslint --app --src-dir=false`
2. [ ] Add shadcn/ui: `npx shadcn@latest init && npx shadcn@latest add button card input progress`
3. [ ] Install Gemini SDK: `npm install @google/genai`
4. [ ] Create types: `lib/types.ts` with `Meal` and `FoodItem` interfaces
5. [ ] Create localStorage helpers: `lib/meals.ts`
6. [ ] Create image resize utility: `lib/image-utils.ts`
7. [ ] Build API route: `app/api/analyze/route.ts`
8. [ ] Build photo upload component with camera/file support
9. [ ] Build meal display card with macro breakdown
10. [ ] Build home page: upload + recent meals list
11. [ ] Build history page: daily/weekly summary view
12. [ ] Add loading states and error handling
13. [ ] Test with real food photos

---

## References

- [Google Gemini Image Understanding](https://ai.google.dev/gemini-api/docs/image-understanding) — Image analysis docs
- [Google Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) — JSON schema output docs
- [Google Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing) — Free tier + paid pricing
- [Google GenAI SDK (npm)](https://www.npmjs.com/package/@google/genai) — JavaScript/TypeScript SDK
- [OpenAI Vision Guide](https://developers.openai.com/api/docs/guides/images-vision) — Comparison reference
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — Comparison reference
- [OpenAI Pricing](https://developers.openai.com/api/docs/pricing) — Cost comparison
- [Anthropic Claude Vision](https://platform.claude.com/docs/en/docs/build-with-claude/vision) — Comparison reference
- [Vite Guide](https://vite.dev/guide/) — Alternative frontend tooling
- [Next.js Docs](https://nextjs.org/docs) — Primary frontend framework

---

## Discovered Topics (Fully Researched)

1. **Gemini structured output using Zod in TypeScript** — Supported via `@google/genai` SDK with Type enums or raw JSON schema.
2. **Client-side image resizing techniques** — Canvas API is the standard approach; critical for reducing API costs and localStorage usage.
3. **Gemini model selection** — `gemini-2.5-flash` (stable, $0.30/M) is ideal; `gemini-3-flash-preview` (latest, $0.50/M) for bleeding-edge accuracy.
4. **OpenAI compatibility endpoint** — Gemini has an OpenAI-compatible endpoint, allowing use with the `openai` npm package if desired.
5. **Token cost for images** — Gemini: ~258 tokens for small images, ~258 per 768×768 tile for larger ones. At free tier, this is zero cost.

---

## Clarifying Questions

1. **API Key**: Do you already have a Google Gemini API key, or do you need to create one? (Free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
2. **Deployment target**: Is this for demo/judging only (local dev server), or do you want a deployed URL? (Affects whether to add Vercel/Netlify deployment config)
3. **Mobile camera support**: Should the upload component support direct camera capture on mobile devices? (Adds `capture="environment"` to file input — trivial to add)
4. **Daily targets**: Do you want to set calorie/macro daily targets and show progress toward them? (Affects UI complexity)
