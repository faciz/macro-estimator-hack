"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, ChevronDown, ChevronUp, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meal, PendingMeal } from "@/lib/types";

interface MealCardProps {
  meal: Meal;
  onDelete: (id: string) => void;
  thumbnailLoading?: boolean;
}

interface PendingMealCardProps {
  pending: PendingMeal;
  error?: string;
}

const MACRO_COLORS = {
  protein: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500" },
  carbs: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", bar: "bg-amber-400" },
  fat: { bg: "bg-rose-500/15", text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-400" },
};

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-1.5 hover:bg-black/60 transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

export function MealCard({ meal, onDelete, thumbnailLoading }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const total = meal.protein * 4 + meal.carbs * 4 + meal.fat * 9;
  const proteinPct = total > 0 ? (meal.protein * 4 / total) * 100 : 0;
  const carbsPct = total > 0 ? (meal.carbs * 4 / total) * 100 : 0;
  const fatPct = total > 0 ? (meal.fat * 9 / total) * 100 : 0;

  const time = new Date(meal.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      {lightbox && meal.imageUrl && <ImageLightbox src={meal.imageUrl} alt={meal.name} onClose={() => setLightbox(false)} />}
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="flex gap-3 p-3">
        {/* Thumbnail — click to open lightbox */}
        {meal.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meal.imageUrl}
              alt={meal.name}
              className="h-20 w-20 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightbox(true)}
            />
          </>
        ) : thumbnailLoading ? (
          <div className="h-20 w-20 rounded-xl flex-shrink-0 bg-muted flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="h-20 w-20 rounded-xl flex-shrink-0 bg-muted flex items-center justify-center text-2xl select-none">
            🍽️
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{meal.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-foreground whitespace-nowrap">{meal.calories}</span>
              <span className="text-xs text-muted-foreground">kcal</span>
            </div>
          </div>

          {/* Macro pills */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {(["protein", "carbs", "fat"] as const).map((macro) => (
              <span
                key={macro}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  MACRO_COLORS[macro].bg,
                  MACRO_COLORS[macro].text
                )}
              >
                {macro.charAt(0).toUpperCase() + macro.slice(1)}: {meal[macro]}g
              </span>
            ))}
          </div>

          {/* Macro bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden mt-2 gap-0.5">
            <div className="bg-blue-500 rounded-l-full" style={{ width: `${proteinPct}%` }} />
            <div className="bg-amber-400" style={{ width: `${carbsPct}%` }} />
            <div className="bg-rose-400 rounded-r-full" style={{ width: `${fatPct}%` }} />
          </div>
        </div>
      </div>

      {/* Expand / Actions */}
      <div className="border-t border-border px-3 py-1.5 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide items" : `${meal.items.length} items`}
        </button>
        <button
          onClick={() => onDelete(meal.id)}
          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Delete meal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {meal.items.map((item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </>
  );
}

export function PendingMealCard({ pending, error }: PendingMealCardProps) {
  return (
    <div className={cn(
      "bg-card border rounded-2xl overflow-hidden shadow-sm",
      error ? "border-destructive/50" : "border-border"
    )}>
      <div className="flex gap-3 p-3 items-center">
        {/* Thumbnail or skeleton */}
        {pending.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pending.previewUrl} alt="Meal" className="h-20 w-20 rounded-xl object-cover flex-shrink-0 opacity-60" />
        ) : (
          <div className="h-20 w-20 rounded-xl flex-shrink-0 bg-muted flex items-center justify-center text-2xl select-none opacity-60">
            🍽️
          </div>
        )}

        <div className="flex-1 min-w-0">
          {error ? (
            <>
              <p className="text-sm font-medium text-destructive">Analysis failed</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{error}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                <p className="text-sm font-medium text-foreground">Analyzing…</p>
              </div>
              {pending.context && (
                <p className="text-xs text-muted-foreground italic line-clamp-2">&ldquo;{pending.context}&rdquo;</p>
              )}
              {/* Skeleton bars */}
              <div className="mt-2 space-y-1.5">
                <div className="h-2 w-3/4 rounded-full bg-muted animate-pulse" />
                <div className="h-2 w-1/2 rounded-full bg-muted animate-pulse" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
