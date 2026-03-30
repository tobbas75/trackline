"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpDialog } from "@/components/help/help-dialog";

/**
 * A HelpCircle icon button that opens the main help dialog.
 * Used in the org header layout (which is a server component).
 */
export function HelpButton() {
  return (
    <HelpDialog>
      <Button variant="ghost" size="icon-sm" aria-label="Help">
        <HelpCircle className="size-4" />
      </Button>
    </HelpDialog>
  );
}
