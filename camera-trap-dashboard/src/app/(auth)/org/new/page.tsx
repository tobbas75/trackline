"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  createOrgSchema,
  type CreateOrgInput,
} from "@/lib/validators/schemas";
import { slugify } from "@/lib/auth/slugify";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const ORG_TYPE_OPTIONS = [
  { value: "ranger_team", label: "Ranger Team" },
  { value: "national_park", label: "National Park" },
  { value: "research_group", label: "Research Group" },
  { value: "ngo", label: "NGO / Conservation Organisation" },
  { value: "private_landholder", label: "Private Landholder" },
  { value: "government", label: "Government Agency" },
  { value: "other", label: "Other" },
] as const;

export default function NewOrgPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // Auto-generate slug from name
  function handleNameChange(name: string) {
    form.setValue("name", name);
    const currentSlug = form.getValues("slug");
    const expectedSlug = slugify(form.getValues("name").slice(0, -1));
    // Only auto-slug if user hasn't manually edited it
    if (!currentSlug || currentSlug === expectedSlug || currentSlug === slugify(name.slice(0, -1))) {
      form.setValue("slug", slugify(name));
    }
  }

  async function onSubmit(data: CreateOrgInput) {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setIsLoading(false);
      return;
    }

    // Create the organisation atomically (creates org + adds creator as owner)
    const { data: org, error: orgError } = await supabase.rpc(
      "create_organisation",
      {
        p_name: data.name,
        p_slug: data.slug,
        p_type: data.type,
        p_description: data.description || null,
        p_region: data.region || null,
        p_contact_email: data.contact_email || null,
        p_is_public: data.is_public,
      }
    );

    if (orgError) {
      if (orgError.message?.includes("duplicate key") || orgError.code === "23505") {
        setError("An organisation with this URL slug already exists. Choose a different one.");
      } else {
        setError(friendlyError(orgError.code, orgError.message));
      }
      setIsLoading(false);
      return;
    }

    const orgData = org as { id: string };
    router.push(`/org/${orgData.id}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/dashboard" className="text-xl font-bold">
            WildTrack
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create an organisation</CardTitle>
            <CardDescription>
              Set up a workspace for your team, agency, or personal projects.
              You can invite members and create projects after.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Tiwi Islands Rangers"
                          {...field}
                          onChange={(e) => handleNameChange(e.target.value)}
                        />
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
                        <Input placeholder="tiwi-islands-rangers" {...field} />
                      </FormControl>
                      <FormDescription>
                        Used in public URLs: wildtrack.app/org/{field.value || "..."}
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
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
                      <FormDescription>
                        Where does your team operate?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of your organisation..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create organisation"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
