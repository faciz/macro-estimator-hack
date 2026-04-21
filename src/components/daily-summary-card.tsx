import { cn } from "@/lib/utils";
import type { DailySummary, UserGoals } from "@/lib/types";

interface DailySummaryCardProps {
  summary: DailySummary;
  goals?: UserGoals;
}

const MACROS = [
  { key: "totalProtein" as const, label: "Protein", color: "bg-blue-500", calPerG: 4 },
  { key: "totalCarbs" as const, label: "Carbs", color: "bg-amber-400", calPerG: 4 },
  { key: "totalFat" as const, label: "Fat", color: "bg-rose-400", calPerG: 9 },
];

export function DailySummaryCard({ summary, goals }: DailySummaryCardProps) {
  const caloriePct = goals
    ? Math.min(100, (summary.totalCalories / goals.calories) * 100)
    : null;

  const macroGoalGrams = goals
    ? {
        totalProtein: Math.round((goals.calories * goals.proteinPct) / 100 / 4),
        totalCarbs: Math.round((goals.calories * goals.carbsPct) / 100 / 4),
        totalFat: Math.round((goals.calories * goals.fatPct) / 100 / 9),
      }
    : null;

  // fallback bar scaling when no goals — scale to the tallest macro
  const maxMacro = Math.max(summary.totalProtein, summary.totalCarbs, summary.totalFat, 1);

  return (
    <div className="bg-gradient-to-br from-primary/5 via-background to-background border border-border rounded-2xl p-4 shadow-sm">
      {/* Calorie row */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-primary">
            {summary.totalCalories.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {goals ? `/ ${goals.calories.toLocaleString()} kcal` : "kcal"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {summary.meals.length} {summary.meals.length === 1 ? "meal" : "meals"}
        </span>
      </div>

      {/* Calorie progress bar */}
      {caloriePct !== null && (
        <div className="mb-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                caloriePct >= 100 ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${caloriePct}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {summary.totalCalories >= (goals?.calories ?? 0)
                ? `${(summary.totalCalories - (goals?.calories ?? 0)).toLocaleString()} over`
                : `${((goals?.calories ?? 0) - summary.totalCalories).toLocaleString()} remaining`}
            </span>
            <span className="text-[10px] text-muted-foreground">{Math.round(caloriePct)}%</span>
          </div>
        </div>
      )}

      {/* Macro bars */}
      <div className="space-y-2">
        {MACROS.map(({ key, label, color }) => {
          const actual = summary[key];
          const goalG = macroGoalGrams?.[key];
          const pct = goalG != null
            ? Math.min(100, (actual / Math.max(goalG, 1)) * 100)
            : Math.min(100, (actual / maxMacro) * 100);

          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12">{label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground w-20 text-right">
                {actual}g{goalG != null ? ` / ${goalG}g` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
