"use client";

import { useState } from "react";
import { CameraEvent, formatRelativeTime } from "@/lib/types";
import { ImageViewer } from "./ImageViewer";

export interface CameraEventListProps {
  events: CameraEvent[];
  getImageUrl: (imagePath: string) => string;
  maxEvents?: number;
}

export function CameraEventList({
  events,
  getImageUrl,
  maxEvents = 24,
}: CameraEventListProps) {
  const [selectedEvent, setSelectedEvent] = useState<CameraEvent | null>(null);

  const displayEvents = events.slice(0, maxEvents);

  if (events.length === 0) {
    return (
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-(--tm-muted)">
          Camera Events
        </div>
        <div className="py-8 text-center text-sm text-(--tm-muted)">
          No camera events found
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-(--tm-muted)">
        Camera Events
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayEvents.map((event) => {
          const detections = event.detections ?? [];
          const topDetection =
            detections.length > 0
              ? detections.reduce((a, b) =>
                  a.confidence > b.confidence ? a : b,
                )
              : null;
          const otherCount = detections.length > 1 ? detections.length - 1 : 0;

          return (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="rounded-lg border border-(--tm-border) bg-(--tm-panel) overflow-hidden cursor-pointer hover:border-(--tm-accent) transition-colors"
            >
              {/* Thumbnail */}
              {event.image_path ? (
                <img
                  src={getImageUrl(event.image_path)}
                  alt={`Camera event ${formatRelativeTime(event.captured_at)}`}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-(--tm-bg-subtle) text-(--tm-muted)">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                    />
                  </svg>
                </div>
              )}

              {/* Info */}
              <div className="p-2">
                {topDetection ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-(--tm-text) truncate">
                        {topDetection.class_name}
                      </span>
                      <span className="shrink-0 text-xs rounded-full px-1.5 py-0.5 bg-(--tm-accent)/10 text-(--tm-accent)">
                        {Math.round(topDetection.confidence * 100)}%
                      </span>
                    </div>
                    {otherCount > 0 && (
                      <div className="text-xs text-(--tm-muted)">
                        +{otherCount} more
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-(--tm-muted)">No detections</div>
                )}
                <div className="mt-0.5 text-xs text-(--tm-muted)">
                  {formatRelativeTime(event.captured_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Viewer Modal */}
      {selectedEvent && selectedEvent.image_path && (
        <ImageViewer
          event={selectedEvent}
          imageUrl={getImageUrl(selectedEvent.image_path)}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
