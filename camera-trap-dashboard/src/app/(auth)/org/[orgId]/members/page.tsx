"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canAdmin, getRoleLabel } from "@/lib/auth/roles";
import { friendlyError } from "@/lib/errors";
import type { OrgRole } from "@/lib/supabase/types";
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
import { toast } from "sonner";

interface Member {
  user_id: string;
  role: OrgRole;
  joined_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
}

export default function MembersPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("org_members")
      .select(`
        user_id, role, joined_at,
        profiles!user_id (display_name, email)
      `)
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true });

    if (data) {
      setMembers(data as unknown as Member[]);
    }
  }, [orgId]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      if (user) {
        const { data: membership } = await supabase
          .from("org_members")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", user.id)
          .single();
        setCurrentUserRole(
          (membership as unknown as { role: OrgRole } | null)?.role ?? null
        );
      }

      await loadMembers();
      setLoading(false);
    }

    loadData();
  }, [orgId, loadMembers]);

  async function handleInvite() {
    if (!inviteEmail) return;
    setIsInviting(true);

    const supabase = createClient();

    // Look up user by email in portal.profiles
    const { data: profile } = await supabase
      .schema("portal")
      .from("profiles")
      .select("id")
      .eq("email", inviteEmail)
      .single();

    if (!profile) {
      toast.error("No user found with that email. They need to create an account first.");
      setIsInviting(false);
      return;
    }

    // Check if already a member
    const existing = members.find((m) => m.user_id === profile.id);
    if (existing) {
      toast.error("This user is already a member of this organisation.");
      setIsInviting(false);
      return;
    }

    const { error } = await supabase.from("org_members").insert({
      org_id: orgId,
      user_id: profile.id,
      role: inviteRole,
      invited_by: currentUserId,
    });

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      toast.success(`Invited ${inviteEmail} as ${getRoleLabel(inviteRole)}`);
      setInviteEmail("");
      loadMembers();
    }

    setIsInviting(false);
  }

  async function handleRemove(userId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("org_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      toast.success("Member removed");
      loadMembers();
    }
  }

  async function handleRoleChange(userId: string, newRole: OrgRole) {
    const supabase = createClient();
    const { error } = await supabase
      .from("org_members")
      .update({ role: newRole })
      .eq("org_id", orgId)
      .eq("user_id", userId);

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      toast.success("Role updated");
      loadMembers();
    }
  }

  const roleBadgeVariant = (role: OrgRole) => {
    switch (role) {
      case "owner":
        return "default" as const;
      case "admin":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  const isAdmin = canAdmin(currentUserRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Manage who has access to this organisation's projects."
            : "View the members of this organisation."}
        </p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a member</CardTitle>
            <CardDescription>
              The person must already have a WildTrack account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="team@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="max-w-sm"
              />
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as OrgRole)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={isInviting || !inviteEmail}>
                {isInviting ? "Inviting..." : "Invite"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{members.length} member{members.length !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell>
                    {member.profiles?.display_name || "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.profiles?.email || "\u2014"}
                  </TableCell>
                  <TableCell>
                    {!isAdmin || member.user_id === currentUserId ? (
                      <Badge variant={roleBadgeVariant(member.role)}>
                        {getRoleLabel(member.role)}
                      </Badge>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          handleRoleChange(member.user_id, v as OrgRole)
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {member.user_id !== currentUserId &&
                        member.role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemove(member.user_id)}
                          >
                            Remove
                          </Button>
                        )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
