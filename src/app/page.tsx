"use client";

import { useCallback, useEffect, useState } from "react";
import { Salad, ChevronLeft, ChevronRight, Moon, Sun, Settings2 } from "lucide-react";
import { PhotoUploader } from "@/components/photo-uploader";
import { MealCard, PendingMealCard } from "@/components/meal-card";
import { DailySummaryCard } from "@/components/daily-summary-card";
import { GoalSettings } from "@/components/goal-settings";
import { useTheme } from "@/components/theme-provider";
import {
  deleteMeal,
  getDailySummaries,
  getGoals,
  saveMeal,
  updateMealImage,
} from "@/lib/storage";
import type { DailySummary, MealAnalysis, PendingMeal, UserGoals } from "@/lib/types";
import { toLocalDateStr } from "@/lib/date-utils";

function todayStr() {
  return toLocalDateStr();
}

function offsetDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

function formatNavDate(dateStr: string) {
  const today = todayStr();
  const yesterday = offsetDate(today, -1);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function Home() {
  const { resolvedTheme, setTheme } = useTheme();
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [pendingMeals, setPendingMeals] = useState<PendingMeal[]>([]);
  const [pendingErrors, setPendingErrors] = useState<Record<string, string>>({});
  const [thumbnailLoading, setThumbnailLoading] = useState<Set<string>>(new Set());
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [showGoals, setShowGoals] = useState(false);

  const refresh = useCallback(() => {
    setSummaries(getDailySummaries());
  }, []);

  useEffect(() => {
    refresh();
    setGoals(getGoals());
  }, [refresh]);

  function handlePending(pending: PendingMeal) {
    setPendingMeals((prev) => [pending, ...prev]);
  }

  function handleAnalysis(id: string, analysis: MealAnalysis, imageUrl: string) {
    const macroFields = [analysis.calories, analysis.protein, analysis.carbs, analysis.fat];
    if (!macroFields.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)) {
      setPendingErrors((prev) => ({ ...prev, [id]: "AI returned invalid macro values" }));
      return;
    }
    const pending = pendingMeals.find((p) => p.id === id);
    const createdAt = pending?.createdAt ?? new Date(`${selectedDate}T12:00:00`).toISOString();
    saveMeal({ id, ...analysis, imageUrl, createdAt });
    setPendingMeals((prev) => prev.filter((p) => p.id !== id));
    if (!imageUrl && !pending?.previewUrl) {
      setThumbnailLoading((prev) => new Set(prev).add(id));
    }
    refresh();
  }

  function handleImageReady(id: string, imageUrl: string) {
    updateMealImage(id, imageUrl);
    setThumbnailLoading((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    refresh();
  }

  function handlePendingError(id: string, message: string) {
    setPendingErrors((prev) => ({ ...prev, [id]: message }));
  }

  function dismissError(id: string) {
    setPendingMeals((prev) => prev.filter((p) => p.id !== id));
    setPendingErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleDelete(id: string) {
    deleteMeal(id);
    refresh();
  }

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  const isToday = selectedDate === todayStr();
  const selectedSummary: DailySummary | undefined = summaries.find((s) => s.date === selectedDate);
  const selectedMeals = selectedSummary?.meals ?? [];

  const minDate = offsetDate(todayStr(), -90);
  const canGoBack = selectedDate > minDate;
  const canGoForward = selectedDate < todayStr();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pb-16">
        {/* Header */}
        <header className="py-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Salad className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground flex-1">Macro Estimator</h1>
          <button
            onClick={() => setShowGoals(true)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Goal settings"
          >
            <Settings2 className="h-5 w-5" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        {/* Upload zone */}
        <section className="mb-6">
          <PhotoUploader
            onPending={handlePending}
            onAnalysis={handleAnalysis}
            onImageReady={handleImageReady}
            onError={handlePendingError}
          />
        </section>

        {/* Day navigator */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedDate(offsetDate(selectedDate, -1))}
            disabled={!canGoBack}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-semibold text-foreground">{formatNavDate(selectedDate)}</span>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr())}
                className="text-xs text-primary hover:underline"
              >
                Back to today
              </button>
            )}
          </div>
          <button
            onClick={() => setSelectedDate(offsetDate(selectedDate, 1))}
            disabled={!canGoForward}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Daily summary */}
        {selectedSummary && (
          <section className="mb-4">
            <DailySummaryCard summary={selectedSummary} goals={goals ?? undefined} />
          </section>
        )}

        {/* Pending meals */}
        {pendingMeals.length > 0 && (
          <section className="mb-4 space-y-3">
            {pendingMeals.map((p) => (
              <div
                key={p.id}
                onClick={pendingErrors[p.id] ? () => dismissError(p.id) : undefined}
                className={pendingErrors[p.id] ? "cursor-pointer" : undefined}
              >
                <PendingMealCard pending={p} error={pendingErrors[p.id]} />
                {pendingErrors[p.id] && (
                  <p className="text-xs text-muted-foreground text-center mt-1">Tap to dismiss</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Meals for selected day */}
        {selectedMeals.length > 0 ? (
          <section className="mb-6">
            <div className="space-y-3">
              {selectedMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onDelete={handleDelete}
                  thumbnailLoading={thumbnailLoading.has(meal.id)}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Salad className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No meals logged {isToday ? "today" : "this day"}</p>
            <p className="text-sm mt-1">
              Take a photo to log a meal{!isToday ? " for this day" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Goals modal */}
      {showGoals && goals && (
        <GoalSettings
          goals={goals}
          onClose={() => setShowGoals(false)}
          onSave={(next) => setGoals(next)}
        />
      )}
    </div>
  );
}
