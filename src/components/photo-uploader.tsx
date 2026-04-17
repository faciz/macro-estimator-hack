"use client";

import { useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MealAnalysis, PendingMeal } from "@/lib/types";

interface PhotoUploaderProps {
  onPending: (pending: PendingMeal) => void;
  onAnalysis: (id: string, analysis: MealAnalysis, imageUrl: string) => void;
  onImageReady: (id: string, imageUrl: string) => void;
  onError: (id: string, message: string) => void;
}

export function PhotoUploader({ onPending, onAnalysis, onImageReady, onError }: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [context, setContext] = useState("");

  function reset() {
    setPreview(null);
    setError(null);
    setContext("");
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    setError(null);
    const base64 = await resizeImage(file, 1024);
    setPreview(base64);
  }

  function submit() {
    if (!context.trim() && !preview) {
      setError("Add a photo or describe your meal first");
      return;
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const pending: PendingMeal = { id, previewUrl: preview ?? "", context: context.trim(), createdAt };

    // Tell parent immediately so the card appears
    onPending(pending);
    // Reset the form right away
    reset();

    // Fire the API in the background
    void (async () => {
      try {
        const formData = new FormData();
        if (pending.previewUrl) {
          const blobRes = await fetch(pending.previewUrl);
          const blob = await blobRes.blob();
          formData.append("file", blob, "image.jpg");
        }
        if (pending.context) formData.append("context", pending.context);

        const res = await fetch("/api/analyze", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json() as { error: string };
          throw new Error(err.error ?? "Analysis failed");
        }
        const { imageUrl: initialImageUrl, ...analysis } = await res.json() as MealAnalysis & { imageUrl: string };
        // Return macros immediately — card becomes visible with real data
        onAnalysis(id, analysis, initialImageUrl);
        // Generate thumbnail in the background (only when no real photo was uploaded)
        if (!pending.previewUrl && analysis.name) {
          void fetch("/api/thumbnail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: analysis.name, items: analysis.items }),
          })
            .then((r) => r.json() as Promise<{ imageUrl: string }>)
            .then(({ imageUrl }) => { if (imageUrl) onImageReady(id, imageUrl); })
            .catch(() => {/* ignore thumbnail failures */});
        }
      } catch (e: unknown) {
        onError(id, e instanceof Error ? e.message : "Something went wrong");
      }
    })();
  }

  return (
    <div className="w-full">
      {/* Use id-based labels so iOS Safari triggers the input without any JS .click() */}
      <input id="uploader-file" type="file" accept="image/*" className="sr-only" onChange={(e) => void handleFiles(e.target.files)} />
      <input id="uploader-camera" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void handleFiles(e.target.files)} />

      {preview ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Meal preview" className="w-full max-h-72 object-cover" />
          <div className="p-3 flex flex-col gap-2">
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Optional: add context (e.g. large portion, homemade with less oil, half eaten)"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors inline-flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                onClick={submit}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Analyze
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
          className={cn(
            "border-2 border-dashed rounded-2xl p-8 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Upload a meal photo</p>
              <p className="text-sm text-muted-foreground mt-1">Drag & drop or choose an option below</p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <label
                htmlFor="uploader-camera"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </label>
              <label
                htmlFor="uploader-file"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </label>
            </div>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Optional: add context (e.g. large portion, homemade with less oil, half eaten)"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={submit}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Analyze
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}

function resizeImage(file: File, maxSide: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}
