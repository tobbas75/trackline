"use client";

import { useEffect, useCallback } from "react";
import { CameraEvent, formatRelativeTime } from "@/lib/types";

export interface ImageViewerProps {
  event: CameraEvent;
  imageUrl: string;
  onClose: () => void;
}

function getConfidenceBorderColor(confidence: number): string {
  if (confidence >= 0.8) return "border-green-400";
  if (confidence >= 0.5) return "border-yellow-400";
  return "border-red-400";
}

export function ImageViewer({ event, imageUrl, onClose }: ImageViewerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const detections = event.detections ?? [];

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-black/50 px-3 py-1 text-lg text-white hover:bg-black/80 transition-colors"
        aria-label="Close image viewer"
      >
        X
      </button>

      {/* Image container — stop propagation so clicking image doesn't close */}
      <div
        className="relative inline-block"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={`Camera event from ${formatRelativeTime(event.captured_at)}`}
          className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg"
        />

        {/* Bounding box overlays */}
        {detections.map((detection) => (
          <div
            key={detection.id}
            className={`absolute border-2 rounded-sm pointer-events-none ${getConfidenceBorderColor(detection.confidence)}`}
            style={{
              left: `${detection.x * 100}%`,
              top: `${detection.y * 100}%`,
              width: `${detection.width * 100}%`,
              height: `${detection.height * 100}%`,
            }}
          >
            {/* Label above bounding box */}
            <span className="absolute -top-6 left-0 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
              {detection.class_name} {Math.round(detection.confidence * 100)}%
            </span>
          </div>
        ))}

        {/* No detections message */}
        {detections.length === 0 && (
          <div className="mt-2 text-center text-sm text-white/60">
            No detections
          </div>
        )}

        {/* Event metadata */}
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/80">
          <span>{new Date(event.captured_at).toLocaleString("en-AU")}</span>
          {event.model_name && <span>Model: {event.model_name}</span>}
          {event.battery_percent !== undefined && (
            <span>Battery: {event.battery_percent}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
