<!-- markdownlint-disable-file -->
# Phase 4: Review — macro-estimator-hack Productionize

**Date:** 2026-04-17
**Reviewer:** RPI Agent
**Validation:** `npx tsc --noEmit` → Exit 0 ✅

---

## Request Fulfillment

| User Request | Status |
|---|---|
| Dark mode | ❌ Not started — no `.dark {}` block, no toggle, no FOUC guard |
| Calorie goal | ❌ Not started — no `GoalSettings` type, no storage, no UI |
| Macro percent targets | ❌ Not started — daily-summary-card shows relative bars only |
| General cleanup | ❌ Not started — viewport meta missing, formatDate duplicated, future-date nav unrestricted |

---

## Findings

### 🔴 HIGH — No Dark Mode Support

`globals.css` defines CSS custom properties for the light theme only. No `.dark {}` overrides exist. `layout.tsx` has no `suppressHydrationWarning` on `<html>` and no inline theme script, meaning React will throw a hydration mismatch error if an inline script is later added. Without a hydration guard that reads `localStorage.theme` before first paint, users will experience a flash of unstyled content (FOUC) on every hard reload.

**Files affected:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`

---

### 🔴 HIGH — No Calorie or Macro Goal Support

`src/lib/types.ts` has no `GoalSettings` interface. `src/lib/storage.ts` has no `getGoals()` or `saveGoals()` functions. `src/components/daily-summary-card.tsx` renders macro bars as ratios of each other (relative-only) with no concept of a target. Users cannot set or track against daily calorie or macro targets. This is a core requested feature that is entirely absent from the codebase.

**Files affected:** `src/lib/types.ts`, `src/lib/storage.ts`, `src/components/daily-summary-card.tsx`

---

### 🟡 MEDIUM — Missing Viewport and Theme-Color Meta Tags

`src/app/layout.tsx` does not include `<meta name="viewport" content="width=device-width, initial-scale=1" />`. On mobile browsers, this causes the browser to render the page at desktop width and then scale it down, breaking the layout. Additionally, no `<meta name="theme-color">` is present, so the browser chrome does not adapt to the app's color scheme on mobile — particularly important once dark mode is added.

**Files affected:** `src/app/layout.tsx`

---

### 🟡 MEDIUM — Missing `suppressHydrationWarning` on `<html>`

When a dark-mode inline `<script>` is injected into `layout.tsx` (to set the `dark` class before React hydrates), React will detect a mismatch between the server-rendered HTML and the client-hydrated DOM and log a warning — or in strict mode, throw an error. `suppressHydrationWarning` on the `<html>` element is required to prevent this. It is not present in the current `layout.tsx`.

**Files affected:** `src/app/layout.tsx`

---

### 🟢 LOW — Duplicate `formatDate` Utility

The `formatDate` function is independently defined in multiple component files. This violates the DRY principle and creates a risk of implementations diverging over time. It should be consolidated into a single shared export in `src/lib/utils.ts`.

**Files affected:** `src/app/page.tsx`, component files, `src/lib/utils.ts` (new)

---

### 🟢 LOW — Future-Date Navigation Allowed

The day navigation in `src/app/page.tsx` allows the user to navigate forward past today's date with no upper-bound guard. The "next day" button should be disabled when the currently viewed date equals today, preventing users from viewing or logging meals for future dates that cannot have data.

**Files affected:** `src/app/page.tsx`

---

### ✅ PASS — TypeScript Clean

`npx tsc --noEmit` → Exit 0. Zero type errors in the current codebase. All implementation will start from a clean type-check baseline.

---

## Overall Status: **Iterate**

All three user-requested features (dark mode, calorie goal, macro percent targets) are entirely unimplemented. General cleanup items are also unaddressed. Proceed to Phase 3: Implement following the Phase 5 discovery order.
