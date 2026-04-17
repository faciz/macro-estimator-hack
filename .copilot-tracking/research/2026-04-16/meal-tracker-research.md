<!-- markdownlint-disable-file -->

# Meal Tracker Web App - Research Document

## Scope

Build a meal tracking web app where users upload meal photos, get AI-estimated macros (calories, protein, carbs, fat), and view meal history.

## Success Criteria

- Photo upload with camera support
- AI-powered macro estimation from photos
- Auto-save meal entries
- View meal history with daily summaries

## Selected Approach

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Single project serves frontend + API |
| UI | Tailwind CSS + shadcn/ui | Fast, beautiful, zero design work |
| AI Vision | Azure OpenAI (gpt-4o) | User's requirement; vision + JSON mode |
| Storage | localStorage | Zero setup, JSON array of meals |
| Image | Client-side resize → base64 | Reduces size and API cost |

## Architecture

```
Browser → Next.js App Router
  ├── / (home) → meal list + upload button
  ├── /api/analyze → POST photo → Gemini → nutrition JSON
  └── localStorage → meal persistence
```

## API Design

### POST /api/analyze

Request: `{ image: string (base64) }`

Response:
```json
{
  "name": "Grilled Chicken Salad",
  "calories": 450,
  "protein": 35,
  "carbs": 25,
  "fat": 18,
  "items": ["grilled chicken breast", "mixed greens", "tomatoes", "dressing"]
}
```

## Data Schema

```typescript
interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: string[];
  imageBase64: string;
  createdAt: string; // ISO date
}
```

## Alternatives Considered

- **OpenAI Vision**: No free tier, higher cost ($0.75/M vs $0.30/M)
- **Claude Vision**: No free tier, much higher cost ($3/M)
- **Separate backend (Python/Flask)**: Adds complexity for no benefit in this case
- **SQLite/Postgres**: Overkill for a hackathon demo
