"use client";

import { TrapEvent, CameraEvent, formatRelativeTime } from "@/lib/types";
import type { TimelineItem } from "@/hooks/useDashboardData";

interface EventListProps {
  events: TrapEvent[];
  onAcknowledge: (eventId: number) => void;
  maxEvents?: number;
}

export function EventList({ events, onAcknowledge, maxEvents = 18 }: EventListProps) {
  return (
    <div className="border-t border-(--tm-border) p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-(--tm-muted)">
        Recent Events
      </div>
      {events.slice(0, maxEvents).map((event) => (
        <EventRow
          key={event.id}
          event={event}
          onAck={() => onAcknowledge(event.id)}
        />
      ))}
    </div>
  );
}

// ── Event Row for Feed ────────────────────────────────────────────────────────
function EventRow({ event, onAck }: { event: TrapEvent; onAck: () => void }) {
  const icon =
    event.event_type === "TRAP"
      ? event.trap_caught
        ? "🔴"
        : "⚪"
      : event.event_type === "HEALTH"
        ? "💚"
        : "⚠️";

  return (
    <div
      className={`mb-1 flex items-start gap-2 rounded-lg border p-2 text-xs ${
        event.trap_caught && !event.acknowledged
          ? "border-(--tm-danger-border) bg-(--tm-danger-soft)"
          : "border-(--tm-border) bg-(--tm-panel) hover:bg-(--tm-panel-soft)"
      }`}
    >
      <span className="text-sm shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium text-(--tm-text)">
          {event.unit_id}
        </div>
        <div className="text-(--tm-muted)">
          {formatRelativeTime(event.triggered_at)}
        </div>
      </div>
      {event.trap_caught && !event.acknowledged && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAck();
          }}
          aria-label={`Acknowledge event for ${event.unit_id}`}
          className="shrink-0 rounded-md bg-(--tm-danger) px-2 py-1 text-xs font-semibold text-white transition-colors hover:opacity-80"
        >
          ACK
        </button>
      )}
    </div>
  );
}

// ── Unified Timeline (VIEW-07) ───────────────────────────────────────────────

interface UnifiedTimelineProps {
  items: TimelineItem[];
  onAcknowledge: (eventId: number) => void;
  getImageUrl: (imagePath: string) => string;
  maxEvents?: number;
}

export function UnifiedTimeline({ items, onAcknowledge, getImageUrl, maxEvents = 18 }: UnifiedTimelineProps) {
  if (items.length === 0) return null;

  return (
    <div className="border-t border-(--tm-border) p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-(--tm-muted)">
        Recent Events
      </div>
      {items.slice(0, maxEvents).map((item) => (
        item.type === 'trap' && item.trapEvent ? (
          <div key={item.id} className="flex items-start gap-1">
            <span className="mt-2 shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">TRAP</span>
            <div className="flex-1 min-w-0">
              <EventRow event={item.trapEvent} onAck={() => onAcknowledge(item.trapEvent!.id)} />
            </div>
          </div>
        ) : item.type === 'camera' && item.cameraEvent ? (
          <CameraEventRow key={item.id} event={item.cameraEvent} getImageUrl={getImageUrl} />
        ) : null
      ))}
    </div>
  );
}

// ── Camera Event Row for Timeline ────────────────────────────────────────────

function CameraEventRow({ event, getImageUrl }: { event: CameraEvent; getImageUrl: (path: string) => string }) {
  const topDetection = event.detections && event.detections.length > 0
    ? event.detections.reduce((best, d) => d.confidence > best.confidence ? d : best, event.detections[0])
    : null;

  return (
    <div className="mb-1 flex items-start gap-2 rounded-lg border border-(--tm-border) bg-(--tm-panel) p-2 text-xs hover:bg-(--tm-panel-soft)">
      <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">CAM</span>
      {event.image_path ? (
        <img
          src={getImageUrl(event.image_path)}
          alt="Camera capture"
          className="h-10 w-10 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-(--tm-bg-subtle) text-(--tm-muted)">
          <span className="text-sm">cam</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium text-(--tm-text)">
          {topDetection ? `${topDetection.class_name} (${Math.round(topDetection.confidence * 100)}%)` : 'No detections'}
        </div>
        <div className="text-(--tm-muted)">
          {formatRelativeTime(event.captured_at)}
        </div>
      </div>
    </div>
  );
}
