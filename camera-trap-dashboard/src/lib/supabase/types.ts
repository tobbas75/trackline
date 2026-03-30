// ============================================================
// Enum types matching the database
// ============================================================

export type OrgType =
  | "ranger_team"
  | "national_park"
  | "research_group"
  | "ngo"
  | "private_landholder"
  | "government"
  | "other";

export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type ProjectRole = "owner" | "editor" | "viewer";

// ============================================================
// Row types — what Supabase returns from SELECT queries
// ============================================================

/** Sourced from portal.profiles — the single profile table for all Trackline apps */
export interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  organisation: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  region: string | null;
  is_public: boolean;
  settings: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  joined_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  created_by: string | null;
  name: string;
  slug: string;
  description: string | null;
  location_name: string | null;
  bbox_north: number | null;
  bbox_south: number | null;
  bbox_east: number | null;
  bbox_west: number | null;
  is_published: boolean;
  tags: string[];
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
}

export interface Site {
  id: string;
  project_id: string;
  site_name: string;
  latitude: number | null;
  longitude: number | null;
  date_deployed: string | null;
  date_end: string | null;
  covariates: Record<string, unknown>;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface Species {
  id: string;
  project_id: string;
  common_name: string;
  scientific_name: string | null;
  local_name: string | null;
  species_group: string | null;
  individual_id_label: string | null;
  ala_guid: string | null;
  conservation_status: Record<string, string> | null;
  ala_image_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Observation {
  id: string;
  project_id: string;
  site_id: string | null;
  species_id: string | null;
  observed_at: string | null;
  is_animal: boolean | null;
  is_empty: boolean | null;
  count: number | null;
  individual_id: string | null;
  temperature: number | null;
  moon_phase: string | null;
  file_path: string | null;
  file_name: string | null;
  sequence_id: string | null;
  detection_confidence: number | null;
  classification_confidence: number | null;
  bbox: Record<string, unknown> | null;
  classified_by: string | null;
  extras: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DetectionHistory {
  id: string;
  project_id: string;
  species_id: string | null;
  species_name: string;
  occasion_start: string;
  occasion_end: string;
  occasion_length_days: number;
  num_occasions: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DetectionHistoryRow {
  id: string;
  detection_history_id: string;
  site_id: string | null;
  site_name: string;
  detections: number[];
  created_at: string;
}

export type UploadType = "observations" | "deployments" | "detection_history" | "generic";
export type UploadStatus = "pending" | "mapping" | "processing" | "completed" | "failed";

export interface CsvUpload {
  id: string;
  project_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_size_bytes: number | null;
  upload_type: UploadType;
  status: UploadStatus;
  source_columns: string[] | null;
  column_mapping: Record<string, unknown> | null;
  extra_columns_mapping: Record<string, unknown> | null;
  parse_config: Record<string, unknown> | null;
  row_count: number | null;
  rows_imported: number;
  rows_skipped: number;
  error_log: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ColumnMappingTemplate {
  id: string;
  project_id: string;
  name: string;
  upload_type: UploadType;
  column_mapping: Record<string, unknown>;
  extra_columns_mapping: Record<string, unknown> | null;
  parse_config: Record<string, unknown> | null;
  created_at: string;
}

// Placeholder — will be replaced by Supabase CLI generated types
// once a Supabase instance is connected. At that point, re-add the
// Database generic to client.ts and server.ts for full type safety.
