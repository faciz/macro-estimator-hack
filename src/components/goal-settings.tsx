"use client";

import { useEffect, useState } from "react";
import { X, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveGoals } from "@/lib/storage";
import type { UserGoals } from "@/lib/types";

interface GoalSettingsProps {
  goals: UserGoals;
  onClose: () => void;
  onSave: (goals: UserGoals) => void;
}

export function GoalSettings({ goals, onClose, onSave }: GoalSettingsProps) {
  const [calories, setCalories] = useState(String(goals.calories));
  const [proteinPct, setProteinPct] = useState(goals.proteinPct);
  const [carbsPct, setCarbsPct] = useState(goals.carbsPct);
  const [fatPct, setFatPct] = useState(goals.fatPct);

  const sum = proteinPct + carbsPct + fatPct;
  const sumOk = sum === 100;

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Derived gram targets for preview
  const kcal = Number(calories) || 0;
  const proteinG = Math.round((kcal * proteinPct) / 100 / 4);
  const carbsG = Math.round((kcal * carbsPct) / 100 / 4);
  const fatG = Math.round((kcal * fatPct) / 100 / 9);

  function handleSave() {
    if (!sumOk || kcal <= 0) return;
    const next: UserGoals = {
      calories: kcal,
      proteinPct,
      carbsPct,
      fatPct,
    };
    saveGoals(next);
    onSave(next);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative z-50 w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Daily Goals</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Calories */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="goal-calories">
            Calorie Target
          </label>
          <div className="flex items-center gap-2">
            <input
              id="goal-calories"
              type="number"
              min={500}
              max={9999}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">kcal</span>
          </div>
        </div>

        {/* Macro splits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Macro Split</p>
            <span className={cn("text-xs font-mono", sumOk ? "text-primary" : "text-destructive")}>
              {sum}% / 100%
            </span>
          </div>

          <MacroSlider
            label="Protein"
            color="bg-blue-500"
            value={proteinPct}
            onChange={setProteinPct}
            grams={proteinG}
          />
          <MacroSlider
            label="Carbs"
            color="bg-amber-400"
            value={carbsPct}
            onChange={setCarbsPct}
            grams={carbsG}
          />
          <MacroSlider
            label="Fat"
            color="bg-rose-400"
            value={fatPct}
            onChange={setFatPct}
            grams={fatG}
          />
        </div>

        {!sumOk && (
          <p className="text-xs text-destructive text-center">
            Macro percentages must add up to 100% (currently {sum}%)
          </p>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!sumOk || kcal <= 0}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold transition-opacity disabled:opacity-40"
        >
          Save Goals
        </button>
      </div>
    </div>
  );
}

function MacroSlider({
  label,
  color,
  value,
  onChange,
  grams,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
  grams: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", color)} />
          <span className="font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{grams}g</span>
          <span className="font-mono w-8 text-right">{value}%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
      />
    </div>
  );
}
