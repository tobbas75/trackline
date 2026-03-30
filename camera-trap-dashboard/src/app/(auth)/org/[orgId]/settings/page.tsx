"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  createOrgSchema,
  type CreateOrgInput,
} from "@/lib/validators/schemas";
import type { Organisation, OrgRole } from "@/lib/supabase/types";
import { canAdmin, isOwner } from "@/lib/auth/roles";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const ORG_TYPE_OPTIONS = [
  { value: "ranger_team", label: "Ranger Team" },
  { value: "national_park", label: "National Park" },
  { value: "research_group", label: "Research Group" },
  { value: "ngo", label: "NGO / Conservation Organisation" },
  { value: "private_landholder", label: "Private Landholder" },
  { value: "government", label: "Government Agency" },
  { value: "other", label: "Other" },
] as const;

export default function OrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userRole, setUserRole] = useState<OrgRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [orgName, setOrgName] = useState("");

  const form = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      name: "",
      slug: "",
      type: "other",
      description: "",
      region: "",
      contact_email: "",
      is_public: false,
    },
  });

  useEffect(() => {
    async function loadOrg() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRoleLoading(false);
        return;
      }

      // Fetch role
      const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .single();

      const role = (membership as unknown as { role: OrgRole } | null)?.role ?? null;
      setUserRole(role);

      // Fetch org data
      const { data } = await supabase
        .from("organisations")
        .select("*")
        .eq("id", orgId)
        .single();

      if (data) {
        const org = data as unknown as Organisation;
        setOrgName(org.name);
        form.reset({
          name: org.name,
          slug: org.slug,
          type: org.type,
          description: org.description ?? "",
          region: org.region ?? "",
          contact_email: org.contact_email ?? "",
          is_public: org.is_public,
        });
      }

      setRoleLoading(false);
    }
    loadOrg();
  }, [orgId, form]);

  async function onSubmit(values: CreateOrgInput) {
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("organisations")
      .update({
        name: values.name,
        slug: values.slug,
        type: values.type,
        description: values.description || null,
        region: values.region || null,
        contact_email: values.contact_email || null,
        is_public: values.is_public,
      })
      .eq("id", orgId);

    if (error) {
      toast.error(friendlyError(error.code, error.message));
    } else {
      toast.success("Organisation settings updated");
      setOrgName(values.name);
      router.refresh();
    }

    setIsLoading(false);
  }

  async function handleDelete() {
    if (deleteConfirmName !== orgName) {
      toast.error("Organisation name doesn't match. Please type it exactly.");
      return;
    }

    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("soft_delete_organisation", {
      p_org_id: orgId,
    });

    if (error) {
      toast.error(friendlyError(error.code, error.message));
      setIsDeleting(false);
    } else {
      toast.success("Organisation deleted. Data will be purged after 30 days.");
      router.push("/dashboard");
      router.refresh();
    }
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!canAdmin(userRole)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <h2 className="mb-2 text-xl font-semibold">Access Denied</h2>
          <p className="text-center text-muted-foreground">
            You need admin or owner access to manage organisation settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organisation&apos;s profile and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Update your organisation&apos;s public profile information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL slug</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Used in public URLs when profile is public
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ORG_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Northern Territory, Kakadu"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Public profile</FormLabel>
                      <FormDescription>
                        Make this organisation visible in the public directory
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isOwner(userRole) && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete this organisation and all its projects and data.
              Data will be retained for 30 days before permanent deletion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Type <span className="font-bold">{orgName}</span> to confirm
              </label>
              <Input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={orgName}
                className="max-w-sm"
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmName !== orgName}
            >
              {isDeleting ? "Deleting..." : "Delete organisation"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
