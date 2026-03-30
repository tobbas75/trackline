"use client";

import { DeviceType } from "@/lib/types";

export interface ProductToggleProps {
  availableProducts: DeviceType[];
  activeProduct: DeviceType | "all";
  onProductChange: (product: DeviceType | "all") => void;
}

const LABELS: Record<DeviceType | "all", string> = {
  all: "All",
  trap_monitor: "Trap Monitor",
  camera_trap: "Camera Trap",
};

export function ProductToggle({
  availableProducts,
  activeProduct,
  onProductChange,
}: ProductToggleProps) {
  // Only show when org has both device types
  if (availableProducts.length <= 1) return null;

  const options: (DeviceType | "all")[] = ["all", ...availableProducts];

  return (
    <div
      className="flex rounded-lg border border-(--tm-border) bg-(--tm-panel) p-0.5"
      role="radiogroup"
      aria-label="Filter by product type"
    >
      {options.map((opt) => (
        <button
          key={opt}
          role="radio"
          aria-checked={activeProduct === opt}
          onClick={() => onProductChange(opt)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            activeProduct === opt
              ? "bg-(--tm-accent) text-white"
              : "text-(--tm-muted) hover:text-(--tm-text)"
          }`}
        >
          {LABELS[opt]}
        </button>
      ))}
    </div>
  );
}
