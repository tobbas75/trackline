"use client";

import { useState, useEffect } from "react";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineIndicator() {
  const [mounted, setMounted] = useState(false);
  const { isOnline, isUpdateAvailable, update } = useServiceWorker();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Never render on server — avoids hydration mismatch
  if (!mounted) return null;

  // Don't show anything when online and no updates
  if (isOnline && !isUpdateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {!isOnline && (
        <Badge
          variant="destructive"
          className="flex items-center gap-1.5 px-3 py-1.5 shadow-lg"
        >
          <WifiOff className="h-3.5 w-3.5" />
          Offline
        </Badge>
      )}
      {isUpdateAvailable && (
        <Button
          size="sm"
          variant="secondary"
          className="shadow-lg"
          onClick={update}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Update Available
        </Button>
      )}
    </div>
  );
}
