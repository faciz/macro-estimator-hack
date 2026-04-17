<!-- markdownlint-disable-file -->

# Meal Tracker - Implementation Plan

## Overview

Build a Next.js meal tracking app with Gemini AI photo analysis.

## Objectives

1. Photo upload → AI macro estimation → auto-save
2. Meal history with daily calorie/macro summaries
3. Mobile-friendly responsive design

## Phases

### Phase 1: Project Scaffolding <!-- parallelizable: false -->

- [x] Initialize Next.js 15 project with TypeScript and Tailwind
- [x] Install dependencies (shadcn/ui, @google/genai)
- [x] Configure shadcn/ui
- [x] Set up project structure

### Phase 2: Core Data Layer <!-- parallelizable: false -->

- [x] Create Meal type definitions
- [x] Create localStorage utility (CRUD for meals)
- [x] Create Gemini API route handler

### Phase 3: UI Components <!-- parallelizable: true -->

- [x] Photo upload component with camera support
- [x] Meal card component showing macros
- [x] Daily summary component
- [x] Main page layout with meal list

### Phase 4: Integration <!-- parallelizable: false -->

- [x] Wire upload → API → save → refresh flow
- [x] Add loading states and error handling
- [x] Add .env.example with GEMINI_API_KEY

## Dependencies

- Next.js 15, TypeScript, Tailwind CSS
- shadcn/ui components
- @google/genai (Gemini SDK)

## Success Criteria

- Can upload a photo and see macro estimates
- Meals persist across page refreshes
- Daily totals shown
- Mobile-responsive

---

## Phase 4: Review Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-01 | High | Missing env var validation — AzureOpenAI client instantiated with `!` assertions, cryptic SDK error on missing vars | Fixed (D-02) |
| F-02 | High | No server-side file type/size validation — any file or oversized image accepted | Fixed (D-03) |
| F-03 | Medium | Race condition on meals.json concurrent writes | N/A — actual implementation uses localStorage (single-threaded) |
| F-04 | Medium | Images stored as base64 in localStorage — large payloads, localStorage quota risk | Fixed (D-07) |
| F-05 | Medium | No macro field validation — negative/NaN values could be saved | Fixed (D-04) |
| F-06 | Medium | Azure OpenAI response not schema-validated — malformed AI output silently stored | Fixed (D-05) |
| F-07 | Low | No authentication on API routes | Accepted risk for hackathon scope |
| F-08 | Low | Missing `data/` directory at startup | N/A — actual implementation uses localStorage |

## Phase 5: Discover — Implementation

Completed 2026-04-16. All applicable items implemented.

| ID | Title | Effort | Files | Status |
|----|-------|--------|-------|--------|
| D-01 | Fix missing `data/` dir creation | XS | `src/lib/storage.ts` | N/A (localStorage-based, not applicable) |
| D-02 | Add env var validation | XS | `src/app/api/analyze/route.ts` | ✅ Done |
| D-03 | Add file type & size validation | S | `src/app/api/analyze/route.ts` | ✅ Done |
| D-04 | Validate macro fields before saving | S | `src/app/page.tsx` | ✅ Done |
| D-05 | Validate Azure OpenAI response schema | S | `src/app/api/analyze/route.ts` | ✅ Done |
| D-06 | Fix race condition on meals.json | M | storage layer | N/A (localStorage-based, not applicable) |
| D-07 | Store images as files instead of base64 | M | `src/app/api/analyze/route.ts`, `src/lib/types.ts`, `src/components/photo-uploader.tsx`, `src/app/page.tsx`, `src/components/meal-card.tsx` | ✅ Done |

### Architecture Delta (D-07)

- **Before:** Client resized image → base64 data URL → stored in localStorage as `imageBase64`
- **After:** Client resizes image → sends as `multipart/form-data` → server saves to `public/uploads/<uuid>.jpg` → stores `/uploads/<uuid>.jpg` path in localStorage as `imageUrl`
- Images served as Next.js static assets; localStorage stores path strings only (no base64 bloat)
