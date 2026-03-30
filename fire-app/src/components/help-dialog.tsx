"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, Search, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  GLOSSARY,
  CATEGORY_LABELS,
  PAGE_HELP,
  type GlossaryCategory,
} from "@/lib/help-content";

export function HelpDialog() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    GlossaryCategory | "all"
  >("all");

  const pageHelp = PAGE_HELP[pathname] ?? null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return GLOSSARY.filter((entry) => {
      if (activeCategory !== "all" && entry.category !== activeCategory)
        return false;
      if (!q) return true;
      return (
        entry.term.toLowerCase().includes(q) ||
        entry.short.toLowerCase().includes(q) ||
        (entry.long?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [search, activeCategory]);

  const categories = Object.keys(CATEGORY_LABELS) as GlossaryCategory[];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden md:inline">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Help & Glossary</DialogTitle>
        </DialogHeader>

        {/* Page-specific help */}
        {pageHelp && (
          <div className="mx-6 mb-4 rounded-lg border bg-muted/40 p-4">
            <h3 className="text-sm font-semibold">{pageHelp.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {pageHelp.description}
            </p>
            {pageHelp.tips && pageHelp.tips.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {pageHelp.tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Search */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search glossary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 overflow-x-auto px-6 pb-3">
          <Badge
            variant={activeCategory === "all" ? "default" : "outline"}
            className="cursor-pointer shrink-0"
            onClick={() => setActiveCategory("all")}
          >
            All
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className="cursor-pointer shrink-0"
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </Badge>
          ))}
        </div>

        {/* Glossary list */}
        <div className="flex-1 overflow-y-auto border-t px-6 py-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No matching terms found.
            </p>
          ) : (
            <dl className="space-y-3">
              {filtered.map((entry) => (
                <div key={entry.term}>
                  <dt className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{entry.term}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {CATEGORY_LABELS[entry.category]}
                    </Badge>
                  </dt>
                  <dd className="mt-0.5 text-xs text-muted-foreground">
                    {entry.long ?? entry.short}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
