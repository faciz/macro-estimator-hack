import type { Meal, DailySummary, UserGoals } from "./types";
import { DEFAULT_GOALS } from "./types";
import { localDateFromIso } from "./date-utils";

const STORAGE_KEY = "macro-estimator-meals";
const GOALS_KEY = "macro-estimator-goals";

export function getMeals(): Meal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Meal[]) : [];
  } catch {
    return [];
  }
}

export function saveMeal(meal: Meal): void {
  const meals = getMeals();
  meals.unshift(meal); // newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
}

export function deleteMeal(id: string): void {
  const meals = getMeals().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
}

export function updateMealImage(id: string, imageUrl: string): void {
  const meals = getMeals().map((m) => m.id === id ? { ...m, imageUrl } : m);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
}

export function getDailySummaries(): DailySummary[] {
  const meals = getMeals();
  const byDate = new Map<string, Meal[]>();

  for (const meal of meals) {
    const date = localDateFromIso(meal.createdAt); // YYYY-MM-DD in user's timezone
    const group = byDate.get(date) ?? [];
    group.push(meal);
    byDate.set(date, group);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayMeals]) => ({
      date,
      meals: dayMeals,
      totalCalories: dayMeals.reduce((s, m) => s + m.calories, 0),
      totalProtein: dayMeals.reduce((s, m) => s + m.protein, 0),
      totalCarbs: dayMeals.reduce((s, m) => s + m.carbs, 0),
      totalFat: dayMeals.reduce((s, m) => s + m.fat, 0),
    }));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isValidGoals(obj: unknown): obj is UserGoals {
  if (typeof obj !== "object" || obj === null) return false;
  const g = obj as Record<string, unknown>;
  const isFinitePositive = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0;
  return (
    isFinitePositive(g.calories) && g.calories > 0 &&
    isFinitePositive(g.proteinPct) &&
    isFinitePositive(g.carbsPct) &&
    isFinitePositive(g.fatPct)
  );
}

export function getGoals(): UserGoals {
  if (typeof window === "undefined") return { ...DEFAULT_GOALS };
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return { ...DEFAULT_GOALS };
    const parsed: unknown = JSON.parse(raw);
    return isValidGoals(parsed) ? parsed : { ...DEFAULT_GOALS };
  } catch {
    return { ...DEFAULT_GOALS };
  }
}

export function saveGoals(goals: UserGoals): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}
