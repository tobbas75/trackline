"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /** Short text shown in the tooltip. */
  text: string;
  /** Optional side placement. */
  side?: "top" | "right" | "bottom" | "left";
  /** Icon size class — defaults to "h-3.5 w-3.5". */
  size?: string;
  /** Extra classes on the trigger wrapper. */
  className?: string;
}

/** Small info icon that shows a tooltip on hover. */
export function InfoTooltip({
  text,
  side = "top",
  size = "h-3.5 w-3.5",
  className,
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
          aria-label="More info"
        >
          <Info className={size} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-64 text-pretty">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
