import type { Meal, DailySummary } from "./types";

const STORAGE_KEY = "macro-estimator-meals";

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
    const date = meal.createdAt.slice(0, 10); // YYYY-MM-DD
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
