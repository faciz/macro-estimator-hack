export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: string[];
  imageUrl: string; // relative path e.g. /uploads/<uuid>.jpg
  createdAt: string; // ISO date string
}

export interface PendingMeal {
  id: string;
  previewUrl: string; // local object URL or base64 from client resize (may be empty)
  context: string;
  createdAt: string;
}

export interface MealAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: string[];
}

export interface DailySummary {
  date: string;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface UserGoals {
  calories: number;       // kcal target per day
  proteinPct: number;     // % of calories from protein (0-100)
  carbsPct: number;       // % of calories from carbs (0-100)
  fatPct: number;         // % of calories from fat (0-100)
}

export const DEFAULT_GOALS: UserGoals = {
  calories: 2000,
  proteinPct: 30,
  carbsPct: 40,
  fatPct: 30,
};
