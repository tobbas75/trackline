"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, Settings } from "lucide-react";
import { useBaselineStore } from "@/stores/baseline-store";

export function BaselineForm() {
  const {
    baselineEmissions,
    projectAreaHa,
    permanenceDiscount,
    edsEndMonth,
    isConfigured,
    setBaselineEmissions,
    setProjectAreaHa,
    setPermanenceDiscount,
    setEdsEndMonth,
    persistToIndexedDB,
  } = useBaselineStore();

  const handleSave = useCallback(() => {
    persistToIndexedDB();
  }, [persistToIndexedDB]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          CER Baseline Configuration
          {isConfigured ? (
            <Badge variant="secondary" className="ml-auto text-xs">Configured</Badge>
          ) : (
            <Badge variant="outline" className="ml-auto text-xs">Defaults</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="baseline-emissions">
              Baseline Emissions (tCO2-e/yr)
            </Label>
            <Input
              id="baseline-emissions"
              type="number"
              min={0}
              step={100}
              value={baselineEmissions}
              onChange={(e) => setBaselineEmissions(parseFloat(e.target.value) || 0)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              From CER project registration
            </p>
          </div>

          <div>
            <Label htmlFor="project-area">
              Project Area (ha)
            </Label>
            <Input
              id="project-area"
              type="number"
              min={0}
              step={1000}
              value={projectAreaHa}
              onChange={(e) => setProjectAreaHa(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="permanence-discount">
              Permanence Discount (%)
            </Label>
            <Input
              id="permanence-discount"
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(permanenceDiscount * 100)}
              onChange={(e) => setPermanenceDiscount((parseFloat(e.target.value) || 0) / 100)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              25% for 25-year obligation
            </p>
          </div>

          <div>
            <Label htmlFor="eds-end-month">
              EDS Cutoff Month
            </Label>
            <Input
              id="eds-end-month"
              type="number"
              min={1}
              max={12}
              value={edsEndMonth}
              onChange={(e) => setEdsEndMonth(parseInt(e.target.value) || 7)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Last month of Early Dry Season (default 7 = July)
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={handleSave}>
            <Save className="mr-2 h-3.5 w-3.5" />
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
