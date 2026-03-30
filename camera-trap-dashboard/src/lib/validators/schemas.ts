import { z } from "zod";

/** Reusable UUID validation schema for path parameters */
export const uuidSchema = z.string().uuid();

const ORG_TYPES = [
  "ranger_team",
  "national_park",
  "research_group",
  "ngo",
  "private_landholder",
  "government",
  "other",
] as const;

const ORG_ROLES = ["owner", "admin", "member", "viewer"] as const;

export const createOrgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "URL slug must be lowercase letters, numbers, and hyphens"
    ),
  type: z.enum(ORG_TYPES),
  description: z.string().max(500).optional(),
  region: z.string().max(100).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  is_public: z.boolean(),
});

export const updateOrgSchema = createOrgSchema.partial();

export const createProjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "URL slug must be lowercase letters, numbers, and hyphens"
    ),
  description: z.string().max(1000).optional(),
  location_name: z.string().max(200).optional(),
  tags: z.array(z.string()),
});

export const updateProjectSchema = createProjectSchema.partial();

export const inviteMemberSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  role: z.enum(ORG_ROLES),
});

export const loginSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Must be a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    display_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
