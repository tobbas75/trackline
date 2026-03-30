"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useProjectStore } from "@/stores/project-store";
import { Save, Plus, Trash2, Shield, MapPin, Users, Database, Building2 } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import { useOrgStore } from "@/stores/org-store";
import type { UserRole } from "@/lib/supabase/types";

const MOCK_MEMBERS = [
  { id: "1", name: "Toby Barton", email: "toby@example.com", role: "admin" as UserRole },
  { id: "2", name: "Jane Smith", email: "jane@example.com", role: "manager" as UserRole },
  { id: "3", name: "David Williams", email: "david@example.com", role: "ranger" as UserRole },
  { id: "4", name: "Mary Johnson", email: "mary@example.com", role: "ranger" as UserRole },
  { id: "5", name: "Tom Brown", email: "tom@example.com", role: "viewer" as UserRole },
];

export default function SettingsPage() {
  const { activeProject } = useProjectStore();
  const { organizations, activeOrg } = useOrgStore();
  const [projectName, setProjectName] = useState(activeProject?.name ?? "");
  const [projectDescription, setProjectDescription] = useState(
    activeProject?.description ?? ""
  );
  const [rainfallZone, setRainfallZone] = useState(
    activeProject?.rainfall_zone ?? "high"
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Organization, project configuration, team management, and data sources
        </p>
      </div>

      <Tabs defaultValue="org" className="space-y-6">
        <TabsList>
          <TabsTrigger value="org">Organization</TabsTrigger>
          <TabsTrigger value="project">Project</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="data">Data Sources</TabsTrigger>
          <TabsTrigger value="carbon">Carbon Config</TabsTrigger>
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="org" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Manage your organization and its fire management projects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input defaultValue={activeOrg?.name ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input defaultValue={activeOrg?.slug ?? ""} disabled />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save Organization
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Projects</CardTitle>
                  <CardDescription>
                    Fire management projects belonging to this organization.
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Area (ha)</TableHead>
                    <TableHead>Rainfall</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "Tiwi Islands", state: "NT", area: 786000, rainfall: "High", status: "active" },
                    { name: "Kimberley North", state: "WA", area: 420000, rainfall: "High", status: "setup" },
                    { name: "Cape York Peninsula", state: "QLD", area: 310000, rainfall: "High", status: "planned" },
                  ].map((proj) => (
                    <TableRow key={proj.name}>
                      <TableCell className="font-medium">{proj.name}</TableCell>
                      <TableCell>{proj.state}</TableCell>
                      <TableCell className="text-right">{proj.area.toLocaleString()}</TableCell>
                      <TableCell>{proj.rainfall}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={proj.status === "active" ? "default" : "outline"}>
                          {proj.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Organizations</CardTitle>
              <CardDescription>
                Organizations you have access to across FireManager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.slug}</p>
                      </div>
                    </div>
                    {org.id === activeOrg?.id && (
                      <Badge className="bg-green-600">Active</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Settings */}
        <TabsContent value="project" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Project Details
              </CardTitle>
              <CardDescription>
                Configure the core settings for this fire management project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State / Territory</Label>
                  <Select defaultValue={activeProject?.state ?? "NT"}>
                    <SelectTrigger id="state">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NT">Northern Territory</SelectItem>
                      <SelectItem value="QLD">Queensland</SelectItem>
                      <SelectItem value="WA">Western Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="rainfall" className="inline-flex items-center gap-1">
                    Rainfall Zone
                    <InfoTooltip text="Determines baseline fire history period and fuel accumulation rates. High >1000mm/yr, Low 600–1000mm/yr." />
                  </Label>
                  <Select
                    value={rainfallZone}
                    onValueChange={(v) =>
                      setRainfallZone(v as "high" | "low")
                    }
                  >
                    <SelectTrigger id="rainfall">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        High (&gt;1000mm)
                      </SelectItem>
                      <SelectItem value="low">
                        Low (600–1000mm)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Area</Label>
                  <Input
                    value={
                      activeProject?.area_ha
                        ? `${activeProject.area_ha.toLocaleString()} ha`
                        : "—"
                    }
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Input
                    value={activeProject?.status ?? "active"}
                    disabled
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fire Season Defaults</CardTitle>
              <CardDescription>
                Set the default EDS/LDS cutoff months for new fire seasons.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>EDS Start Month</Label>
                  <Select defaultValue="4">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2000, i).toLocaleString("en-AU", {
                            month: "long",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>EDS End Month (LDS starts after)</Label>
                  <Select defaultValue="7">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2000, i).toLocaleString("en-AU", {
                            month: "long",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Management */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Team Members
                  </CardTitle>
                  <CardDescription>
                    Manage who has access to this project and their permissions.
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_MEMBERS.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={member.role} />
                      </TableCell>
                      <TableCell>
                        {member.role !== "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Role Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="mb-1 font-medium">Admin</div>
                  <p className="text-muted-foreground">
                    Full access — manage team, settings, data, and operations
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="mb-1 font-medium">Manager</div>
                  <p className="text-muted-foreground">
                    Create burn plans, assign crews, approve operations
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="mb-1 font-medium">Ranger</div>
                  <p className="text-muted-foreground">
                    Field operations — checklists, GPS tracking, burn recording
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="mb-1 font-medium">Viewer</div>
                  <p className="text-muted-foreground">
                    Read-only — view maps, metrics, and reports
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Sources */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                External Data Sources
              </CardTitle>
              <CardDescription>
                Configure satellite, weather, and fire scar data integrations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataSourceRow
                name="DEA Hotspots"
                description="Digital Earth Australia satellite fire detections (VIIRS/MODIS)"
                status="connected"
                refreshInterval="10 min"
              />
              <Separator />
              <DataSourceRow
                name="NAFI Fire Scars"
                description="North Australia Fire Information — MODIS 250m fire scars since 2000"
                status="connected"
                refreshInterval="Daily"
              />
              <Separator />
              <DataSourceRow
                name="BOM Weather"
                description="Bureau of Meteorology ACCESS-G model via Open-Meteo"
                status="connected"
                refreshInterval="1 hour"
              />
              <Separator />
              <DataSourceRow
                name="Landgate FireWatch"
                description="WA government fire detection service (WA projects only)"
                status="not_configured"
                refreshInterval="—"
              />
              <Separator />
              <DataSourceRow
                name="Sentinel-2 Imagery"
                description="10m multispectral satellite imagery for burn severity analysis"
                status="not_configured"
                refreshInterval="—"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Carbon Config */}
        <TabsContent value="carbon" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Carbon Project Configuration
              </CardTitle>
              <CardDescription>
                Link this fire project to an ACCU Scheme carbon project for
                emissions abatement tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="inline-flex items-center gap-1">
                    CER Project Number
                    <InfoTooltip text="Your project registration number with the Clean Energy Regulator." />
                  </Label>
                  <Input placeholder="e.g. ERF1234567" />
                </div>
                <div className="space-y-2">
                  <Label>Methodology</Label>
                  <Select defaultValue="avoidance">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avoidance">
                        Emissions Avoidance (2018)
                      </SelectItem>
                      <SelectItem value="sequestration">
                        Sequestration + Avoidance (2018)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Crediting Period Start</Label>
                  <Input type="number" placeholder="2015" />
                </div>
                <div className="space-y-2">
                  <Label>Crediting Period (years)</Label>
                  <Select defaultValue="25">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 years</SelectItem>
                      <SelectItem value="25">25 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="inline-flex items-center gap-1">
                    Permanence Discount
                    <InfoTooltip text="5% discount for 100-year permanence obligation, 25% for 25-year. Most savanna projects use 25%." />
                  </Label>
                  <Select defaultValue="25">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5% (100-year period)</SelectItem>
                      <SelectItem value="25">
                        25% (25-year period)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="inline-flex items-center gap-1">
                    Baseline Years (pre-project fire history)
                    <InfoTooltip text="Number of years of pre-project fire history used to calculate the emissions baseline. 10 for high rainfall, 15 for low." />
                  </Label>
                  <Input
                    type="number"
                    placeholder="10 (high rainfall) or 15 (low rainfall)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reporting Frequency</Label>
                  <Select defaultValue="2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Every 2 years (avoidance)</SelectItem>
                      <SelectItem value="5">
                        Every 5 years (sequestration)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save Carbon Config
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const variants: Record<UserRole, "default" | "secondary" | "outline" | "destructive"> = {
    admin: "destructive",
    manager: "default",
    ranger: "secondary",
    viewer: "outline",
  };
  return <Badge variant={variants[role]}>{role}</Badge>;
}

function DataSourceRow({
  name,
  description,
  status,
  refreshInterval,
}: {
  name: string;
  description: string;
  status: "connected" | "not_configured" | "error";
  refreshInterval: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{name}</span>
          <Badge
            variant={status === "connected" ? "default" : "outline"}
            className="text-xs"
          >
            {status === "connected" ? "Connected" : "Not configured"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <p>Refresh: {refreshInterval}</p>
      </div>
    </div>
  );
}
