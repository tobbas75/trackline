"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canEdit } from "@/lib/auth/roles";
import { friendlyError } from "@/lib/errors";
import type { OrgRole, Site } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Shape of the form state for creating/editing a site */
interface SiteFormData {
  site_name: string;
  latitude: string;
  longitude: string;
  date_deployed: string;
  date_end: string;
  comments: string;
}

const EMPTY_FORM: SiteFormData = {
  site_name: "",
  latitude: "",
  longitude: "",
  date_deployed: "",
  date_end: "",
  comments: "",
};

/** Convert a Site row into form field values */
function siteToForm(site: Site): SiteFormData {
  return {
    site_name: site.site_name,
    latitude: site.latitude !== null ? String(site.latitude) : "",
    longitude: site.longitude !== null ? String(site.longitude) : "",
    date_deployed: site.date_deployed ?? "",
    date_end: site.date_end ?? "",
    comments: site.comments ?? "",
  };
}

export default function SitesPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const [sites, setSites] = useState<Site[]>([]);
  const [userRole, setUserRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [form, setForm] = useState<SiteFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editable = canEdit(userRole);

  // ── Data loading ──────────────────────────────────────────────

  const loadSites = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sites")
      .select(
        "id, site_name, latitude, longitude, date_deployed, date_end, covariates, comments, project_id, created_at, updated_at"
      )
      .eq("project_id", projectId)
      .order("site_name", { ascending: true });

    if (error) {
      toast.error(friendlyError(error.code, error.message));
      return;
    }

    if (data) {
      setSites(data as unknown as Site[]);
    }
  }, [projectId]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: membership } = await supabase
          .from("org_members")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", user.id)
          .single();

        setUserRole(
          (membership as unknown as { role: OrgRole } | null)?.role ?? null
        );
      }

      await loadSites();
      setLoading(false);
    }

    init();
  }, [orgId, projectId, loadSites]);

  // ── Form helpers ──────────────────────────────────────────────

  function updateField(field: keyof SiteFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAddDialog() {
    setEditingSite(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(site: Site) {
    setEditingSite(site);
    setForm(siteToForm(site));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingSite(null);
    setForm(EMPTY_FORM);
  }

  // ── Validation ────────────────────────────────────────────────

  function validateForm(): string | null {
    if (!form.site_name.trim()) {
      return "Site name is required.";
    }

    if (form.latitude !== "") {
      const lat = Number(form.latitude);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        return "Latitude must be a number between -90 and 90.";
      }
    }

    if (form.longitude !== "") {
      const lng = Number(form.longitude);
      if (Number.isNaN(lng) || lng < -180 || lng > 180) {
        return "Longitude must be a number between -180 and 180.";
      }
    }

    if (form.date_deployed && form.date_end) {
      if (form.date_end < form.date_deployed) {
        return "End date cannot be before deployment date.";
      }
    }

    return null;
  }

  // ── CRUD operations ───────────────────────────────────────────

  async function handleSave() {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      site_name: form.site_name.trim(),
      latitude: form.latitude !== "" ? Number(form.latitude) : null,
      longitude: form.longitude !== "" ? Number(form.longitude) : null,
      date_deployed: form.date_deployed || null,
      date_end: form.date_end || null,
      comments: form.comments.trim() || null,
    };

    if (editingSite) {
      // Update existing site
      const { error } = await supabase
        .from("sites")
        .update(payload)
        .eq("id", editingSite.id);

      if (error) {
        toast.error(friendlyError(error.code, error.message));
      } else {
        toast.success(`Updated site "${payload.site_name}"`);
        closeDialog();
        await loadSites();
      }
    } else {
      // Create new site
      const { error } = await supabase
        .from("sites")
        .insert({ ...payload, project_id: projectId });

      if (error) {
        toast.error(friendlyError(error.code, error.message));
      } else {
        toast.success(`Added site "${payload.site_name}"`);
        closeDialog();
        await loadSites();
      }
    }

    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("sites")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      toast.success(`Deleted site "${deleteTarget.site_name}"`);
      setDeleteTarget(null);
      await loadSites();
    }

    setDeleting(false);
  }

  // ── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sites</h1>
          <p className="text-muted-foreground">
            {editable
              ? "Manage camera station locations for this project."
              : "View camera station locations for this project."}
          </p>
        </div>
        {editable && (
          <Button onClick={openAddDialog}>Add site</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {sites.length} site{sites.length !== 1 ? "s" : ""}
          </CardTitle>
          {sites.length === 0 && (
            <CardDescription>
              No sites have been added to this project yet.
            </CardDescription>
          )}
        </CardHeader>
        {sites.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Latitude</TableHead>
                  <TableHead>Longitude</TableHead>
                  <TableHead>Deployed</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Comments</TableHead>
                  {editable && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">
                      {site.site_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.latitude !== null ? site.latitude : "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.longitude !== null ? site.longitude : "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.date_deployed
                        ? new Date(site.date_deployed).toLocaleDateString()
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.date_end
                        ? new Date(site.date_end).toLocaleDateString()
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {site.comments ?? "\u2014"}
                    </TableCell>
                    {editable && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(site)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(site)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* ── Add / Edit dialog ────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSite ? "Edit site" : "Add site"}
            </DialogTitle>
            <DialogDescription>
              {editingSite
                ? "Update the details for this camera station."
                : "Add a new camera station to the project."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="site_name">Site name *</Label>
              <Input
                id="site_name"
                placeholder="e.g. Station Alpha"
                value={form.site_name}
                onChange={(e) => updateField("site_name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  min={-90}
                  max={90}
                  placeholder="-33.8688"
                  value={form.latitude}
                  onChange={(e) => updateField("latitude", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  min={-180}
                  max={180}
                  placeholder="151.2093"
                  value={form.longitude}
                  onChange={(e) => updateField("longitude", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date_deployed">Date deployed</Label>
                <Input
                  id="date_deployed"
                  type="date"
                  value={form.date_deployed}
                  onChange={(e) => updateField("date_deployed", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date_end">Date end</Label>
                <Input
                  id="date_end"
                  type="date"
                  value={form.date_end}
                  onChange={(e) => updateField("date_end", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comments">Comments</Label>
              <Input
                id="comments"
                placeholder="Optional notes about this site"
                value={form.comments}
                onChange={(e) => updateField("comments", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving..."
                : editingSite
                  ? "Update site"
                  : "Add site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ───────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete site</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.site_name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
