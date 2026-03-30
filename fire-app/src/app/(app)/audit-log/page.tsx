"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText,
  Search,
  User,
  FileText,
  Flame,
  Shield,
  Download,
  DollarSign,
  Settings,
} from "lucide-react";
import { useAuditStore, type AuditAction } from "@/stores/audit-store";

/** Map action prefixes to icons and colours */
function getActionMeta(action: AuditAction) {
  if (action.startsWith("burn_plan"))
    return { icon: Flame, color: "text-orange-500", category: "Planning" };
  if (action.startsWith("daily_plan") || action.startsWith("checklist"))
    return { icon: FileText, color: "text-blue-500", category: "Operations" };
  if (action.startsWith("fire_scar"))
    return { icon: Flame, color: "text-red-500", category: "Monitoring" };
  if (action.startsWith("carbon") || action.startsWith("accu"))
    return { icon: DollarSign, color: "text-green-500", category: "Carbon" };
  if (action.startsWith("user"))
    return { icon: User, color: "text-purple-500", category: "Users" };
  if (action.startsWith("export"))
    return { icon: Download, color: "text-cyan-500", category: "Export" };
  if (action.startsWith("settings") || action.startsWith("project"))
    return { icon: Settings, color: "text-gray-500", category: "Settings" };
  return { icon: ScrollText, color: "text-gray-500", category: "System" };
}

export default function AuditLogPage() {
  const { entries } = useAuditStore();
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Get unique users and categories
  const uniqueUsers = Array.from(new Set(entries.map((e) => e.user_name)));
  const uniqueCategories = Array.from(
    new Set(entries.map((e) => getActionMeta(e.action).category))
  );

  const filtered = entries.filter((entry) => {
    if (
      search &&
      !entry.details.toLowerCase().includes(search.toLowerCase()) &&
      !entry.resource_name?.toLowerCase().includes(search.toLowerCase()) &&
      !entry.user_name.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (filterUser !== "all" && entry.user_name !== filterUser) return false;
    if (
      filterCategory !== "all" &&
      getActionMeta(entry.action).category !== filterCategory
    )
      return false;
    return true;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Full history of all actions taken within the project
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, resources, or users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={user} value={user}>
                  {user}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {uniqueCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {filtered.length} entries
          </Badge>
        </CardContent>
      </Card>

      {/* Log entries */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Time</TableHead>
                <TableHead className="w-36">User</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="w-40">Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const meta = getActionMeta(entry.action);
                const Icon = meta.icon;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{entry.user_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Icon className={`h-3 w-3 ${meta.color}`} />
                        {meta.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.action}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {entry.resource_name ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-80 truncate text-sm text-muted-foreground">
                      {entry.details}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
