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
