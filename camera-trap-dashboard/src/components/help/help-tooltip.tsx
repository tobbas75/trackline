"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  /** The help text to display in the tooltip */
  text: string;
  /** Optional side for the tooltip. Defaults to "top" */
  side?: "top" | "right" | "bottom" | "left";
  /** Optional className for the icon wrapper */
  className?: string;
}

/**
 * Renders a small HelpCircle icon that shows a tooltip on hover.
 * Drop next to any label or title that needs explanation.
 */
export function HelpTooltip({ text, side = "top", className }: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
          aria-label="Help"
        >
          <HelpCircle className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-sm">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
