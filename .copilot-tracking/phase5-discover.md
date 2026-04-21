<!-- markdownlint-disable-file -->
# Phase 5: Discover — macro-estimator-hack Productionize

**Date:** 2026-04-17

---

## Suggested Next Work

### Item 1 — Dark Mode Toggle (Priority 1)

**Files:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
**Depends on:** Nothing — implement first
**Work:**
- Add `.dark { --background: ...; --foreground: ...; ... }` override block to `globals.css` with dark-safe inverted values for all CSS custom properties
- Add `suppressHydrationWarning` attribute to the `<html>` element in `layout.tsx`
- Add an inline `<script>` hydration guard to `layout.tsx` (executes before React renders) that reads `localStorage.theme` and calls `document.documentElement.classList.add('dark')` to prevent FOUC on reload
- Add a sun/moon icon toggle button in `page.tsx` header that writes `localStorage.theme` and toggles the `.dark` class on `document.documentElement` on click

---

### Item 2 — GoalSettings Type + Storage Layer (Priority 2)

**Files:** `src/lib/types.ts`, `src/lib/storage.ts`
**Depends on:** Nothing — but required by Items 3, 4, and 5; must be implemented before them
**Work:**
- Add `GoalSettings` interface to `types.ts`:
  ```ts
  export interface GoalSettings {
    dailyCalories: number;  // e.g. 2000
    proteinPct: number;     // e.g. 30 (%)
    carbsPct: number;       // e.g. 40 (%)
    fatPct: number;         // e.g. 30 (%)
  }
  ```
- Add `getGoals(): GoalSettings` to `storage.ts` — reads from `localStorage` key `"goals"`, returns defaults `{ dailyCalories: 2000, proteinPct: 30, carbsPct: 40, fatPct: 30 }` if key is absent or value is malformed
- Add `saveGoals(g: GoalSettings): void` to `storage.ts` — serializes and persists to `localStorage` key `"goals"`

---

### Item 3 — Goal Settings Modal Component (Priority 3)

**Files:** `src/components/goal-settings-modal.tsx` *(new file)*
**Depends on:** Item 2 must be complete
**Work:**
- Slide-up sheet modal triggered by a gear icon in the page header
- Inputs: calorie target (number input), protein % slider, carbs % slider, fat % slider
- Live validation: protein + carbs + fat must sum to exactly 100; display a live running sum counter; disable the Save button when sum ≠ 100
- On save: calls `saveGoals()` with validated values, then emits the updated `GoalSettings` to the parent via callback prop

---

### Item 4 — Goal-Aware Daily Summary Card (Priority 4)

**Files:** `src/components/daily-summary-card.tsx`
**Depends on:** Items 2 and 3 must be complete
**Work:**
- Accept `goals: GoalSettings` as a new prop
- Show calorie progress bar: `actual kcal / dailyCalories` — color-coded fill: green when < 90% of goal, yellow at 90–105%, red when > 105%
- Derive goal grams per macro: `goalG = (dailyCalories × pct / 100) / calsPerGram` using protein = 4 cal/g, carbs = 4 cal/g, fat = 9 cal/g
- Macro bars show `actual g` vs `goal g` (not just relative to each other as today)
- Display goal grams alongside actuals in the UI (e.g., `"82g / 150g protein"`)

---

### Item 5 — Wire Goals Into Page (Priority 5)

**Files:** `src/app/page.tsx`
**Depends on:** Items 2, 3, and 4 must all be complete
**Work:**
- Load goals with `getGoals()` on component mount into `useState<GoalSettings>`
- Pass `goals` prop down to `<DailySummaryCard />`
- Render a gear icon button in the page header; on click, open `<GoalSettingsModal />`
- On modal save callback: update local goals state and persist via `saveGoals()`

---

### Item 6 — General Cleanup (Priority 6)

**Files:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/utils.ts` *(new or existing)*
**Depends on:** Nothing — independent; can run in parallel with Items 1–2
**Work:**
- Add `<meta name="viewport" content="width=device-width, initial-scale=1" />` to `layout.tsx`
- Add `<meta name="theme-color">` with dual light/dark `media` attribute variants to `layout.tsx`
- Consolidate the duplicate `formatDate` function from component files into a single shared export in `src/lib/utils.ts`
- Add an upper-bound guard to day navigation in `page.tsx`: disable the "next day" button when the currently viewed date equals today's date
