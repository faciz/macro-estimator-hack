<!-- markdownlint-disable-file -->
# Memory: macro-estimator-productionize

**Created:** 2026-04-17 | **Last Updated:** 2026-04-17

## Task Overview

Productionize the `macro-estimator-hack` Next.js app by adding:
1. **Dark mode** — system-aware, user-overridable, persisted to localStorage
2. **Calorie goal + macro percent targets** — daily calorie budget, P/C/F% split, goal progress bars
3. **General cleanup** — dead code removal, TS error fixes, forward-nav cap, dark-mode-safe styles

All goals completed successfully. TypeScript reports zero errors.

## Current State

### Completed — Full implementation done

**Dark mode:**
- `src/app/globals.css` — `.dark {}` block added with inverted CSS custom property tokens
- `src/components/theme-provider.tsx` — NEW: `ThemeProvider` + `useTheme` hook (localStorage, system pref, `dark` class on `<html>`)
- `src/app/layout.tsx` — Wraps app in `ThemeProvider`; `suppressHydrationWarning` on `<html>`
- `src/app/page.tsx` — Moon/Sun toggle button in header

**Goals feature:**
- `src/lib/types.ts` — Added `UserGoals` interface + `DEFAULT_GOALS` constant (2000 kcal, 30/40/30)
- `src/lib/storage.ts` — Added `getGoals()` and `saveGoals()` functions
- `src/components/goal-settings.tsx` — NEW: slide-up modal with calorie input + 3 range sliders; sum-to-100 validation; live gram preview
- `src/components/daily-summary-card.tsx` — Calorie progress bar (red when over); macro bars show `actual g / goal g`; removed duplicate `formatDate`
- `src/app/page.tsx` — Settings ⚙ icon opens goal modal; goals passed to `DailySummaryCard`; forward nav capped at today

**Cleanup:**
- `src/app/api/analyze/route.ts` — Fixed TS18048: `response.data?.[0]`
- `src/app/api/thumbnail/route.ts` — Fixed TS18048: `response.data?.[0]`
- `src/components/meal-card.tsx` — Macro pill colors use opacity tokens (`bg-blue-500/15`) for dark mode compatibility
- Forward navigation past today removed (was needlessly 21 days ahead)

### Environment
- Framework: Next.js 15/16 (Turbopack), React 19, TypeScript
- Styling: Tailwind CSS v3.4, darkMode: `["class"]` in `tailwind.config.js`
- AI: Azure OpenAI (DefaultAzureCredential), vision endpoint + image gen endpoint
- Storage: `localStorage` for meals + goals; `public/uploads/` for images
- Runtime: WSL2, dev server bound to `0.0.0.0:3000`, proxied to Windows host

## Important Discoveries

- **Decisions:**
  - Used CSS custom properties + Tailwind `darkMode: ["class"]` — already wired in tailwind.config.js
  - `ThemeProvider` client component avoids SSR issues; `suppressHydrationWarning` on `<html>` prevents hydration mismatch
  - Macro pill colors: opacity-based (`bg-blue-500/15`) instead of light-mode-only Tailwind color classes (`bg-blue-100`)
  - Goals stored separately from meals under key `macro-estimator-goals` in localStorage
  - `DEFAULT_GOALS` exported from `types.ts` (not `storage.ts`) to avoid circular imports
  - Calorie progress bar turns `bg-destructive` (red) when calories >= goal; shows "X remaining" or "X over"

- **Failed Approaches:**
  - Initial import `import type { Meal, DailySummary, UserGoals, DEFAULT_GOALS } from "./types"` — `DEFAULT_GOALS` is a value not a type; fixed by separating `import type` from `import { DEFAULT_GOALS }`

## Next Steps

1. **PWA manifest + iOS meta** — `manifest.json`, `apple-touch-icon`, `<meta name="theme-color">` for home screen install (low effort)
2. **Goals export/import** — JSON export button in goal modal for cross-device portability
3. **Weekly history chart** — Bar chart of last 7 days calories vs goal without day-by-day navigation

## Context to Preserve

- **Sources:** `tailwind.config.js` — confirmed `darkMode: ["class"]` was already set; no config change needed
- **Sources:** `src/components/meal-card.tsx` — full MACRO_COLORS object and component structure confirmed before editing
- **Sources:** `src/app/api/analyze/route.ts` line 76, `src/app/api/thumbnail/route.ts` line 41 — pre-existing TS18048 errors, now fixed with `?.`
- **Questions:** Dev server keeps dying (exit 143 = SIGTERM) — appears to be a terminal management issue unrelated to app code; `npx tsc --noEmit` passes clean
