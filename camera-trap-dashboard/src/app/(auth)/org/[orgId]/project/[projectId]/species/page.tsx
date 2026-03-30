"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/org-store";
import { friendlyError } from "@/lib/errors";
import type { Species } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

const SPECIES_GROUPS = [
  "Mammal",
  "Bird",
  "Reptile",
  "Amphibian",
  "Insect",
  "Other",
] as const;

type SpeciesGroup = (typeof SPECIES_GROUPS)[number];

/** Shape returned by /api/ala/species/search */
interface ALASuggestion {
  guid: string;
  commonName: string | null;
  scientificName: string;
  rank: string;
  kingdom: string | null;
}

/** Shape returned by /api/ala/species/[guid] */
interface ALAProfile {
  guid: string;
  conservationStatus: Record<string, string> | null;
  imageUrl: string | null;
}

/** Mapping from IUCN / EPBC status codes to Tailwind colour classes */
const STATUS_COLOURS: Record<string, string> = {
  CR: "bg-red-900 text-white",
  "Critically Endangered": "bg-red-900 text-white",
  EN: "bg-red-600 text-white",
  Endangered: "bg-red-600 text-white",
  VU: "bg-amber-500 text-white",
  Vulnerable: "bg-amber-500 text-white",
  NT: "bg-yellow-400 text-black",
  "Near Threatened": "bg-yellow-400 text-black",
  LC: "bg-green-600 text-white",
  "Least Concern": "bg-green-600 text-white",
};

function statusBadgeClass(status: string): string {
  // Try exact match first, then check if any key is contained in the status
  if (STATUS_COLOURS[status]) return STATUS_COLOURS[status];
  for (const [key, cls] of Object.entries(STATUS_COLOURS)) {
    if (status.includes(key)) return cls;
  }
  return "bg-muted text-muted-foreground";
}

// ---------------------------------------------------------------------------
// Form state for the add/edit dialog
// ---------------------------------------------------------------------------

interface SpeciesForm {
  common_name: string;
  scientific_name: string;
  local_name: string;
  species_group: SpeciesGroup | "";
  ala_guid: string;
  conservation_status: Record<string, string> | null;
  ala_image_url: string | null;
}

const EMPTY_FORM: SpeciesForm = {
  common_name: "",
  scientific_name: "",
  local_name: "",
  species_group: "",
  ala_guid: "",
  conservation_status: null,
  ala_image_url: null,
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SpeciesPage() {
  const params = useParams();
  const _orgId = params.orgId as string;
  const projectId = params.projectId as string;

  // orgId is available via _orgId for future route-level needs
  void _orgId;

  const userCanEdit = useOrgStore((s) => s.canEdit());
  const userCanAdmin = useOrgStore((s) => s.canAdmin());

  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SpeciesForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ALA autocomplete state
  const [alaQuery, setAlaQuery] = useState("");
  const [alaSuggestions, setAlaSuggestions] = useState<ALASuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadSpecies = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("species")
      .select("*")
      .eq("project_id", projectId)
      .order("common_name", { ascending: true });

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      setSpecies((data as unknown as Species[]) ?? []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadSpecies();
  }, [loadSpecies]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -----------------------------------------------------------------------
  // ALA autocomplete
  // -----------------------------------------------------------------------

  function handleCommonNameChange(value: string) {
    setAlaQuery(value);
    setForm((prev) => ({ ...prev, common_name: value }));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setAlaSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/ala/species/search?q=${encodeURIComponent(value)}`
        );
        if (res.ok) {
          const data: ALASuggestion[] = await res.json();
          setAlaSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch {
        // Silently handle — the user can still type manually
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
  }

  async function handleSelectSuggestion(suggestion: ALASuggestion) {
    setShowSuggestions(false);
    setAlaQuery(suggestion.commonName ?? suggestion.scientificName);
    setForm((prev) => ({
      ...prev,
      common_name: suggestion.commonName ?? suggestion.scientificName,
      scientific_name: suggestion.scientificName,
      ala_guid: suggestion.guid,
    }));

    // Fetch conservation status and image from the ALA profile endpoint
    setLoadingProfile(true);
    try {
      const res = await fetch(
        `/api/ala/species/${encodeURIComponent(suggestion.guid)}`
      );
      if (res.ok) {
        const profile: ALAProfile = await res.json();
        setForm((prev) => ({
          ...prev,
          conservation_status: profile.conservationStatus,
          ala_image_url: profile.imageUrl,
        }));
      }
    } catch {
      // Non-critical — user can still save without conservation data
    } finally {
      setLoadingProfile(false);
    }
  }

  // -----------------------------------------------------------------------
  // CRUD handlers
  // -----------------------------------------------------------------------

  function openAddDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAlaQuery("");
    setAlaSuggestions([]);
    setShowSuggestions(false);
    setDialogOpen(true);
  }

  function openEditDialog(s: Species) {
    setEditingId(s.id);
    setForm({
      common_name: s.common_name,
      scientific_name: s.scientific_name ?? "",
      local_name: s.local_name ?? "",
      species_group: (s.species_group as SpeciesGroup) ?? "",
      ala_guid: s.ala_guid ?? "",
      conservation_status: s.conservation_status,
      ala_image_url: s.ala_image_url,
    });
    setAlaQuery(s.common_name);
    setAlaSuggestions([]);
    setShowSuggestions(false);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.common_name.trim()) {
      toast.error("Common name is required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      project_id: projectId,
      common_name: form.common_name.trim(),
      scientific_name: form.scientific_name.trim() || null,
      local_name: form.local_name.trim() || null,
      species_group: form.species_group || null,
      ala_guid: form.ala_guid || null,
      conservation_status: form.conservation_status,
      ala_image_url: form.ala_image_url,
    };

    if (editingId) {
      const { error } = await supabase
        .from("species")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error(friendlyError(error.code, error.message));
      } else {
        toast.success(`Updated ${payload.common_name}`);
        setDialogOpen(false);
        loadSpecies();
      }
    } else {
      const { error } = await supabase.from("species").insert(payload);

      if (error) {
        toast.error(friendlyError(error.code, error.message));
      } else {
        toast.success(`Added ${payload.common_name}`);
        setDialogOpen(false);
        loadSpecies();
      }
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const supabase = createClient();
    const { error } = await supabase.from("species").delete().eq("id", id);

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      toast.success("Species removed");
      loadSpecies();
    }
    setDeleting(null);
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderConservationBadges(
    status: Record<string, string> | null
  ) {
    if (!status) return null;
    return Object.entries(status).map(([jurisdiction, value]) => (
      <Badge
        key={jurisdiction}
        className={statusBadgeClass(value)}
      >
        {jurisdiction}: {value}
      </Badge>
    ));
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading species...</p>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Species</h1>
          <p className="text-muted-foreground">
            Manage the species registry for this project.
          </p>
        </div>
        {userCanEdit && (
          <Button onClick={openAddDialog}>Add species</Button>
        )}
      </div>

      {/* Empty state */}
      {species.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h2 className="mb-2 text-xl font-semibold">No species yet</h2>
            <p className="mb-4 text-center text-muted-foreground">
              {userCanEdit
                ? "Add your first species to get started. Start typing a common name to search the Atlas of Living Australia."
                : "No species have been registered for this project yet."}
            </p>
            {userCanEdit && (
              <Button onClick={openAddDialog}>Add species</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Species card grid */}
      {species.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {species.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              {/* ALA thumbnail */}
              {s.ala_image_url && (
                <div className="relative h-40 w-full bg-muted">
                  <Image
                    src={s.ala_image_url}
                    alt={s.common_name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                  />
                </div>
              )}

              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {s.ala_guid ? (
                    <a
                      href={`https://bie.ala.org.au/species/${encodeURIComponent(s.ala_guid)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {s.common_name}
                    </a>
                  ) : (
                    s.common_name
                  )}
                </CardTitle>
                {s.scientific_name && (
                  <CardDescription className="italic">
                    {s.scientific_name}
                  </CardDescription>
                )}
                {s.local_name && (
                  <CardDescription className="text-xs">
                    Local: {s.local_name}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Species group */}
                {s.species_group && (
                  <Badge variant="secondary">{s.species_group}</Badge>
                )}

                {/* Conservation status badges */}
                {s.conservation_status && (
                  <div className="flex flex-wrap gap-1">
                    {renderConservationBadges(s.conservation_status)}
                  </div>
                )}

                {/* Edit / Delete actions */}
                {userCanEdit && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(s)}
                    >
                      Edit
                    </Button>
                    {userCanAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={deleting === s.id}
                        onClick={() => handleDelete(s.id)}
                      >
                        {deleting === s.id ? "Removing..." : "Delete"}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit species" : "Add species"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the details for this species."
                : "Search the Atlas of Living Australia by common name, or enter details manually."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Common name with ALA autocomplete */}
            <div className="space-y-2">
              <label
                htmlFor="common-name"
                className="text-sm font-medium leading-none"
              >
                Common name
              </label>
              <div className="relative" ref={suggestionsRef}>
                <Input
                  id="common-name"
                  placeholder="e.g. Koala"
                  value={alaQuery}
                  onChange={(e) => handleCommonNameChange(e.target.value)}
                  onFocus={() => {
                    if (alaSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  autoComplete="off"
                />
                {loadingSuggestions && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Searching...
                  </span>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && alaSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                    <ul className="max-h-60 overflow-y-auto py-1">
                      {alaSuggestions.map((suggestion) => (
                        <li key={suggestion.guid}>
                          <button
                            type="button"
                            className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => handleSelectSuggestion(suggestion)}
                          >
                            <span className="font-medium">
                              {suggestion.commonName ?? suggestion.scientificName}
                            </span>
                            <span className="text-xs text-muted-foreground italic">
                              {suggestion.scientificName}
                              {suggestion.rank ? ` (${suggestion.rank})` : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Scientific name (auto-filled or manual) */}
            <div className="space-y-2">
              <label
                htmlFor="scientific-name"
                className="text-sm font-medium leading-none"
              >
                Scientific name
              </label>
              <Input
                id="scientific-name"
                placeholder="Auto-filled from ALA, or enter manually"
                value={form.scientific_name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    scientific_name: e.target.value,
                  }))
                }
              />
            </div>

            {/* Local / vernacular name */}
            <div className="space-y-2">
              <label
                htmlFor="local-name"
                className="text-sm font-medium leading-none"
              >
                Local name
              </label>
              <Input
                id="local-name"
                placeholder="Indigenous or vernacular name"
                value={form.local_name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    local_name: e.target.value,
                  }))
                }
              />
            </div>

            {/* Species group */}
            <div className="space-y-2">
              <label
                htmlFor="species-group"
                className="text-sm font-medium leading-none"
              >
                Species group
              </label>
              <Select
                value={form.species_group}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    species_group: v as SpeciesGroup,
                  }))
                }
              >
                <SelectTrigger id="species-group" className="w-full">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIES_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ALA profile loading indicator */}
            {loadingProfile && (
              <p className="text-sm text-muted-foreground">
                Fetching conservation status and image from ALA...
              </p>
            )}

            {/* Conservation status preview */}
            {form.conservation_status &&
              Object.keys(form.conservation_status).length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">
                    Conservation status
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {renderConservationBadges(form.conservation_status)}
                  </div>
                </div>
              )}

            {/* Image preview */}
            {form.ala_image_url && (
              <div className="space-y-1">
                <span className="text-sm font-medium">ALA image</span>
                <div className="relative h-32 w-full overflow-hidden rounded-md bg-muted">
                  <Image
                    src={form.ala_image_url}
                    alt={form.common_name || "Species image"}
                    fill
                    className="object-cover"
                    sizes="400px"
                    unoptimized
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loadingProfile}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Add species"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
