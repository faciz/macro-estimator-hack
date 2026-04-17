import { cn } from "@/lib/utils";
import type { DailySummary } from "@/lib/types";

interface DailySummaryCardProps {
  summary: DailySummary;
}

const MACROS = [
  { key: "totalProtein" as const, label: "Protein", color: "bg-blue-500", unit: "g" },
  { key: "totalCarbs" as const, label: "Carbs", color: "bg-amber-400", unit: "g" },
  { key: "totalFat" as const, label: "Fat", color: "bg-rose-400", unit: "g" },
];

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === today.toISOString().slice(0, 10)) return "Today";
  if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function DailySummaryCard({ summary }: DailySummaryCardProps) {
  const maxMacro = Math.max(summary.totalProtein, summary.totalCarbs, summary.totalFat, 1);

  return (
    <div className="bg-gradient-to-br from-primary/5 via-background to-background border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-bold text-foreground">{formatDate(summary.date)}</h2>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-primary">{summary.totalCalories.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">kcal</span>
        </div>
      </div>

      <div className="space-y-2">
        {MACROS.map(({ key, label, color, unit }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12">{label}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${Math.min(100, (summary[key] / maxMacro) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-foreground w-10 text-right">
              {summary[key]}{unit}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        {summary.meals.length} {summary.meals.length === 1 ? "meal" : "meals"} logged
      </p>
    </div>
  );
}
