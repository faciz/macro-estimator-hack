<!-- markdownlint-disable-file -->
# Macro Estimator — Productionize Session

**Date:** 2026-04-17
**Session Goal:** Clean up codebase and add dark mode, calorie goal, and macro percent targets to make the app production-ready.

## Codebase Snapshot

- **Framework:** Next.js 16.2.4 (Turbopack), React 19, TypeScript, `"use client"` throughout
- **Styling:** Tailwind CSS v3.4 + CSS custom properties (`--background`, `--foreground`, `--primary`, etc.) — light-only; no `.dark {}` block
- **AI Integration:** Azure OpenAI via `DefaultAzureCredential`. Vision: `gpt-5.4-mini`, Image gen: `gpt-image-1.5`
- **Storage:** `localStorage` for meals/goals; `public/uploads/` on disk for thumbnails

## Phase 4 Review — Key Findings

| Finding | Severity |
|--------|----------|
| No dark mode support | 🔴 High |
| No calorie/macro goals | 🔴 High |
| No viewport/theme-color meta | 🟡 Medium |
| No `suppressHydrationWarning` on `<html>` | 🟡 Medium |
| Duplicate `formatDate` utility | 🟢 Low |
| Future-date navigation allowed | 🟢 Low |
| TypeScript clean — `tsc --noEmit` Exit 0 | ✅ Pass |

## Phase 5 — Implementation Order

1. Dark mode toggle (globals.css, layout.tsx, page.tsx)
2. GoalSettings type + storage layer (types.ts, storage.ts)
3. Goal settings modal component (new: goal-settings-modal.tsx)
4. Goal-aware daily summary card (daily-summary-card.tsx)
5. Wire goals into page (page.tsx)
6. General cleanup (layout.tsx, page.tsx, utils.ts)
