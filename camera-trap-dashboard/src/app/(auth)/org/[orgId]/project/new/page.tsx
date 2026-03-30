"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/validators/schemas";
import { slugify } from "@/lib/auth/slugify";
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

export default function NewProjectPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      location_name: "",
      tags: [],
    },
  });

  function handleNameChange(name: string) {
    form.setValue("name", name);
    const currentSlug = form.getValues("slug");
    const expectedSlug = slugify(form.getValues("name").slice(0, -1));
    if (!currentSlug || currentSlug === expectedSlug || currentSlug === slugify(name.slice(0, -1))) {
      form.setValue("slug", slugify(name));
    }
  }

  async function onSubmit(data: CreateProjectInput) {
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

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        org_id: orgId,
        created_by: user.id,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        location_name: data.location_name || null,
        tags: data.tags,
      })
      .select()
      .single();

    if (projectError) {
      if (projectError.code === "23505") {
        setError("A project with this URL slug already exists in this organisation.");
      } else {
        setError(projectError.message);
      }
      setIsLoading(false);
      return;
    }

    router.push(`/org/${orgId}/project/${project.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create a project</CardTitle>
          <CardDescription>
            A project represents a study, survey, or monitoring program. You can
            upload camera trap data, deployments, and detection histories to it.
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
                    <FormLabel>Project name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Andranangoo Baseline Survey 2024"
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
                      <Input
                        placeholder="andranangoo-baseline-2024"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Used in public URLs when published
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Melville Island, Northern Territory"
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
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this project..."
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
                  <Link href={`/org/${orgId}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create project"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
